'use strict';
// Editable website content. Pages carry invisible markers (HTML comments) around every piece of text or photo slot
// that the pharmacist may change. At request time the markers are replaced with the saved edits. Edits are always
// plain text (escaped), so nothing entered here can change the layout or inject code. No patient data is stored.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const store = require('./store');

const PAGES = [['Home', 'index.html'], ['Services', 'services.html'], ['Prescriptions', 'prescriptions.html'], ['Vaccinations', 'vaccinations.html'],
  ['Minor ailments', 'minor-ailments.html'], ['Compounding', 'compounding.html'], ['Free delivery', 'free-delivery.html'], ['About', 'about.html']];
const ED = /<!--ed:([\w.\-]+)\|(text|area)\|([^|]*)\|([^|]*)\|([^>]*?)-->([\s\S]*?)<!--\/ed-->/g;
const IMG = /<!--img:([\w.\-]+)\|([^|]*)\|([^|]*)\|([^|]*)\|(\w+)\|([^>]*?)-->([\s\S]*?)<!--\/img-->/g;
const LIST = /<!--list:(rv-feat|rv-cards)-->([\s\S]*?)<!--\/list-->/g;
const GLOBALS = [
  { key: 'site.phone', label: 'Phone number', def: '(613) 253-3334', hint: 'Shown in the header, footer, contact section and buttons. Phone links update too.' },
  { key: 'site.fax', label: 'Fax number shown on the website', def: '(613) 691-7667', hint: 'Only changes what visitors see. The fax that receives requests is set on the server.' },
  { key: 'site.email', label: 'Email address', def: 'Seaway.carletonplace@gmail.com', hint: 'Shown in the contact section. Email links update too.' },
];
const UP = path.join(store.DIR, 'uploads');
try { fs.mkdirSync(UP, { recursive: true, mode: 0o700 }); } catch (e) { /* uploads then unavailable */ }

let C = store.readJson('content.json', {});
if (!C || typeof C !== 'object') C = {};
C.values = C.values && typeof C.values === 'object' ? C.values : {};
C.images = C.images && typeof C.images === 'object' ? C.images : {};
C.site = C.site && typeof C.site === 'object' ? C.site : {};
if (!Array.isArray(C.reviews)) C.reviews = null;
const save = () => store.writeJson('content.json', C);

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', nbsp: ' ', middot: '·', rarr: '→', mdash: '—', ndash: '–', hellip: '…' };
const decode = (s) => String(s).replace(/<br\s*\/?>/g, '\n').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] != null ? ENT[e.toLowerCase()] : m;
});
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escArea = (s) => esc(s).replace(/\r?\n/g, '<br>');

// ---- scanning the pages for editable fields (cached) ----
let scanCache = { sig: '', data: null };
function readPage(file) { return fs.readFileSync(path.join(__dirname, file), 'utf8'); }
function scan() {
  const sig = PAGES.map(([, f]) => { try { const s = fs.statSync(path.join(__dirname, f)); return s.mtimeMs + ':' + s.size; } catch (e) { return '0'; } }).join('|');
  if (scanCache.sig === sig && scanCache.data) return scanCache.data;
  const fields = [], images = [], star = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.5 5.4 5.9.7-4.4 4 1.2 5.8L10 14.6 4.8 17.5 6 11.7 1.6 7.7l5.9-.7z"/></svg>';
  let reviews = [];
  for (const [page, file] of PAGES) {
    let html = ''; try { html = readPage(file); } catch (e) { continue; }
    let m; ED.lastIndex = 0; IMG.lastIndex = 0;
    while ((m = ED.exec(html))) fields.push({ key: m[1], type: m[2], page: m[3], section: m[4], label: m[5], def: decode(m[6]) });
    while ((m = IMG.exec(html))) images.push({ key: m[1], page: m[2], section: m[3], label: m[4], tag: m[5], cls: m[6] });
    if (file === 'index.html') {
      const feat = /<!--list:rv-feat-->([\s\S]*?)<!--\/list-->/.exec(html), cards = /<!--list:rv-cards-->([\s\S]*?)<!--\/list-->/.exec(html);
      const one = (h, bodyRe) => { const n = /<b>([\s\S]*?)<\/b>/.exec(h), t = /<small>([\s\S]*?)<\/small>/.exec(h), b = bodyRe.exec(h); return n && b ? { name: decode(n[1]), meta: t ? decode(t[1]) : '', text: decode(b[1]) } : null; };
      if (feat) { const r = one(feat[1], /<blockquote>([\s\S]*?)<\/blockquote>/); if (r) reviews.push(r); }
      if (cards) (cards[1].match(/<article class="rv-card">[\s\S]*?<\/article>/g) || []).forEach((c) => { const r = one(c, /<p>([\s\S]*?)<\/p>/); if (r) reviews.push(r); });
    }
  }
  scanCache = { sig, data: { fields, images, reviews, star } };
  return scanCache.data;
}

// ---- rendering ----
const initial = (n) => esc((String(n).trim()[0] || '?').toUpperCase());
function renderReviews(kind, list, star) {
  const stars = '<span class="stars" role="img" aria-label="5 out of 5 stars">' + star.repeat(5) + '</span>';
  if (kind === 'rv-feat') {
    const r = list[0]; if (!r) return '';
    return '<figure class="rv-feat" style="margin-left:0;margin-right:0">\n    <div class="rv-top"><span class="rv-av" aria-hidden="true">' + initial(r.name) + '</span><div class="rv-who"><b>' + esc(r.name) + '</b><small>' + esc(r.meta) + '</small></div>' + stars + '</div>\n    <blockquote>' + escArea(r.text) + '</blockquote>\n    <span class="rv-src">Google review</span>\n  </figure>';
  }
  return list.slice(1).map((r) => '<article class="rv-card"><div class="rv-top"><span class="rv-av" aria-hidden="true">' + initial(r.name) + '</span><div class="rv-who"><b>' + esc(r.name) + '</b><small>' + esc(r.meta) + '</small></div>' + stars + '</div><p>' + escArea(r.text) + '</p></article>').join('');
}
function globals(s, isJs) {
  const ph = C.site['site.phone'], fx = C.site['site.fax'], em = C.site['site.email'];
  if (ph) { const d = ph.replace(/\D/g, ''); const d10 = d.length === 11 && d[0] === '1' ? d.slice(1) : d; if (d10.length === 10) s = s.split('tel:+16132533334').join('tel:+1' + d10); s = s.split('(613) 253-3334').join(ph); }
  if (fx) s = s.split('(613) 691-7667').join(fx);
  if (em && !isJs) s = s.split('Seaway.carletonplace@gmail.com').join(em);
  return s;
}
function render(html, hl) {
  const star = scan().star;
  hl = /^[\w.-]{1,80}$/.test(hl || '') ? hl : '';
  html = html.replace(ED, (m, key, type, pg, sec, label, def) => { const v = Object.prototype.hasOwnProperty.call(C.values, key) ? (type === 'area' ? escArea(C.values[key]) : esc(C.values[key])) : def; return key === hl ? '<mark id="ed-hl" class="ed-hl">' + v + '</mark>' : v; });
  html = html.replace(IMG, (m, key, pg, sec, label, tag, cls, orig) => {
    const im = C.images[key];
    if (!im) return key === hl ? orig.replace(/^<(\w+)/, '<$1 id="ed-hl" data-hl="1"') : orig;
    return '<' + tag + (key === hl ? ' id="ed-hl" data-hl="1"' : '') + ' class="' + cls + ' has-img"><img src="/uploads/' + im.file + '" alt="' + esc(im.alt || '') + '" loading="lazy" decoding="async"></' + tag + '>';
  });
  html = html.replace(LIST, (m, kind, orig) => (C.reviews ? renderReviews(kind, C.reviews, star) : orig));
  if (hl) html = html.replace('</body>', '<style>mark.ed-hl{background:#FFE680;color:inherit;outline:3px solid #E10600;outline-offset:3px;border-radius:3px}[data-hl]{outline:4px solid #E10600!important;outline-offset:-4px}.ed-bn{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;background:#12263F;color:#fff;font:600 14px/1.3 system-ui,sans-serif;padding:10px 16px;border-radius:999px;box-shadow:0 6px 24px rgba(0,0,0,.3)}</style><script>(function(){var e=document.getElementById("ed-hl");if(!e)return;var b=document.createElement("div");b.className="ed-bn";b.textContent="This is the item you are editing";document.body.appendChild(b);setTimeout(function(){e.scrollIntoView({block:"center"})},350)})()</script></body>');
  return globals(html, false);
}
const renderJs = (js) => globals(js, true);
const phone = () => C.site['site.phone'] || '(613) 253-3334';

// ---- admin ----
function adminData() {
  const s = scan();
  return {
    pages: PAGES.map(([n]) => n),
    fields: s.fields.map((f) => Object.assign({}, f, { value: Object.prototype.hasOwnProperty.call(C.values, f.key) ? C.values[f.key] : null })),
    images: s.images.map((i) => Object.assign({}, i, { file: C.images[i.key] ? C.images[i.key].file : null, alt: C.images[i.key] ? C.images[i.key].alt : '' })),
    site: GLOBALS.map((g) => Object.assign({}, g, { value: C.site[g.key] || null })),
    reviews: C.reviews || s.reviews, reviewsEdited: !!C.reviews,
    storage: { dir: store.DIR, temp: store.DIR.startsWith(require('os').tmpdir()) },
  };
}
const bad = (message) => Object.assign(new Error(message), { code: 400 });
function apply(b) {
  const s = scan(), fmap = new Map(s.fields.map((f) => [f.key, f]));
  const values = b.values && typeof b.values === 'object' ? b.values : {};
  for (const [k, v] of Object.entries(values)) {
    const f = fmap.get(k); if (!f) throw bad('Unknown field.');
    if (v === null || (typeof v === 'string' && !v.trim())) { delete C.values[k]; continue; }
    if (typeof v !== 'string') throw bad('Invalid value.');
    let t = v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\r\n?/g, '\n').trim();
    if (f.type === 'text') t = t.replace(/\s*\n\s*/g, ' ');
    if (t.length > (f.type === 'area' ? 2000 : 300)) throw bad('"' + f.label.split('::')[0] + '" is too long.');
    C.values[k] = t;
  }
  const site = b.site && typeof b.site === 'object' ? b.site : {};
  for (const [k, v] of Object.entries(site)) {
    if (!GLOBALS.some((g) => g.key === k)) throw bad('Unknown field.');
    if (v === null || (typeof v === 'string' && !v.trim())) { delete C.site[k]; continue; }
    if (typeof v !== 'string') throw bad('Invalid value.');
    const t = v.trim();
    if (k === 'site.email' && !/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']{2,}$/.test(t)) throw bad('Please enter a valid email address.');
    if ((k === 'site.phone' || k === 'site.fax') && (!/^[0-9 ()+.\-]{7,24}$/.test(t) || t.replace(/\D/g, '').length < 10)) throw bad('Please enter a phone number with the area code, using only digits, spaces, dashes and brackets.');
    C.site[k] = t;
  }
  if (b.reviews !== undefined) {
    if (b.reviews === null) C.reviews = null;
    else {
      if (!Array.isArray(b.reviews) || b.reviews.length > 60) throw bad('Invalid reviews.');
      C.reviews = b.reviews.map((r) => {
        const name = String(r && r.name || '').replace(/\s+/g, ' ').trim(), meta = String(r && r.meta || '').replace(/\s+/g, ' ').trim(), text = String(r && r.text || '').replace(/\r\n?/g, '\n').trim();
        if (!name || !text) throw bad('Every review needs a name and some text.');
        if (name.length > 80 || meta.length > 80 || text.length > 2500) throw bad('A review is too long.');
        return { name, meta, text };
      });
    }
  }
  save(); return adminData();
}
function sniff(buf) {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 12 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}
function setImage(key, b64, alt) {
  if (!scan().images.some((i) => i.key === key)) throw bad('Unknown photo slot.');
  const buf = Buffer.from(String(b64 || ''), 'base64');
  if (buf.length > 3.5 * 1024 * 1024) throw bad('That photo is too large. Try a smaller one.');
  const ext = sniff(buf); if (!ext) throw bad('Please choose a JPG, PNG or WebP photo.');
  const file = crypto.randomBytes(8).toString('hex') + '.' + ext;
  fs.writeFileSync(path.join(UP, file), buf, { mode: 0o600 });
  const old = C.images[key]; C.images[key] = { file, alt: String(alt || '').replace(/\s+/g, ' ').trim().slice(0, 160) };
  save(); if (old) try { fs.unlinkSync(path.join(UP, old.file)); } catch (e) { /* ignore */ }
  return adminData();
}
function setAlt(key, alt) { if (!C.images[key]) throw bad('No photo here yet.'); C.images[key].alt = String(alt || '').replace(/\s+/g, ' ').trim().slice(0, 160); save(); return adminData(); }
function clearImage(key) {
  const old = C.images[key]; delete C.images[key]; save();
  if (old) try { fs.unlinkSync(path.join(UP, old.file)); } catch (e) { /* ignore */ }
  return adminData();
}
function upload(name) {
  if (!/^[a-f0-9]{16}\.(jpg|png|webp)$/.test(name)) return null;
  try { return { data: fs.readFileSync(path.join(UP, name)), type: { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[name.split('.')[1]] }; } catch (e) { return null; }
}
module.exports = { render, renderJs, phone, adminData, apply, setImage, setAlt, clearImage, upload };
