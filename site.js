
(function(){
var form=document.getElementById('rfform');if(!form)return;
var PREV=!/^https?:$/.test(location.protocol)||location.origin==='null'||!!window.SV_PREVIEW;
var ful='Pick up at the pharmacy',busy=false,$=function(i){return document.getElementById(i)};
function pick(n){var e=form.querySelector('input[name="'+n+'"]:checked');return e?e.value:''}
function many(n){return [].map.call(form.querySelectorAll('input[name="'+n+'"]:checked'),function(x){return x.value})}
function showE(m){var e=$('rerr');e.textContent=m;e.hidden=!m;if(m)e.scrollIntoView({block:'nearest',behavior:'smooth'})}
form.querySelectorAll('.chips button').forEach(function(b){b.addEventListener('click',function(){
  form.querySelectorAll('.chips button').forEach(function(x){x.setAttribute('aria-pressed',x===b)});
  ful=b.getAttribute('data-ful');$('radw').hidden=ful.indexOf('delivery')<0;showE('')})});
form.addEventListener('change',function(e){
  $('rchgw').hidden=pick('rchg')!=='Yes';
  $('remw').hidden=pick('rnt')!=='Email';
  showE('')});
var more=$('rfmore');
function openMore(){if(more.classList.contains('rfo'))return;more.classList.add('rfo');more.removeAttribute('inert')}
form.addEventListener('focusin',openMore);
form.querySelectorAll('.chips button').forEach(function(b){b.addEventListener('click',openMore)});
function digitsOnly(v){return String(v||'').replace(/\D/g,'')}
function opts(list,sel){return list.map(function(t){return {t:t,on:sel.indexOf(t)>-1}})}
function build(){
  var chg=pick('rchg'),nt=pick('rnt'),rows=[],R=function(q,a){return {q:q,a:a==null?'':String(a)}};
  var deliver=ful.indexOf('delivery')>-1;
  var secs=[{h:'Refill request',rows:[R('Prescription number(s) or medication name(s)',$('rx').value.trim()),{q:'Pickup or delivery',opts:opts(['Pick up at the pharmacy','Free delivery to my door'],[ful])}].concat(deliver?[R('Delivery address',$('rad').value.trim())]:[])}];
  var cr=[{q:'Any changes to your medication or health since the last fill?',opts:opts(['No changes','Yes, something has changed'],[chg==='Yes'?'Yes, something has changed':'No changes'])}];
  if(chg==='Yes'){cr.push(R('What has changed?',$('rchgt').value.trim()));
    cr.push({q:'Do any of these apply?',opts:opts(['New side effects','The medication does not seem to work as well','I have been missing doses','Pregnant or breastfeeding'],many('rconc'))})}
  secs.push({h:'Changes since the last fill',rows:cr});
  secs.push({h:'Patient information',rows:[R('Patient name',$('rn').value.trim()),R('Date of birth',$('rdob').value),R('Phone number',$('rph').value.trim())]});
  secs.push({h:'How to notify the patient',rows:[{q:'Patient chose to be notified by',opts:opts(['Text message','Email','Phone call'],[nt])},R(nt==='Email'?'Email address':'Phone number',nt==='Email'?$('rem').value.trim():$('rph').value.trim())]});
  return secs;
}
function validate(){
  var today=new Date();today.setMinutes(today.getMinutes()-today.getTimezoneOffset());today=today.toISOString().slice(0,10);
  if(!$('rx').value.trim())return 'Please enter your prescription number or the medication name.';
  if(!$('rn').value.trim())return 'Please enter the name on the prescription.';
  if(!$('rdob').value)return 'Please enter your date of birth.';
  if($('rdob').value>today)return 'Date of birth cannot be in the future.';
  if(digitsOnly($('rph').value).length<10)return 'Please enter a phone number with the area code.';
  if(ful.indexOf('delivery')>-1&&!$('rad').value.trim())return 'Please enter the delivery address.';
  if(!pick('rchg'))return 'Please tell us whether anything has changed.';
  if(pick('rchg')==='Yes'&&!$('rchgt').value.trim())return 'Please tell us what has changed.';
  if(!pick('rnt'))return 'Please choose how you would like to be notified.';
  if(pick('rnt')==='Email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test($('rem').value.trim()))return 'Please enter a valid email address.';
  return '';
}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function finish(ref){
  var fn=$('rn').value.trim().split(/\s+/)[0];
  var box=$('ok');
  box.innerHTML='<b>Thank you, '+esc(fn)+'.</b> Your request has been sent to the pharmacy. We will contact you shortly with confirmation of your prescription refill.'
    +'<span class="rref">Reference: '+esc(ref||'')+'</span>'+(PREV?'<span class="rref">Preview only: nothing was sent.</span>':'')
    +'<button type="button" class="btn sec sm" id="again">Request another refill</button>';
  box.hidden=false;form.classList.add('is-done');
  $('again').onclick=function(){form.reset();form.classList.remove('is-done');box.hidden=true;$('rchgw').hidden=true;$('remw').hidden=true;$('radw').hidden=true;
    form.querySelectorAll('.chips button').forEach(function(x,i){x.setAttribute('aria-pressed',i===0)});ful='Pick up at the pharmacy';$('rx').focus()};
  box.scrollIntoView({behavior:'smooth',block:'nearest'});
}
$('go').onclick=function(){
  if(busy)return;
  if(!more.classList.contains('rfo')){openMore();showE('Please complete the form, then press Refill now.');return}
  var e=validate();if(e){showE(e);return}
  showE('');busy=true;var b=$('go');b.disabled=true;b.textContent='Sending...';
  var done=function(){busy=false;b.disabled=false;b.textContent='Refill now'};
  if(PREV){setTimeout(function(){done();finish('PREVIEW')},450);return}
  fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',credentials:'same-origin',
    body:JSON.stringify({kind:'rx',svcId:'refill',service:'Prescription refill',sections:build(),slot:null,website:$('rweb').value})})
  .then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok){j.status=r.status;throw j}return j})},
        function(){throw {message:'We could not reach the pharmacy system. Please check your connection or call (613) 253-3334.'}})
  .then(function(j){done();finish(j.ref)},function(err){done();showE((err&&err.message)||'Something went wrong. Please try again or call the pharmacy at (613) 253-3334.')});
};
})();
(function(){var m=document.getElementById('menu'),b=document.getElementById('burger');
function closeDD(){document.querySelectorAll('.dw').forEach(function(x){x.classList.remove('is-open');x.firstElementChild.setAttribute('aria-expanded','false')})}
b.onclick=function(){var o=m.classList.toggle('is-open');b.setAttribute('aria-expanded',o)};
document.querySelectorAll('.dt').forEach(function(t){t.onclick=function(e){var w=t.parentNode,o=!w.classList.contains('is-open');closeDD();if(o){w.classList.add('is-open');t.setAttribute('aria-expanded','true')}e.stopPropagation()}});
document.addEventListener('click',closeDD);
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeDD();m.classList.remove('is-open')}});
m.querySelectorAll('.dm a').forEach(function(a){a.addEventListener('click',function(){closeDD();m.classList.remove('is-open')})});
document.querySelectorAll('a[href="#"]').forEach(function(a){a.addEventListener('click',function(e){e.preventDefault()})});
})();
(function(){var tr=document.getElementById('rvtrack');if(!tr)return;
var step=function(){var c=tr.querySelector('.rv-card');return c?c.offsetWidth+16:300};
var atEnd=function(){return tr.scrollLeft+tr.clientWidth>=tr.scrollWidth-6};
function next(){if(atEnd())tr.scrollTo({left:0,behavior:'smooth'});else tr.scrollBy({left:step(),behavior:'smooth'})}
function prev(){if(tr.scrollLeft<=2)tr.scrollTo({left:tr.scrollWidth,behavior:'smooth'});else tr.scrollBy({left:-step(),behavior:'smooth'})}
document.getElementById('rvnext').onclick=function(){next();hold()};
document.getElementById('rvprev').onclick=function(){prev();hold()};
var timer=null,paused=false,reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
function start(){if(reduce||timer)return;timer=setInterval(function(){if(!paused)next()},5000)}
var rt=null;function hold(){paused=true;clearTimeout(rt);rt=setTimeout(function(){paused=false},9000)}
['pointerdown','touchstart','wheel','focusin','mouseenter'].forEach(function(ev){tr.addEventListener(ev,function(){paused=true;clearTimeout(rt)},{passive:true})});
['mouseleave','focusout','touchend'].forEach(function(ev){tr.addEventListener(ev,function(){hold()},{passive:true})});
if('IntersectionObserver' in window){new IntersectionObserver(function(e){paused=!e[0].isIntersecting},{threshold:.2}).observe(tr)}
start();
})();
document.querySelectorAll('#menu a').forEach(function(a){a.addEventListener('click',function(){var m=document.getElementById('menu');if(m)m.classList.remove('is-open')})});
(function(){
'use strict';
/* Preview mode: when this page is opened as a plain file or inside a sandboxed viewer (no server behind it),
   times are sample times and nothing is sent. On the real website (served by server.js) this is off. */
var PREVIEW=!/^https?:$/.test(location.protocol)||location.origin==='null'||!!window.SV_PREVIEW;
var API=(window.SV_API_BASE||'');
var DATA={"ailment":{"acne":{"name":"Mild acne","qs":[{"p":"How would you describe your breakouts?","o":["Blackheads or whiteheads","Red, tender bumps","Pimples with pus","Deep, painful lumps (cysts)","Dark marks or scars left behind"],"t":"m","x":true,"n":false},{"p":"Where are the breakouts?","o":["Face","Chest","Back","Shoulders or arms"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Large, deep or cystic lumps","Scarring","Taking or recently took isotretinoin","Started after a new medication","Not improving after 3 months of over-the-counter treatment"],"t":"m","x":false,"n":true}]},"eczema":{"name":"Eczema","qs":[{"p":"How would you describe your skin?","o":["Dry, scaly patches","Intense itching","Red or inflamed skin","Small bumps that weep or crust","Thickened skin from scratching","Cracked or bleeding skin"],"t":"m","x":true,"n":false},{"p":"Where is the eczema?","o":["Face or eyelids","Neck","Inner elbows or behind the knees","Hands","Feet","Trunk (chest, back, belly)","Scalp","Widespread"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Yellow crusts, pus or oozing","Fever","Skin is painful rather than itchy","Covers a large part of the body","Close to the eyes","Already diagnosed with eczema by a health care provider"],"t":"m","x":false,"n":true}]},"dermatitis":{"name":"Dermatitis","qs":[{"p":"How would you describe the rash?","o":["Red and itchy","Blisters or weeping","Dry, cracked or peeling","Burning or stinging","Swollen skin","Started after touching something (soap, plant, metal, cosmetic)"],"t":"m","x":true,"n":false},{"p":"Where is the rash?","o":["Hands","Face or eyelids","Neck","Arms","Legs","Trunk","Scalp"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Pus, yellow crusts or spreading redness","Fever","Rash near the eyes or mouth","Rash is widespread","Trouble swallowing or breathing","Started after a new medication"],"t":"m","x":false,"n":true}]},"diaper":{"name":"Diaper rash","qs":[{"p":"How does the rash look?","o":["Red, tender skin","Small red bumps or spots","Raw or broken skin","Bright red rash with spots in the skin folds","Blisters or sores"],"t":"m","x":true,"n":false},{"p":"Where is the rash?","o":["Buttocks","Genitals","Skin folds (groin or thighs)","Lower belly"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Baby is under 3 months old","Fever","Blisters, pus or open sores","Not better after 3 days of barrier cream","Baby seems unusually unwell or fussy"],"t":"m","x":false,"n":true}]},"dandruff":{"name":"Dandruff","qs":[{"p":"What are you noticing?","o":["White or yellowish flakes","Itchy scalp","Greasy, red scalp","Flaking on eyebrows, sides of the nose or ears"],"t":"m","x":true,"n":false},{"p":"Where do you see the flaking?","o":["Scalp","Eyebrows","Sides of the nose","In or behind the ears","Beard area","Chest"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Thick, crusted or scaly plaques","Patchy hair loss","Sores, oozing or pus","Painful scalp","Not improving with a medicated shampoo","Weakened immune system"],"t":"m","x":false,"n":true}]},"coldsore":{"name":"Cold sores","qs":[{"p":"What are you noticing?","o":["Tingling, itching or burning before the sore","Small fluid-filled blisters","Blisters that crust over","Painful sore on or near the lips"],"t":"m","x":true,"n":false},{"p":"Where is the sore?","o":["Edge of the lip","Around the mouth","Nose or cheek","Inside the mouth","Near or in the eye"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Sore is near or in the eye","Weakened immune system","Eczema on the skin near the sore","Frequent outbreaks (more than 6 a year)","Not healed after 2 weeks","Fever or swollen glands"],"t":"m","x":false,"n":true}]},"impetigo":{"name":"Impetigo","qs":[{"p":"How do the sores look?","o":["Red sores that burst and ooze","Honey-coloured crusts","Fluid-filled blisters","Itchy or sore","Spreading to new areas"],"t":"m","x":true,"n":false},{"p":"Where are the sores?","o":["Around the nose and mouth","Face","Arms or legs","Hands","Diaper area","Scalp","Trunk"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Fever","Many sores or widespread sores","Deep or ulcerated sores","Redness, warmth or swelling spreading around the sores","Weakened immune system","Not improving after 3 days of treatment"],"t":"m","x":false,"n":true}]},"insect":{"name":"Insect bites","qs":[{"p":"How does the bite look and feel?","o":["Red, raised bump","Intense itching","Swelling around the bite","Blister","Pain or burning sting","Small puncture mark"],"t":"m","x":true,"n":false},{"p":"What do you think caused it?","o":["Mosquito","Bee or wasp","Spider","Bed bug or flea","Black fly or horsefly","Ant"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Swelling of the lips, tongue or face","Trouble breathing or swallowing","Spreading redness, warmth or pus","Fever","Many bites at once","Bite inside the mouth or throat"],"t":"m","x":false,"n":true}]},"hives":{"name":"Hives","qs":[{"p":"How do the hives look and feel?","o":["Raised, itchy welts","Welts that move or change shape","Red or skin-coloured patches","Swelling of lips, eyelids or hands","Burning or stinging"],"t":"m","x":true,"n":false},{"p":"Where are the hives?","o":["Face","Trunk","Arms","Legs","Widespread"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Trouble breathing or swallowing","Swollen tongue or throat","Dizziness or fainting","Hives for more than 6 weeks","Individual welts last more than 24 hours","Fever or joint pain","Started after a new medication, food or sting"],"t":"m","x":false,"n":true}]},"ringworm":{"name":"Ringworm","qs":[{"p":"How does the patch look?","o":["Ring-shaped red or scaly patch","Clearer skin in the centre","Raised, scaly border","Itchy","More than one patch"],"t":"m","x":true,"n":false},{"p":"Where is the patch?","o":["Trunk","Arms","Legs","Face","Neck","Scalp"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Scalp involved or hair loss","Nails involved","Pus or oozing","Fever","Weakened immune system","Contact with a pet that has skin patches","Not better after 2 weeks of antifungal cream"],"t":"m","x":false,"n":true}]},"jock":{"name":"Jock itch","qs":[{"p":"What are you noticing?","o":["Red or brownish rash in the groin or inner thigh","Itching or burning","Scaly, ring-shaped edge","Chafed or cracked skin"],"t":"m","x":true,"n":false},{"p":"Where is the rash?","o":["Groin folds","Inner thighs","Buttocks","I also have athlete's foot"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Rash on the genital skin itself","Open sores, blisters or pus","Fever","Diabetes","Weakened immune system","Discharge or pain when urinating","Not better after 2 weeks of antifungal cream"],"t":"m","x":false,"n":true}]},"callus":{"name":"Calluses","qs":[{"p":"How would you describe the thickened skin?","o":["Flat, hardened patch","Yellowish or greyish skin","Rough, dry or flaky surface","Tender when pressed","Cracks in the skin"],"t":"m","x":true,"n":false},{"p":"Which part is affected?","o":["Heel","Ball of the foot","Arch","Side of the foot","Toes","Palm or fingers"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Diabetes","Numbness or poor circulation in the feet","Open sore or bleeding","Redness, warmth or pus","Callus keeps coming back","Pain makes walking difficult"],"t":"m","x":false,"n":true}]},"corn":{"name":"Corns","qs":[{"p":"How would you describe the spot or bump on your foot?","o":["A small, hard bump that may hurt when pressed, usually on the toe joints","A thickening of the skin between toes","A larger, thickened patch of skin, usually on the sole","A bony lump at the base of your big toe, often red or swollen","A rough bump with small dark spots, sometimes painful when pinched from the sides","A toenail growing into the surrounding skin, causing pain or tenderness"],"t":"m","x":true,"n":false},{"p":"Which section of the foot is affected?","o":["Top of a toe","Between the toes","Tip of a toe","Ball of the foot","Arch","Heel","Side of the foot","Base of the big toe"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Diabetes","Numbness or poor circulation in the feet","Open sore, bleeding or pus","Redness spreading","Severe pain when walking","Tried cutting or shaving it"],"t":"m","x":false,"n":true}]},"wart":{"name":"Warts","qs":[{"p":"How would you describe the wart?","o":["Rough, raised bump","Tiny black dots inside (like seeds)","Small, flat, smooth bump","Cluster of bumps","Painful when pressed or pinched","Bleeds or itches"],"t":"m","x":true,"n":false},{"p":"Where is it?","o":["Fingers or hands","Around a nail","Sole of the foot","Toes","Face","Knee or elbow"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Bumps in the genital or anal area","Bleeds, or is changing colour or shape","Many warts","Weakened immune system","Diabetes","Not better after 12 weeks of treatment"],"t":"m","x":false,"n":true}]},"seasonal":{"name":"Seasonal allergies","qs":[{"p":"Which symptoms do you have?","o":["Sneezing","Runny or stuffy nose","Itchy nose, throat or ears","Itchy, watery eyes","Post-nasal drip or cough"],"t":"m","x":true,"n":false},{"p":"When do symptoms happen?","o":["Spring","Summer","Fall","Year-round","Worse outdoors","Worse around dust or pets"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Wheezing or shortness of breath","Asthma","Fever or thick yellow-green mucus","Facial pain or pressure","Not helped by an antihistamine","Affecting sleep or daily life"],"t":"m","x":false,"n":true}]},"rhinitis":{"name":"Allergic rhinitis","qs":[{"p":"What are you noticing?","o":["Fits of sneezing","Clear, runny nose","Blocked nose","Itchy nose","Reduced sense of smell","Post-nasal drip"],"t":"m","x":true,"n":false},{"p":"What seems to trigger it?","o":["Pollen","Dust","Pet dander","Mould","Smoke or strong smells","Cold air"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Nosebleeds","Blockage on one side only","Facial pain","Fever","Wheezing","Thick coloured mucus for more than 10 days","Using a decongestant spray for more than 3 days"],"t":"m","x":false,"n":true}]},"pinkeye":{"name":"Pink eye","qs":[{"p":"How does your eye look and feel?","o":["Red or pink","Watery discharge","Thick yellow or green discharge","Crusting, eyelids stuck in the morning","Itchy","Gritty feeling","Swollen eyelids"],"t":"m","x":true,"n":false},{"p":"Which eye is affected?","o":["Left eye","Right eye","Both eyes"],"t":"s","x":false,"n":false},{"p":"Do any of these apply to you right now?","o":["I wear contact lenses","Eye pain","Blurred vision or vision changes","Sensitivity to light","Recent eye injury or chemical splash","Weakened immune system"],"t":"m","x":false,"n":true}]},"dryeye":{"name":"Dry eye","qs":[{"p":"How do your eyes feel?","o":["Gritty or sandy","Burning or stinging","Red","Watery","Blurry vision that clears with blinking","Tired eyes","Stringy mucus"],"t":"m","x":true,"n":false},{"p":"When are your symptoms worst?","o":["Reading or using screens","In the morning","In the evening","In wind, dry air or air conditioning","While wearing contact lenses"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Eye pain","Vision loss or sudden vision changes","Sensitivity to light","Only one eye is affected","Recent eye injury or eye surgery","Dry mouth or joint pain too"],"t":"m","x":false,"n":true}]},"reflux":{"name":"Acid reflux","qs":[{"p":"What are you experiencing?","o":["Burning in the chest (heartburn)","Sour or bitter taste","Food or liquid coming back up","Bloating or belching","Cough or hoarse voice"],"t":"m","x":true,"n":false},{"p":"When does it happen?","o":["After meals","When lying down or at night","With certain foods or drinks","When bending over","Most days","Less than twice a week"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Pain or trouble when swallowing","Unintentional weight loss","Vomiting blood or black, tarry stools","Repeated vomiting","Chest pain with sweating or pain in the arm or jaw","New symptoms after age 50","Symptoms for more than 4 weeks"],"t":"m","x":false,"n":true}]},"hemorrhoid":{"name":"Hemorrhoids","qs":[{"p":"What are you experiencing?","o":["Itching around the anus","Painful lump or swelling","Bright red blood on tissue or stool","Pain when sitting or passing stool","A lump that comes out and goes back in","Mucus discharge"],"t":"m","x":true,"n":false},{"p":"What might be contributing?","o":["Constipation","Straining","Diarrhea","Sitting for long periods","Pregnancy or recent childbirth","Heavy lifting"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Heavy bleeding or dark maroon blood","Blood mixed into the stool","Change in bowel habits","Unintentional weight loss","Severe pain or a hard, painful lump","Fever","Dizziness or weakness"],"t":"m","x":false,"n":true}]},"canker":{"name":"Canker sores","qs":[{"p":"How do the sores look and feel?","o":["Round or oval with a white or yellow centre and red border","Painful when eating or talking","Tingling or burning before it appeared","One sore","Several sores"],"t":"m","x":true,"n":false},{"p":"Where are the sores?","o":["Inside the cheeks","Inside the lips","Tongue","Gums","Roof or back of the mouth"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Sore larger than 1 cm","Lasting more than 2 weeks","Frequent recurrences","Fever or swollen glands","Trouble eating or drinking","Sores on the outside of the lips or skin","White patches that do not wipe off"],"t":"m","x":false,"n":true}]},"thrush":{"name":"Oral thrush","qs":[{"p":"What are you noticing?","o":["Creamy white patches","Red, sore tongue or mouth","Cracks at the corners of the mouth","Cotton-like feeling in the mouth","Loss of taste","Pain when eating or swallowing"],"t":"m","x":true,"n":false},{"p":"Where is it?","o":["Tongue","Inner cheeks","Roof of the mouth","Gums or tonsils","Corners of the mouth","Throat"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["I use an inhaled steroid puffer","I wear dentures","Diabetes","Recent antibiotics","Weakened immune system","Pain or trouble swallowing","Lasting more than 2 weeks"],"t":"m","x":false,"n":true}]},"cramps":{"name":"Menstrual cramps","qs":[{"p":"How would you describe the pain?","o":["Cramping or aching in the lower belly","Pain spreading to the lower back or thighs","Nausea or vomiting","Headache","Loose stools","Dizziness or fatigue"],"t":"m","x":true,"n":false},{"p":"When does the pain happen?","o":["Just before my period","First 1 to 3 days of my period","Throughout my period","Since my first periods","Started more recently"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Pelvic pain between periods","Very heavy bleeding","Pain with sex","Pain not helped by anti-inflammatory medicine","Fever","Possibly pregnant","New pain after age 25","I have an IUD"],"t":"m","x":false,"n":true}],"f":1},"uti":{"name":"Uncomplicated UTI","qs":[{"p":"What symptoms do you have?","o":["Burning or pain when urinating","Urgent need to urinate","Frequent urination in small amounts","Cloudy or strong-smelling urine","Pressure or pain low in the belly","Blood in the urine"],"t":"m","x":true,"n":false},{"p":"Have you had a UTI before?","o":["This is my first one","Yes, last one more than 12 months ago","Yes, one in the past 12 months","Yes, 2 or more in the past 6 months or 3 or more in 12 months"],"t":"s","x":false,"n":false},{"p":"Do any of these apply to you right now?","o":["Fever or chills","Back or side pain","Nausea or vomiting","Vaginal discharge or irritation","Kidney problems or kidney stones","Diabetes","Catheter or recent urinary procedure","Symptoms for more than 7 days"],"t":"m","x":false,"n":true}],"f":1},"yeast":{"name":"Vaginal yeast infection","qs":[{"p":"What symptoms do you have?","o":["Vaginal itching or burning","Thick, white, odourless discharge","Redness or swelling","Pain when urinating","Pain with sex","Soreness"],"t":"m","x":true,"n":false},{"p":"Have you had this before?","o":["This is my first time","Diagnosed before and this feels the same","Four or more in the past year","Recently took antibiotics"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Fever or chills","Pelvic or lower belly pain","Foul-smelling or green, yellow or grey discharge","Sores or blisters","Possible exposure to a sexually transmitted infection","Unusual bleeding","Diabetes","Weakened immune system"],"t":"m","x":false,"n":true}],"f":1},"nausea":{"name":"Nausea or vomiting in pregnancy","qs":[{"p":"What are you experiencing?","o":["Nausea in the morning","Nausea throughout the day","Vomiting","Strong dislike of smells or foods","Dizziness","Loss of appetite"],"t":"m","x":true,"n":false},{"p":"How far along are you?","o":["Less than 6 weeks","6 to 12 weeks","13 to 20 weeks","More than 20 weeks","Not sure"],"t":"s","x":false,"n":false},{"p":"Do any of these apply to you right now?","o":["Cannot keep fluids down for 24 hours","Weight loss","Dark urine or very little urine","Dizziness or fainting","Abdominal pain","Vaginal bleeding","Fever","Severe headache or vision changes"],"t":"m","x":false,"n":true}],"f":1},"lice":{"name":"Head lice","qs":[{"p":"What are you noticing?","o":["Itchy scalp","Live lice","Small white eggs (nits) stuck to the hair","Red bumps or sores on the scalp or neck","Tickling feeling in the hair"],"t":"m","x":true,"n":false},{"p":"Who is affected?","o":["Me","A child in my household","More than one person in my household","Cases at school or daycare"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Sores that look infected (pus or crusts)","Lice or nits in the eyelashes or eyebrows","Still present after 2 treatments","Allergy to chrysanthemum or ragweed","Pregnant or breastfeeding","Child under 2 years"],"t":"m","x":false,"n":true}]},"pinworm":{"name":"Pinworms","qs":[{"p":"What are you noticing?","o":["Itching around the anus, worse at night","Disturbed sleep","Small white threadlike worms seen","Irritability","Itching in the vaginal area","Abdominal discomfort"],"t":"m","x":true,"n":false},{"p":"Who might be affected?","o":["Me","A child in my household","Other people in my household","Cases at school or daycare"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Under 2 years old","Pregnant","Severe abdominal pain","Unexplained weight loss","Blood in the stool","Symptoms returned after earlier treatment","Weakened immune system"],"t":"m","x":false,"n":true}]},"threadworm":{"name":"Threadworms","qs":[{"p":"What are you noticing?","o":["Intense night-time itching around the bottom","Worms seen in the stool or on toilet paper","Worms seen on underwear or bedding","Poor sleep or tiredness","Poor appetite or weight gain in a child","Bed-wetting"],"t":"m","x":true,"n":false},{"p":"Any of these in your household?","o":["Child care or school","Several family members itching","Nail biting or thumb sucking","Shared bedding or towels","Recent travel"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Under 2 years old","Pregnant or breastfeeding","Severe abdominal pain","Unexplained weight loss","Blood in the stool","Already treated and symptoms came back","Weakened immune system"],"t":"m","x":false,"n":true}]},"congestion":{"name":"Nasal congestion","qs":[{"p":"How does your nose feel?","o":["Blocked or stuffy","Trouble breathing through the nose","Pressure around the eyes or cheeks","Thick mucus","Runny nose","Reduced smell or taste","Snoring or mouth breathing"],"t":"m","x":true,"n":false},{"p":"What else is happening?","o":["Cold symptoms","Sore throat","Cough","Sneezing and itchy eyes","Headache","Ear pressure"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Fever above 38.5 C (101.3 F)","Symptoms for more than 10 days","Getting worse after an initial improvement","Severe facial pain","Nosebleeds or one-sided blockage","Using a decongestant spray for more than 3 days","High blood pressure, heart disease, glaucoma or enlarged prostate","Child under 6 years"],"t":"m","x":false,"n":true}]},"headache":{"name":"Mild tension headache","qs":[{"p":"How would you describe the headache?","o":["Dull, aching pain","Tight band or pressure around the head","Pain on both sides","Tender neck or shoulders","Not worse with activity","Mild sensitivity to light or sound"],"t":"m","x":true,"n":false},{"p":"How often do you get headaches?","o":["Less than once a month","1 to 3 times a month","1 or 2 times a week","3 or more days a week","Daily"],"t":"s","x":false,"n":false},{"p":"Do any of these apply to you right now?","o":["Sudden, severe \"worst headache of my life\"","Started after a head injury","Fever with a stiff neck","Vision changes, weakness, numbness or trouble speaking","Confusion or fainting","First headaches after age 50","Wakes me from sleep or worse when lying down","Taking pain relievers 3 or more days a week","Throbbing pain with nausea"],"t":"m","x":false,"n":true}]},"sprain":{"name":"Minor sprains and strains","qs":[{"p":"What are you experiencing?","o":["Pain","Swelling","Bruising","Stiffness","Limited movement","Muscle spasm","A pop or tear at the time of injury"],"t":"m","x":true,"n":false},{"p":"Which area was injured?","o":["Ankle","Foot","Knee","Wrist","Hand or fingers","Elbow","Shoulder","Neck","Lower back","Thigh or calf"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Cannot put weight on it or move the joint","The area looks out of shape","Numbness or tingling","Severe swelling","Heard a snap with immediate weakness","Pain directly over a bone","Injury from a fall or car accident","Calf swelling or redness","Taking blood thinners"],"t":"m","x":false,"n":true}]},"tick":{"name":"Tick bites","qs":[{"p":"What happened?","o":["Tick is still attached","Tick was removed","Red bump at the bite","Expanding red rash (bullseye)","Flu-like symptoms since the bite","Found a rash but did not see a bite"],"t":"m","x":true,"n":false},{"p":"Tell us about the tick","o":["Removed within the last 72 hours","Removed more than 72 hours ago","Attached for 24 hours or more","Attached for less than 24 hours","Not sure how long it was attached","Looked like a blacklegged (deer) tick","I saved the tick"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you right now?","o":["Fever, chills, headache or muscle and joint aches","Expanding rash","Facial droop or weakness","Heart palpitations","Allergy to doxycycline or tetracyclines","Pregnant or breastfeeding","Child under 8 years","Weakened immune system","Part of the tick is still in the skin"],"t":"m","x":false,"n":true}]}},"vaccine":{"covid":{"name":"COVID-19","qs":[{"p":"Why are you booking this vaccine?","o":["Seasonal COVID-19 dose","Age 65 or older","Chronic health condition","Pregnant or breastfeeding","Weakened immune system","Health care worker","Live with or care for someone at higher risk","Travel"],"t":"m","x":true,"n":false},{"p":"What is your COVID-19 vaccine history?","o":["I have never been vaccinated","Last dose was more than 6 months ago","Last dose was within the last 6 months","Had a COVID-19 infection in the last 3 months"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you today?","o":["Heart inflammation (myocarditis or pericarditis) after a past COVID-19 vaccine","Fever or feeling unwell today","A past severe allergic reaction (anaphylaxis) to a vaccine or its ingredients","Weakened immune system or immune-suppressing treatment","Bleeding disorder or taking blood thinners","Fainted after a past needle","Another vaccine in the last 4 weeks"],"t":"m","x":false,"n":true}]},"flu":{"name":"Influenza (flu)","qs":[{"p":"Who is this flu shot for?","o":["Adult aged 18 to 64","Adult aged 65 or older","Child aged 2 to 17","Pregnant","Health care worker","Chronic health condition","Caregiver or household contact of someone at higher risk"],"t":"m","x":true,"n":false},{"p":"What is your flu shot history?","o":["This is my first flu shot","I have had flu shots in past seasons","I already had a flu shot this season","I would like the high-dose option (65 or older)"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you today?","o":["Guillain-Barre syndrome within 6 weeks of a past flu shot","Fever or feeling unwell today","A past severe allergic reaction (anaphylaxis) to a vaccine or its ingredients","Weakened immune system or immune-suppressing treatment","Bleeding disorder or taking blood thinners","Fainted after a past needle","Another vaccine in the last 4 weeks"],"t":"m","x":false,"n":true}]},"shingles":{"name":"Shingles (herpes zoster)","qs":[{"p":"Why are you booking this vaccine?","o":["Age 65 to 70","Age 50 or older","Age 18 or older with a weakened immune system","I have had shingles before","I had the older shingles vaccine (Zostavax)"],"t":"m","x":true,"n":false},{"p":"Which dose is this?","o":["First dose of Shingrix","Second dose of Shingrix (2 to 6 months after the first)","Not sure"],"t":"s","x":false,"n":false},{"p":"Do any of these apply to you today?","o":["Active shingles rash right now","Severe reaction to a previous shingles vaccine","Fever or feeling unwell today","A past severe allergic reaction (anaphylaxis) to a vaccine or its ingredients","Weakened immune system or immune-suppressing treatment","Bleeding disorder or taking blood thinners","Fainted after a past needle","Another vaccine in the last 4 weeks"],"t":"m","x":false,"n":true}]},"pneumo":{"name":"Pneumococcal disease (pneumonia)","qs":[{"p":"Why are you booking this vaccine?","o":["Age 65 or older","Chronic lung, heart, kidney or liver disease","Diabetes","Smoker","No working spleen or weakened immune system","Cochlear implant","Child under 5"],"t":"m","x":true,"n":false},{"p":"What is your pneumococcal vaccine history?","o":["I have never had one","I had Pneu-C-13, 15 or 20","I had Pneu-P-23"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you today?","o":["Fever or feeling unwell today","A past severe allergic reaction (anaphylaxis) to a vaccine or its ingredients","Weakened immune system or immune-suppressing treatment","Bleeding disorder or taking blood thinners","Fainted after a past needle","Another vaccine in the last 4 weeks"],"t":"m","x":false,"n":true}]},"hep":{"name":"Hepatitis A and B","qs":[{"p":"Which vaccine do you need?","o":["Hepatitis A","Hepatitis B","Combined hepatitis A and B"],"t":"m","x":true,"n":false},{"p":"Why are you booking this vaccine?","o":["Travel","Health care or public safety worker","Liver disease","Close contact of someone with hepatitis","Higher-risk exposure (I would like to discuss this privately)"],"t":"m","x":true,"n":false},{"p":"What is your hepatitis vaccine history?","o":["No previous doses","One dose","Two doses, I need the last one","Fully vaccinated, I need a booster"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you today?","o":["Fever or feeling unwell today","A past severe allergic reaction (anaphylaxis) to a vaccine or its ingredients","Weakened immune system or immune-suppressing treatment","Bleeding disorder or taking blood thinners","Fainted after a past needle","Another vaccine in the last 4 weeks"],"t":"m","x":false,"n":true}]},"mening":{"name":"Meningococcal disease","qs":[{"p":"Which vaccine do you need?","o":["Meningococcal ACYW","Meningococcal B","Both"],"t":"m","x":true,"n":false},{"p":"Why are you booking this vaccine?","o":["Travel (for example the Hajj or sub-Saharan Africa)","Starting college or university residence","No working spleen or immune condition","Public health outbreak response","Laboratory worker","Routine catch-up (age 12 to 24)"],"t":"m","x":true,"n":false},{"p":"What is your meningococcal vaccine history?","o":["No previous doses","Had Men-C-C in childhood","Had Men-C-ACYW as a teen","Had Men-B before"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you today?","o":["Fever or feeling unwell today","A past severe allergic reaction (anaphylaxis) to a vaccine or its ingredients","Weakened immune system or immune-suppressing treatment","Bleeding disorder or taking blood thinners","Fainted after a past needle","Another vaccine in the last 4 weeks"],"t":"m","x":false,"n":true}]},"hpv":{"name":"Human papillomavirus (HPV)","qs":[{"p":"Why are you booking this vaccine?","o":["Age 9 to 26","Age 27 to 45 (I would like to discuss this)","Weakened immune system","Not vaccinated as a child or teen","Finishing a series I started"],"t":"m","x":true,"n":false},{"p":"What is your HPV vaccine history?","o":["No previous doses","One dose","Two doses"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you today?","o":["Pregnant or trying to conceive","Fever or feeling unwell today","A past severe allergic reaction (anaphylaxis) to a vaccine or its ingredients","Weakened immune system or immune-suppressing treatment","Bleeding disorder or taking blood thinners","Fainted after a past needle","Another vaccine in the last 4 weeks"],"t":"m","x":false,"n":true}]},"hib":{"name":"Haemophilus influenzae type B (Hib)","qs":[{"p":"Why are you booking this vaccine?","o":["Child under 5","No working spleen","Weakened immune system or stem cell transplant","Catch-up for missed childhood doses"],"t":"m","x":true,"n":false},{"p":"What is the Hib vaccine history?","o":["No previous doses","One or two doses","Three or more doses"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you today?","o":["Fever or feeling unwell today","A past severe allergic reaction (anaphylaxis) to a vaccine or its ingredients","Weakened immune system or immune-suppressing treatment","Bleeding disorder or taking blood thinners","Fainted after a past needle","Another vaccine in the last 4 weeks"],"t":"m","x":false,"n":true}]},"rsv":{"name":"Respiratory syncytial virus (RSV)","qs":[{"p":"Why are you booking this vaccine?","o":["Age 60 or older","Age 75 or older","Chronic heart or lung disease","Long-term care resident","Pregnant, 32 to 36 weeks","Weakened immune system"],"t":"m","x":true,"n":false},{"p":"What is your RSV vaccine history?","o":["I have never had an RSV vaccine","I have had an RSV vaccine before"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you today?","o":["History of Guillain-Barre syndrome","Fever or feeling unwell today","A past severe allergic reaction (anaphylaxis) to a vaccine or its ingredients","Weakened immune system or immune-suppressing treatment","Bleeding disorder or taking blood thinners","Fainted after a past needle","Another vaccine in the last 4 weeks"],"t":"m","x":false,"n":true}]},"rabies":{"name":"Rabies","qs":[{"p":"Why are you booking this vaccine?","o":["Travelling where rabies is common","Work with animals, wildlife or bats","Laboratory or veterinary work","Caving or outdoor activities with bat exposure","Planning ahead (pre-exposure series)"],"t":"m","x":true,"n":false},{"p":"What is your rabies vaccine history?","o":["No previous rabies vaccine","Started a series but did not finish","Completed a series before"],"t":"m","x":true,"n":false},{"p":"Do any of these apply to you today?","o":["Taking chloroquine or another antimalarial","Travelling within 4 weeks","Fever or feeling unwell today","A past severe allergic reaction (anaphylaxis) to a vaccine or its ingredients","Weakened immune system or immune-suppressing treatment","Bleeding disorder or taking blood thinners","Fainted after a past needle","Another vaccine in the last 4 weeks"],"t":"m","x":false,"n":true}],"w":"If an animal that may have rabies has bitten, scratched or licked broken skin on you, get medical care right away. Do not wait for an appointment."}},"rx":{"new":{"name":"New prescription","steps":[{"title":"Your new prescription","fields":[{"k":"how","t":"radio","l":"How will your prescription reach us?","o":["My doctor has already sent it to Seaway Valley","My doctor will send it electronically","I will bring in a paper prescription","I am not sure, I need help"]},{"k":"pn","t":"text","l":"Prescriber name and clinic","when":"how=My doctor has already sent it to Seaway Valley|My doctor will send it electronically"},{"k":"pp","t":"tel","l":"Clinic phone number","opt":1,"v":"phone","when":"how=My doctor has already sent it to Seaway Valley|My doctor will send it electronically"}]},{"title":"About the medication","fields":[{"k":"med","t":"textarea","l":"Which medication(s) is the prescription for?","ph":"Name and strength, if you know it"},{"k":"first","t":"radio","l":"Have you taken this medication before?","o":["No, this is new for me","Yes, I have taken it before"]},{"k":"comp","t":"radio","l":"Does it need to be compounded (a custom strength, flavour or form)?","o":["No","Yes","Not sure"]}]},{"title":"Allergies and medications","fields":[{"k":"allergy","t":"radio","l":"Do you have any medication allergies?","o":["No known allergies","Yes"]},{"k":"allergyTxt","t":"text","l":"Which medications, and what happens?","when":"allergy=Yes"},{"k":"meds","t":"radio","l":"Are you taking any other medications, vitamins or supplements?","o":["No","Yes"]},{"k":"medsTxt","t":"textarea","l":"List what you take","when":"meds=Yes"}]},{"title":"How would you like to receive it?","fields":[{"k":"ful","t":"radio","l":"Pickup or delivery","o":["Pick up at the pharmacy","Free delivery to my door"]},{"k":"ad","t":"text","l":"Delivery street address","when":"ful=Free delivery to my door"},{"k":"ct","t":"text","l":"City","p":1,"when":"ful=Free delivery to my door"},{"k":"pc","t":"text","l":"Postal code","p":1,"when":"ful=Free delivery to my door"}]},{"title":"Your information","fields":[{"k":"who","t":"radio","l":"Who is this request for?","o":["I am the person receiving the service.","I am filling this out on behalf of someone else."]},{"k":"rn","t":"text","l":"Your name","p":1,"when":"who=I am filling this out on behalf of someone else."},{"k":"rr","t":"text","l":"Your relationship to the patient","p":1,"ph":"For example: parent","when":"who=I am filling this out on behalf of someone else."},{"k":"fn","t":"text","l":"First name","p":1,"ac":"given-name"},{"k":"ln","t":"text","l":"Last name","p":1,"ac":"family-name"},{"k":"dob","t":"date","l":"Date of birth","p":1,"v":"dob"},{"k":"hc","t":"text","l":"Ontario health card number","p":1,"opt":1,"ph":"Leave blank if none"},{"k":"cp","t":"radio","l":"How would you like to be notified about your request?","o":["Text message","Email","Phone call"]},{"k":"ph","t":"tel","l":"Phone number","v":"phone","ac":"tel","ph":"(613) 555-0123","when":"cp=Text message|Phone call"},{"k":"em","t":"email","l":"Email","v":"email","ac":"email","when":"cp=Email"}]},{"title":"Confirm and submit","fields":[{"k":"ack","t":"ack","l":"I confirm that the information provided is accurate and complete to the best of my knowledge, and I consent to Seaway Valley Compounding Pharmacy contacting my prescriber as needed to process this prescription."}],"hint":"Please read and confirm the statement below."}]},"transfer":{"name":"Prescription transfer","steps":[{"title":"Where are your prescriptions now?","fields":[{"k":"op","t":"text","l":"Current pharmacy name"},{"k":"opp","t":"tel","l":"Pharmacy phone number","v":"phone","ac":"off"},{"k":"opc","t":"text","l":"Pharmacy location (street or city)","opt":1}]},{"title":"What would you like to transfer?","fields":[{"k":"which","t":"radio","l":"Which prescriptions?","o":["All of my prescriptions","Only specific prescriptions"]},{"k":"tm","t":"textarea","l":"Medication name(s)","when":"which=Only specific prescriptions"},{"k":"urg","t":"radio","l":"Do you need a medication within the next 3 days?","o":["No rush","Yes, I need one soon"]},{"k":"urgm","t":"text","l":"Which medication?","when":"urg=Yes, I need one soon"}]},{"title":"Allergies and medications","fields":[{"k":"allergy","t":"radio","l":"Do you have any medication allergies?","o":["No known allergies","Yes"]},{"k":"allergyTxt","t":"text","l":"Which medications, and what happens?","when":"allergy=Yes"},{"k":"meds","t":"radio","l":"Are you taking any other medications, vitamins or supplements?","o":["No","Yes"]},{"k":"medsTxt","t":"textarea","l":"List what you take","when":"meds=Yes"}]},{"title":"How would you like to receive it?","fields":[{"k":"ful","t":"radio","l":"Pickup or delivery","o":["Pick up at the pharmacy","Free delivery to my door"]},{"k":"ad","t":"text","l":"Delivery street address","when":"ful=Free delivery to my door"},{"k":"ct","t":"text","l":"City","p":1,"when":"ful=Free delivery to my door"},{"k":"pc","t":"text","l":"Postal code","p":1,"when":"ful=Free delivery to my door"}]},{"title":"Your information","fields":[{"k":"who","t":"radio","l":"Who is this request for?","o":["I am the person receiving the service.","I am filling this out on behalf of someone else."]},{"k":"rn","t":"text","l":"Your name","p":1,"when":"who=I am filling this out on behalf of someone else."},{"k":"rr","t":"text","l":"Your relationship to the patient","p":1,"ph":"For example: parent","when":"who=I am filling this out on behalf of someone else."},{"k":"fn","t":"text","l":"First name","p":1,"ac":"given-name"},{"k":"ln","t":"text","l":"Last name","p":1,"ac":"family-name"},{"k":"dob","t":"date","l":"Date of birth","p":1,"v":"dob"},{"k":"hc","t":"text","l":"Ontario health card number","p":1,"opt":1,"ph":"Leave blank if none"},{"k":"cp","t":"radio","l":"How would you like to be notified about your request?","o":["Text message","Email","Phone call"]},{"k":"ph","t":"tel","l":"Phone number","v":"phone","ac":"tel","ph":"(613) 555-0123","when":"cp=Text message|Phone call"},{"k":"em","t":"email","l":"Email","v":"email","ac":"email","when":"cp=Email"}]},{"title":"Confirm and submit","fields":[{"k":"ack","t":"ack","l":"I authorize Seaway Valley Compounding Pharmacy to contact my current pharmacy to transfer my prescription records. I confirm that the information provided is accurate and complete to the best of my knowledge."}],"hint":"Please read and confirm the statement below."}]},"renewal":{"name":"Prescription renewal","steps":[{"title":"Which prescription needs renewing?","fields":[{"k":"med","t":"textarea","l":"Medication name(s) and strength"},{"k":"rxn","t":"text","l":"Prescription number","opt":1,"ph":"Found on your bottle label"}]},{"title":"Where was it last filled?","fields":[{"k":"where","t":"radio","l":"Last filled at","o":["Seaway Valley Compounding Pharmacy","Another pharmacy"]},{"k":"op","t":"text","l":"Pharmacy name","p":1,"when":"where=Another pharmacy"},{"k":"opp","t":"tel","l":"Pharmacy phone number","p":1,"v":"phone","ac":"off","when":"where=Another pharmacy"}]},{"title":"Why do you need a renewal?","fields":[{"k":"why","t":"check","l":"Reason for renewal","o":["No refills left","The prescription has expired","I am about to run out (less than 7 days left)","I have already run out","I am travelling soon"],"x":1}]},{"title":"A few quick safety questions","fields":[{"k":"flag","t":"check","l":"Do any of these apply to you right now?","o":["My doctor changed or stopped this medication","New or worsening side effects","My condition is not well controlled","I have not seen my prescriber about this in over 12 months","I have missed doses or stopped taking it for a while","It is a controlled substance (for example an opioid, benzodiazepine or stimulant)","I am pregnant or breastfeeding"],"n":1}]},{"title":"Allergies and medications","fields":[{"k":"allergy","t":"radio","l":"Do you have any medication allergies?","o":["No known allergies","Yes"]},{"k":"allergyTxt","t":"text","l":"Which medications, and what happens?","when":"allergy=Yes"},{"k":"meds","t":"radio","l":"Are you taking any other medications, vitamins or supplements?","o":["No","Yes"]},{"k":"medsTxt","t":"textarea","l":"List what you take","when":"meds=Yes"}]},{"title":"How would you like to receive it?","fields":[{"k":"ful","t":"radio","l":"Pickup or delivery","o":["Pick up at the pharmacy","Free delivery to my door"]},{"k":"ad","t":"text","l":"Delivery street address","when":"ful=Free delivery to my door"},{"k":"ct","t":"text","l":"City","p":1,"when":"ful=Free delivery to my door"},{"k":"pc","t":"text","l":"Postal code","p":1,"when":"ful=Free delivery to my door"}]},{"title":"Your information","fields":[{"k":"who","t":"radio","l":"Who is this request for?","o":["I am the person receiving the service.","I am filling this out on behalf of someone else."]},{"k":"rn","t":"text","l":"Your name","p":1,"when":"who=I am filling this out on behalf of someone else."},{"k":"rr","t":"text","l":"Your relationship to the patient","p":1,"ph":"For example: parent","when":"who=I am filling this out on behalf of someone else."},{"k":"fn","t":"text","l":"First name","p":1,"ac":"given-name"},{"k":"ln","t":"text","l":"Last name","p":1,"ac":"family-name"},{"k":"dob","t":"date","l":"Date of birth","p":1,"v":"dob"},{"k":"hc","t":"text","l":"Ontario health card number","p":1,"opt":1,"ph":"Leave blank if none"},{"k":"cp","t":"radio","l":"How would you like to be notified about your request?","o":["Text message","Email","Phone call"]},{"k":"ph","t":"tel","l":"Phone number","v":"phone","ac":"tel","ph":"(613) 555-0123","when":"cp=Text message|Phone call"},{"k":"em","t":"email","l":"Email","v":"email","ac":"email","when":"cp=Email"}]},{"title":"Confirm and submit","fields":[{"k":"ack","t":"ack","l":"I confirm that the information provided is accurate and complete to the best of my knowledge. I understand that a pharmacist will review my request, may need to contact my prescriber, and that a renewal is not guaranteed."}],"hint":"Please read and confirm the statement below."}]}}};

function api(method,url,body){
  if(PREVIEW)return previewApi(method,url,body);
  return fetch(API+url,{method:method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'same-origin'})
    .then(function(r){return r.json().catch(function(){return {}}).then(function(j){if(!r.ok){j.status=r.status;throw j}return j})},
          function(){throw {status:0,message:'We could not reach the pharmacy system. Please check your connection or call (613) 253-3334.'}});
}
function previewApi(method,url,body){
  return new Promise(function(res){setTimeout(function(){
    if(url.indexOf('/api/slots')===0){
      var days=[],d=new Date();
      for(var i=1;days.length<12;i++){
        var x=new Date(d.getFullYear(),d.getMonth(),d.getDate()+i);if(x.getDay()===0)continue;
        var iso=x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2),t=[];
        for(var m=(x.getDay()===6?600:540);m<(x.getDay()===6?900:1080);m+=15)if((m/15+i)%3)t.push(('0'+Math.floor(m/60)).slice(-2)+':'+('0'+m%60).slice(-2));
        days.push({date:iso,times:t});
      }
      res({days:days});
    }else res({ok:true,ref:'PREVIEW',date:body.slot&&body.slot.date,time:body.slot&&body.slot.time});
  },450)});
}

var DUR=['Less than 2 days','2 to 7 days','1 to 2 weeks','2 to 4 weeks','More than 4 weeks','It comes and goes'];
var CONDS=['Diabetes','High blood pressure','Heart disease','Kidney disease','Liver disease','Asthma or COPD','Weakened immune system'];
var PREG=['No','Pregnant','Breastfeeding','Trying to conceive','Not sure'];
var NOTIFY=['Text message','Email','Phone call'];
var PCP_YES='I have a family doctor or nurse practitioner';
var PCP_NO="I don't have a primary care provider";
var T1='I confirm that all the information provided is accurate and complete to the best of my knowledge. While this registration does not guarantee a prescription treatment, a pharmacist will review my information and determine if it is appropriate to prescribe a treatment or if a referral is necessary. If a prescription is provided, I understand that I have the option to fill it at any pharmacy of my choosing.';
var T2='I give my consent to receive pharmacist services, which may include an assessment and treatment related to the requested or recommended service. This includes the initiation of medication therapy, as well as any necessary assessments or referrals, as deemed necessary by the pharmacist, in accordance with applicable laws and regulations. I understand that personal health information may be collected, used, and disclosed by my pharmacy as necessary for the purposes of providing these services. This may include sharing my information with other healthcare providers as needed for continuity of care.';
var W1='I am the person receiving the service.';
var W2='I am filling this out on behalf of someone else.';

function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function digits(v){return String(v||'').replace(/\D/g,'')}
function todayISO(){var d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,10)}
function opt(type,name,val,label,on,ex,cls){
  return '<label class="opt'+(cls?' '+cls:'')+'"><input type="'+type+'" name="'+name+'" value="'+esc(val)+'"'+(on?' checked':'')+(ex?' data-ex="1"':'')+'><span>'+esc(label)+'</span></label>';
}
function radios(name,list,cur){return '<div class="opts">'+list.map(function(o){return opt('radio',name,o,o,cur===o)}).join('')+'</div>'}
function otherInput(name,a,on){return '<input class="oth" type="text" name="'+name+'o" placeholder="Please describe" aria-label="Please describe"'+(on?'':' hidden')+' value="'+esc(a[name+'o']||'')+'">'}
var KIND='';
function fid(k){return 'f-'+KIND+'-'+k}
function fld(a,label,name,o){
  o=o||{};
  return '<div class="fld"><label for="'+fid(name)+'">'+label+(o.opt?' <small>(optional)</small>':'')+'</label><input id="'+fid(name)+'" name="'+name+'" type="'+(o.type||'text')+'"'
    +(o.ac?' autocomplete="'+o.ac+'"':'')+(o.im?' inputmode="'+o.im+'"':'')+(o.min?' min="'+o.min+'"':'')+(o.max?' max="'+o.max+'"':'')
    +(o.ph?' placeholder="'+esc(o.ph)+'"':'')+' value="'+esc(a[name]||'')+'"></div>';
}

/* ---------- steps ---------- */
function buildSteps(s){
  if(s.kind==='rx')return s.svc.steps.map(function(_,i){return 'g'+i});
  var st=['visit','sex'];
  s.svc.qs.forEach(function(q,i){st.push('q'+i)});
  if(s.kind==='ailment')st.push('dur');
  st.push('meds','conds','pcp','consent','info');
  return st;
}
function showPreg(s){return s.a.sex==='Female'&&s.id!=='nausea'}

function stepHtml(s,id){
  var a=s.a,svc=s.svc,h;KIND=s.kind;
  if(id.charAt(0)==='g')return gHtml(s,svc.steps[+id.slice(1)]);
  if(id==='visit'){
    return '<fieldset class="fs"><legend tabindex="-1">Would you like the appointment to be in person or by phone call?</legend><p class="hint">Select one</p>'
      +radios('visit',['In person','Phone call'],a.visit)
      +'<div class="fld" data-when="visit=Phone call" hidden style="margin-top:14px"><label for="'+fid('phone')+'">What phone number should we call?</label><input id="'+fid('phone')+'" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(613) 555-0123" value="'+esc(a.phone||'')+'"></div></fieldset>';
  }
  if(id==='sex'){
    return '<fieldset class="fs"><legend tabindex="-1">What sex were you assigned at birth?</legend><p class="hint">Select one</p>'+radios('sex',['Male','Female'],a.sex)
      +(svc.f?'<p class="note" data-when="sex=Male" hidden>This service is usually for patients assigned female at birth. You can continue and your pharmacist will review your request.</p>':'')+'</fieldset>';
  }
  if(id.charAt(0)==='q'){
    var i=+id.slice(1),q=svc.qs[i],key=id,cur=a[key]||[],t=q.t==='s'?'radio':'checkbox',on=cur.indexOf('Other')>-1;
    h='<fieldset class="fs"><legend tabindex="-1">'+esc(q.p)+'</legend><p class="hint">'+(q.t==='s'?'Select one':'Select all that apply')+'</p><div class="opts">';
    q.o.forEach(function(o){h+=opt(t,key,o,o,cur.indexOf(o)>-1)});
    if(q.x){h+=opt(t,key,'Other','Other',on)+otherInput(key,a,on)+opt(t,key,'Not sure','Not sure',cur.indexOf('Not sure')>-1,true)}
    if(q.n){h+=opt(t,key,'None of these','None of these',cur.indexOf('None of these')>-1,true)}
    return h+'</div></fieldset>';
  }
  if(id==='dur'){
    return '<fieldset class="fs"><legend tabindex="-1">How long have you had this problem?</legend><p class="hint">Select one</p>'+radios('dur',DUR,a.dur)+'</fieldset>'
      +'<div class="fld"><label for="'+fid('tried')+'">What have you already tried? <small>(optional)</small></label><textarea id="'+fid('tried')+'" name="tried" placeholder="Creams, medications, home care">'+esc(a.tried||'')+'</textarea></div>';
  }
  if(id==='meds'){
    return '<fieldset class="fs"><legend tabindex="-1">Allergies and medications</legend><p class="hint">Do you have any medication allergies?</p>'+radios('allergy',['No known allergies','Yes'],a.allergy)
      +'<div class="fld" data-when="allergy=Yes" hidden style="margin-top:12px"><label for="'+fid('al')+'">Which medications, and what happens?</label><input id="'+fid('al')+'" name="allergyTxt" value="'+esc(a.allergyTxt||'')+'"></div>'
      +'<p class="hint" style="margin-top:22px">Are you taking any medications, vitamins or supplements?</p>'+radios('meds',['No','Yes'],a.meds)
      +'<div class="fld" data-when="meds=Yes" hidden style="margin-top:12px"><label for="'+fid('md')+'">List what you take</label><textarea id="'+fid('md')+'" name="medsTxt">'+esc(a.medsTxt||'')+'</textarea></div></fieldset>';
  }
  if(id==='conds'){
    var c=a.conds||[],con=c.indexOf('Other')>-1;
    h='<fieldset class="fs"><legend tabindex="-1">Do you have any of these health conditions?</legend><p class="hint">Select all that apply</p><div class="opts">';
    CONDS.forEach(function(o){h+=opt('checkbox','conds',o,o,c.indexOf(o)>-1)});
    h+=opt('checkbox','conds','Other','Other',con)+otherInput('conds',a,con)+opt('checkbox','conds','None of these','None of these',c.indexOf('None of these')>-1,true)+'</div></fieldset>';
    if(showPreg(s))h+='<fieldset class="fs"><legend class="sm">Are you pregnant or breastfeeding?</legend><p class="hint">Select one</p>'+radios('preg',PREG,a.preg)+'</fieldset>';
    return h;
  }
  if(id==='pcp'){
    return '<fieldset class="fs"><legend tabindex="-1">Who is your primary care provider?</legend><p class="hint">Select one</p>'+radios('pcp',[PCP_YES,PCP_NO],a.pcp)
      +'<div class="fld" data-when="pcp='+esc(PCP_YES)+'" hidden style="margin-top:12px"><label for="'+fid('pcpn')+'">Provider name and clinic</label><input id="'+fid('pcpn')+'" name="pcpName" value="'+esc(a.pcpName||'')+'"></div></fieldset>';
  }
  if(id==='consent'){
    return '<fieldset class="fs"><legend tabindex="-1">Terms and consent</legend><p class="hint">Please read and confirm both statements.</p><div class="opts">'
      +'<label class="opt long"><input type="checkbox" name="c1"'+(a.c1?' checked':'')+'><span>'+esc(T1)+'</span></label>'
      +'<label class="opt long"><input type="checkbox" name="c2"'+(a.c2?' checked':'')+'><span>'+esc(T2)+'</span></label></div></fieldset>'
      +'<fieldset class="fs"><legend class="sm">Who is this request for?</legend><p class="hint">Select one</p>'+radios('who',[W1,W2],a.who)+'</fieldset>';
  }
  if(id==='info'){
    var b=a.who===W2,p=b?"Patient's ":'';
    h='<h3 class="sub" tabindex="-1">'+(b?'Your details':'Your information')+'</h3>';
    if(b)h+='<div class="row2">'+fld(a,'Your name','rn',{ac:'name'})+fld(a,'Your relationship to the patient','rr',{ph:'For example: parent'})+'</div><h3 class="sub" style="margin-top:12px">Patient details</h3>';
    h+='<div class="row2">'+fld(a,p+'First name','fn',{ac:b?'off':'given-name'})+fld(a,p+'Last name','ln',{ac:b?'off':'family-name'})+'</div>';
    h+='<div class="row2">'+fld(a,p+'Date of birth','dob',{type:'date',max:todayISO()})+fld(a,p+'Ontario health card number','hc',{opt:1,im:'text',ph:'Leave blank if none'})+'</div>';
    h+='<fieldset class="fs" style="margin-top:6px"><legend class="sm">How would you like to be notified about your booking?</legend><p class="hint">Select one</p>'+radios('nt',NOTIFY,a.nt)
      +'<div class="row2" style="margin-top:12px"><div data-when="nt=Text message|Phone call" hidden>'+fld(a,(b?'Contact phone':'Phone number'),'ph',{type:'tel',ac:'tel',im:'tel',ph:'(613) 555-0123'})+'</div><div data-when="nt=Email" hidden>'+fld(a,(b?'Contact email':'Email'),'em',{type:'email',ac:'email',im:'email'})+'</div></div></fieldset>';
    h+='<h3 class="sub" style="margin-top:22px">Choose your appointment time</h3><div class="slotpick" aria-live="polite"></div>';
    return h;
  }
  return '';
}

/* ---------- generic steps (prescription forms) ---------- */
function whenOk(a,w){if(!w)return true;var i=w.indexOf('='),k=w.slice(0,i),vs=w.slice(i+1).split('|');return vs.indexOf(a[k])>-1}
function gField(s,f){
  var a=s.a,k=f.k,w=f.when?' data-when="'+esc(f.when)+'" hidden':'';
  if(f.t==='radio'||f.t==='check'){
    var chk=f.t==='check',cur=chk?(a[k]||[]):a[k],ty=chk?'checkbox':'radio';
    var h='<div class="gq"'+w+'><p class="ql">'+esc(f.l)+(f.opt?' <small>(optional)</small>':'')+'</p>'+(chk?'<p class="hint">Select all that apply</p>':'')+'<div class="opts">';
    f.o.forEach(function(o){h+=opt(ty,k,o,o,chk?cur.indexOf(o)>-1:cur===o)});
    if(f.x){var on=cur.indexOf('Other')>-1;h+=opt(ty,k,'Other','Other',on)+otherInput(k,a,on)+opt(ty,k,'Not sure','Not sure',cur.indexOf('Not sure')>-1,true)}
    if(f.n)h+=opt(ty,k,'None of these','None of these',cur.indexOf('None of these')>-1,true);
    return h+'</div></div>';
  }
  if(f.t==='ack')return '<label class="opt long"><input type="checkbox" name="'+k+'"'+(a[k]?' checked':'')+'><span>'+esc(f.l)+'</span></label>';
  var lab='<label for="'+fid(k)+'">'+esc(f.l)+(f.opt?' <small>(optional)</small>':'')+'</label>',val=esc(a[k]||''),ph=f.ph?' placeholder="'+esc(f.ph)+'"':'',ac=f.ac?' autocomplete="'+f.ac+'"':'';
  if(f.t==='textarea')return '<div class="fld"'+w+'>'+lab+'<textarea id="'+fid(k)+'" name="'+k+'"'+ph+'>'+val+'</textarea></div>';
  return '<div class="fld"'+w+'>'+lab+'<input id="'+fid(k)+'" name="'+k+'" type="'+f.t+'"'+ph+ac+(f.t==='tel'?' inputmode="tel"':'')+(f.t==='email'?' inputmode="email"':'')+(f.v==='dob'?' max="'+todayISO()+'"':'')+' value="'+val+'"></div>';
}
function gHtml(s,st){
  var h='<fieldset class="fs"><legend tabindex="-1">'+esc(st.title)+'</legend>'+(st.hint?'<p class="hint">'+esc(st.hint)+'</p>':''),F=st.fields,i=0;
  while(i<F.length){
    if(F[i].p){var row='';while(i<F.length&&F[i].p){row+=gField(s,F[i]);i++}h+='<div class="row2">'+row+'</div>'}
    else{h+=gField(s,F[i]);i++}
  }
  return h+'</fieldset>';
}
function gRead(box,s,st){
  var a=s.a;
  st.fields.forEach(function(f){
    var k=f.k;
    if(f.t==='radio'){if(box.querySelector('input[name="'+k+'"]'))a[k]=one(box,k)}
    else if(f.t==='check'){if(box.querySelector('input[name="'+k+'"]')){a[k]=checked(box,k);a[k+'o']=val(box,k+'o')}}
    else if(f.t==='ack'){var e=box.querySelector('[name="'+k+'"]');if(e)a[k]=e.checked}
    else{var el=box.querySelector('[name="'+k+'"]');if(el)a[k]=el.value.trim()}
  });
}
function gCheck(s,st){
  var a=s.a;
  for(var i=0;i<st.fields.length;i++){
    var f=st.fields[i],v=a[f.k];
    if(!whenOk(a,f.when))continue;
    if(f.t==='ack'){if(!v)return 'Please confirm the statement to continue.';continue}
    if(f.t==='radio'){if(!v)return 'Please answer: '+f.l;continue}
    if(f.t==='check'){
      if(f.opt)continue;
      if(!(v&&v.length))return 'Please select at least one answer for: '+f.l;
      if(v.indexOf('Other')>-1&&!a[f.k+'o'])return 'Please describe your other answer.';
      continue;
    }
    if(!v){if(f.opt)continue;return 'Please complete: '+f.l}
    if(f.v==='phone'&&digits(v).length<10)return 'Please enter a phone number with the area code.';
    if(f.v==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))return 'Please enter a valid email address.';
    if(f.v==='dob'&&v>todayISO())return 'Date of birth cannot be in the future.';
  }
  return '';
}
function rxPayload(s){
  var a=s.a,out=[];
  s.svc.steps.forEach(function(st){st.fields.forEach(function(f){
    if(f.t==='ack'){out.push({question:f.l,answer:!!a[f.k]});return}
    if(!whenOk(a,f.when))return;
    var v=a[f.k];
    if(f.t==='check'){v=(v||[]).slice();var i=v.indexOf('Other');if(i>-1&&a[f.k+'o'])v[i]='Other: '+a[f.k+'o']}
    if(v==null||v===''||(Array.isArray(v)&&!v.length))return;
    out.push({key:f.k,question:f.l,answer:v});
  })});
  return {submittedAt:new Date().toISOString(),requestType:'prescription',service:{id:s.id,name:s.svc.name},answers:out,
    patient:{firstName:a.fn,lastName:a.ln,dateOfBirth:a.dob,healthCardNumber:a.hc||null,email:a.em,phone:a.ph,preferredContact:a.cp},
    completedFor:a.who===W2?'someone-else':'self',requester:a.who===W2?{name:a.rn,relationship:a.rr}:null,
    fulfilment:a.ful||null,delivery:a.ful?{street:a.ad||null,city:a.ct||null,postalCode:a.pc||null}:null};
}

/* ---------- read + validate ---------- */
function qa(box){return function(sel){return box.querySelectorAll(sel)}}
function checked(box,n){return [].map.call(box.querySelectorAll('input[name="'+n+'"]:checked'),function(x){return x.value})}
function one(box,n){return checked(box,n)[0]||''}
function val(box,n){var e=box.querySelector('[name="'+n+'"]');return e?e.value.trim():''}
function read(box){
  var s=box._s,a=s.a,id=s.steps[s.step];
  if(id.charAt(0)==='g'){gRead(box,s,s.svc.steps[+id.slice(1)]);return}
  if(id==='visit'){a.visit=one(box,'visit');a.phone=val(box,'phone')}
  else if(id==='sex'){a.sex=one(box,'sex')}
  else if(id.charAt(0)==='q'){a[id]=checked(box,id);a[id+'o']=val(box,id+'o')}
  else if(id==='dur'){a.dur=one(box,'dur');a.tried=val(box,'tried')}
  else if(id==='meds'){a.allergy=one(box,'allergy');a.allergyTxt=val(box,'allergyTxt');a.meds=one(box,'meds');a.medsTxt=val(box,'medsTxt')}
  else if(id==='conds'){a.conds=checked(box,'conds');a.condso=val(box,'condso');a.preg=one(box,'preg')}
  else if(id==='pcp'){a.pcp=one(box,'pcp');a.pcpName=val(box,'pcpName')}
  else if(id==='consent'){a.c1=box.querySelector('[name=c1]').checked;a.c2=box.querySelector('[name=c2]').checked;a.who=one(box,'who')}
  else if(id==='info'){['rn','rr','fn','ln','dob','hc','em','ph'].forEach(function(k){a[k]=val(box,k)});a.nt=one(box,'nt')}
}
function check(s){
  var a=s.a,id=s.steps[s.step],svc=s.svc;
  if(id.charAt(0)==='g')return gCheck(s,svc.steps[+id.slice(1)]);
  if(id==='visit'){
    if(!a.visit)return 'Please choose in person or phone call.';
    if(a.visit==='Phone call'&&digits(a.phone).length<10)return 'Please enter a phone number we can call, including the area code.';
  }else if(id==='sex'){if(!a.sex)return 'Please select one answer.'}
  else if(id.charAt(0)==='q'){
    var q=svc.qs[+id.slice(1)],v=a[id]||[];
    if(!v.length)return q.t==='s'?'Please select one answer.':'Please select at least one answer.';
    if(v.indexOf('Other')>-1&&!a[id+'o'])return 'Please describe your other answer.';
  }else if(id==='dur'){if(!a.dur)return 'Please select how long you have had this problem.'}
  else if(id==='meds'){
    if(!a.allergy)return 'Please tell us about medication allergies.';
    if(a.allergy==='Yes'&&!a.allergyTxt)return 'Please tell us which medications you are allergic to.';
    if(!a.meds)return 'Please tell us whether you take any medications.';
    if(a.meds==='Yes'&&!a.medsTxt)return 'Please list what you take.';
  }else if(id==='conds'){
    var c=a.conds||[];
    if(!c.length)return 'Please select at least one answer, or "None of these".';
    if(c.indexOf('Other')>-1&&!a.condso)return 'Please describe your other condition.';
    if(showPreg(s)&&!a.preg)return 'Please answer the pregnancy question.';
  }else if(id==='pcp'){
    if(!a.pcp)return 'Please select one answer.';
    if(a.pcp===PCP_YES&&!a.pcpName)return 'Please tell us your provider\'s name.';
  }else if(id==='consent'){
    if(!a.c1||!a.c2)return 'Please confirm both statements to continue.';
    if(!a.who)return 'Please tell us who this request is for.';
  }else if(id==='info'){
    var b=a.who===W2;
    if(b&&(!a.rn||!a.rr))return 'Please add your name and your relationship to the patient.';
    if(!a.fn||!a.ln)return 'Please enter a first and last name.';
    if(!a.dob)return 'Please enter a date of birth.';
    if(a.dob>todayISO())return 'Date of birth cannot be in the future.';
    if(!a.nt)return 'Please choose how you would like to be notified.';
    if(a.nt==='Email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(a.em))return 'Please enter a valid email address.';
    if(a.nt!=='Email'&&digits(a.ph).length<10)return 'Please enter a phone number with the area code.';
    if(!s.slot)return 'Please choose an available appointment date and time.';
  }
  return '';
}

/* ---------- render ---------- */
function syncWhen(box){
  box.querySelectorAll('[data-when]').forEach(function(el){
    var w=el.getAttribute('data-when'),i=w.indexOf('='),n=w.slice(0,i),v=w.slice(i+1);
    var c=box.querySelector('input[name="'+n+'"]:checked');
    el.hidden=!(c&&v.split('|').indexOf(c.value)>-1);
  });
}
function render(box,keepScroll){
  var s=box._s,id=s.steps[s.step],n=s.steps.length,last=s.step===n-1;
  var h='<div class="bk-top"><button type="button" class="bk-x" data-act="all">&larr; '+({ailment:'All conditions',vaccine:'All vaccines',rx:'All prescription options'})[s.kind]+'</button>'
    +'<div class="bk-ttl"><span class="bk-ic">'+s.icon+'</span><div><b>'+esc(s.svc.name)+'</b><small>'+({ailment:'Minor ailment appointment',vaccine:'Vaccination appointment',rx:'Prescription request'})[s.kind]+'</small></div></div></div>'
    +'<div class="bk-prog"><span>Step '+(s.step+1)+' of '+n+'</span><div class="bar" role="presentation"><i style="width:'+Math.round((s.step+1)/n*100)+'%"></i></div></div>'
    +'<form class="bk-step" novalidate onsubmit="return false">'+stepHtml(s,id)+'<p class="err" role="alert" hidden></p>'
    +'<div class="bk-nav">'+(s.step>0?'<button type="button" class="btn sec" data-act="back">Back</button>':'<span></span>')
    +'<button type="button" class="btn pri" data-act="next">'+(last?'Submit request':'Next')+'</button></div></form>'
    +(s.svc.w&&s.step===0?'<p class="bk-warn">'+esc(s.svc.w)+'</p>':'')
    +'<p class="bk-911">In an emergency, such as trouble breathing, chest pain or a severe allergic reaction, call 911.</p>';
  box.innerHTML=h;
  syncWhen(box);
  var f=box.querySelector('[tabindex="-1"]');
  if(f)f.focus({preventScroll:true});
  if(id==='info'&&s.kind!=='rx')loadSlots(box);
  if(!keepScroll){
    var r=box.getBoundingClientRect();
    if(r.top<70||r.top>window.innerHeight*.5)box.scrollIntoView({behavior:'smooth',block:'start'});
  }
}
function showErr(box,msg){var e=box.querySelector('.err');e.textContent=msg;e.hidden=false;e.scrollIntoView({block:'nearest',behavior:'smooth'})}

function start(bkb,id){
  var kind=bkb.getAttribute('data-kind'),svc=DATA[kind][id];
  var box=bkb.querySelector('.bk-form'),pick=bkb.querySelector('.bk-pick'),btn=pick.querySelector('[data-id="'+id+'"]');
  var s={kind:kind,id:id,svc:svc,icon:btn?btn.querySelector('.bk-ic').innerHTML:'',a:{},step:0,steps:[]};
  s.steps=buildSteps(s);
  box._s=s;pick.hidden=true;box.hidden=false;render(box);
}
function exit(box){
  var bkb=box.closest('.bkb');box._s=null;box.innerHTML='';box.hidden=true;bkb.querySelector('.bk-pick').hidden=false;
  bkb.scrollIntoView({behavior:'smooth',block:'start'});
}
function go(box,dir){
  var s=box._s;read(box);
  if(dir>0){var e=check(s);if(e){showErr(box,e);return}}
  if(dir>0&&s.step===s.steps.length-1){submit(box);return}
  s.step=Math.max(0,s.step+dir);render(box);
}

/* ---------- submit ---------- */
function payload(s){
  var a=s.a,b=a.who===W2,sel=[];
  s.svc.qs.forEach(function(q,i){
    var v=(a['q'+i]||[]).slice(),k=v.indexOf('Other');
    if(k>-1&&a['q'+i+'o'])v[k]='Other: '+a['q'+i+'o'];
    sel.push({question:q.p,selected:v});
  });
  var conds=(a.conds||[]).slice(),k=conds.indexOf('Other');
  if(k>-1&&a.condso)conds[k]='Other: '+a.condso;
  return {
    submittedAt:new Date().toISOString(),
    appointmentType:s.kind==='ailment'?'minor-ailment':'vaccination',
    service:{id:s.id,name:s.svc.name},
    visit:a.visit,
    callbackPhone:a.visit==='Phone call'?a.phone:null,
    sexAssignedAtBirth:a.sex,
    assessment:sel,
    duration:a.dur||null,
    alreadyTried:a.tried||null,
    allergies:a.allergy==='Yes'?a.allergyTxt:'None known',
    medications:a.meds==='Yes'?a.medsTxt:'None',
    conditions:conds,
    pregnancyStatus:showPreg(s)?a.preg:null,
    primaryCareProvider:a.pcp===PCP_YES?a.pcpName:'None',
    consent:{informationAccurate:!!a.c1,pharmacistServices:!!a.c2,completedFor:b?'someone-else':'self'},
    requester:b?{name:a.rn,relationship:a.rr}:null,
    patient:{firstName:a.fn,lastName:a.ln,dateOfBirth:a.dob,healthCardNumber:a.hc||null,email:a.em,phone:a.ph,address:{street:a.ad||null,city:a.ct||null,postalCode:a.pc||null}},
    preferred:{date:a.pd,time:a.pt||'No preference'}
  };
}
/* ---------- appointment time picker ---------- */
function t12(t){var h=+t.slice(0,2),m=t.slice(3);return ((h+11)%12+1)+':'+m+' '+(h<12?'AM':'PM')}
function dLong(iso){return new Date(iso+'T12:00:00').toLocaleDateString('en-CA',{weekday:'long',month:'long',day:'numeric'})}
function loadSlots(box){
  var s=box._s;s.slotState=s.avail?'ok':'loading';drawSlots(box);
  api('GET','/api/slots').then(function(r){
    if(box._s!==s)return;
    s.avail=r.days||[];s.slotState='ok';
    if(s.slot){var d=s.avail.filter(function(x){return x.date===s.slot.date})[0];if(!d||d.times.indexOf(s.slot.time)<0){s.slot=null;s.slotNote='The time you chose was just taken. Please choose another.'}}
    drawSlots(box);
  },function(e){if(box._s!==s)return;s.slotState='err';s.slotErr=(e&&e.message)||'';drawSlots(box)});
}
function drawSlots(box){
  var s=box._s,el=box.querySelector('.slotpick');if(!el)return;var h='';
  if(s.slotState==='loading'){h='<p class="hint">Checking available times...</p>'}
  else if(s.slotState==='err'){h='<p class="err" role="alert">We could not load appointment times. '+esc(s.slotErr||'Please try again, or call (613) 253-3334.')+'</p><button type="button" class="btn sec" data-act="sp-retry">Try again</button>'}
  else if(!s.avail.length){h='<p class="note">There are no online appointment times open right now. Please call us at <a href="tel:+16132533334">(613) 253-3334</a> and we will book you in.</p>'}
  else{
    var days=s.showAll?s.avail:s.avail.slice(0,8),cur=s.slotDay||(s.slot&&s.slot.date);
    if(!cur||!s.avail.some(function(x){return x.date===cur}))cur=null;
    h+=(s.slotNote?'<p class="note" role="alert">'+esc(s.slotNote)+'</p>':'')+'<p class="hint">Pick a day, then a time. Only open times are shown.</p><div class="sp-days" role="group" aria-label="Appointment date">';
    days.forEach(function(d){
      var x=new Date(d.date+'T12:00:00'),on=cur===d.date;
      h+='<button type="button" class="sp-d'+(on?' on':'')+'" data-act="sp-day" data-date="'+d.date+'" aria-pressed="'+on+'"><b>'+x.toLocaleDateString('en-CA',{weekday:'short'})+'</b><span>'+x.toLocaleDateString('en-CA',{month:'short',day:'numeric'})+'</span><small>'+d.times.length+' open</small></button>';
    });
    h+='</div>';
    if(!s.showAll&&s.avail.length>8)h+='<button type="button" class="sp-more" data-act="sp-more">Show more dates</button>';
    var sel=cur&&s.avail.filter(function(d){return d.date===cur})[0];
    if(sel){
      h+='<p class="ql" style="margin-top:18px">Times on '+esc(dLong(cur))+'</p><div class="sp-times" role="group" aria-label="Appointment time">';
      sel.times.forEach(function(t){var on=s.slot&&s.slot.date===cur&&s.slot.time===t;h+='<button type="button" class="sp-t'+(on?' on':'')+'" data-act="sp-time" data-time="'+t+'" aria-pressed="'+on+'">'+t12(t)+'</button>'});
      h+='</div>';
    }
    h+='<p class="sp-sel">'+(s.slot&&sel?'Your time: <b>'+esc(dLong(s.slot.date))+' at '+t12(s.slot.time)+'</b>':'No time chosen yet.')+'</p>';
  }
  el.innerHTML=h;
}
function slotClick(box,t){
  var s=box._s,act=t.getAttribute('data-act');
  if(act==='sp-day'){s.slotNote='';s.slotDay=t.getAttribute('data-date');s.slot=null}
  else if(act==='sp-time'){s.slotNote='';s.slot={date:s.slotDay,time:t.getAttribute('data-time')}}
  else if(act==='sp-more'){s.showAll=true}
  else if(act==='sp-retry'){s.avail=null;loadSlots(box);return}
  var er=box.querySelector('.err');if(er&&!er.closest('.slotpick'))er.hidden=true;
  drawSlots(box);
}

/* ---------- build the fax content: every answer, exactly as the patient saw it ---------- */
function optList(base,sel,other,x,none){
  var o=base.map(function(b){return {t:b,on:sel.indexOf(b)>-1}});
  if(x){var on=sel.indexOf('Other')>-1;o.push({t:'Other'+(on&&other?': '+other:''),on:on});o.push({t:'Not sure',on:sel.indexOf('Not sure')>-1})}
  if(none)o.push({t:'None of these',on:sel.indexOf('None of these')>-1});
  return o;
}
function faxSections(s){
  var a=s.a,svc=s.svc,secs=[],b=a.who===W2;
  function R(q,v){return {q:q,a:v==null?'':String(v)}}
  if(s.kind==='rx'){
    svc.steps.forEach(function(st){
      var rows=[];
      st.fields.forEach(function(f){
        if(f.t==='ack'){rows.push({consent:f.l,on:!!a[f.k]});return}
        if(!whenOk(a,f.when))return;
        var v=a[f.k];
        if(f.t==='radio')rows.push({q:f.l,opts:optList(f.o,v?[v]:[],'',false,false)});
        else if(f.t==='check')rows.push({q:f.l,opts:optList(f.o,v||[],a[f.k+'o'],f.x,f.n)});
        else rows.push(R(f.l,v));
      });
      secs.push({h:st.title,rows:rows});
    });
    return secs;
  }
  var visit=[R('Appointment format (patient choice)',a.visit)];
  if(a.visit==='Phone call')visit.push(R('Phone number to call',a.phone));
  secs.push({h:'Appointment format',rows:visit});
  secs.push({h:'About the patient',rows:[R('Sex assigned at birth',a.sex)]});
  secs.push({h:(s.kind==='ailment'?'Assessment: ':'Screening: ')+svc.name,rows:svc.qs.map(function(q,i){
    return {q:q.p,opts:optList(q.o,a['q'+i]||[],a['q'+i+'o'],q.x,q.n)};
  })});
  if(s.kind==='ailment')secs.push({h:'Duration and what has been tried',rows:[{q:'How long have you had this problem?',opts:optList(DUR,a.dur?[a.dur]:[],'',false,false)},R('What have you already tried?',a.tried)]});
  secs.push({h:'Allergies and medications',rows:[R('Medication allergies?',a.allergy==='Yes'?'Yes: '+a.allergyTxt:a.allergy),R('Taking any medications, vitamins or supplements?',a.meds==='Yes'?'Yes: '+a.medsTxt:a.meds)]});
  var hc=[{q:'Do you have any of these health conditions?',opts:optList(CONDS,a.conds||[],a.condso,true,true).filter(function(o){return o.t!=='Not sure'})}];
  if(showPreg(s))hc.push({q:'Are you pregnant or breastfeeding?',opts:optList(PREG,a.preg?[a.preg]:[],'',false,false)});
  secs.push({h:'Health conditions',rows:hc});
  secs.push({h:'Primary care provider',rows:[{q:'Who is your primary care provider?',opts:[{t:PCP_YES+(a.pcp===PCP_YES&&a.pcpName?': '+a.pcpName:''),on:a.pcp===PCP_YES},{t:PCP_NO,on:a.pcp===PCP_NO}]}]});
  secs.push({h:'Terms and consent',rows:[{consent:T1,on:!!a.c1},{consent:T2,on:!!a.c2},{q:'Who is this request for?',opts:[{t:W1,on:a.who===W1},{t:W2,on:a.who===W2}]}]});
  var pi=[];
  if(b){pi.push(R('Form completed by',a.rn));pi.push(R('Relationship to the patient',a.rr))}
  pi.push(R(b?"Patient's name":'Patient name',a.fn+' '+a.ln),R('Date of birth',a.dob),R('Ontario health card number',a.hc||'(none given)'));
  secs.push({h:'Patient information',rows:pi});
  secs.push({h:'How to notify the patient of the booking',rows:[{q:'Patient chose to be notified by',opts:optList(NOTIFY,a.nt?[a.nt]:[],'',false,false)},R(a.nt==='Email'?'Email address':'Phone number',a.nt==='Email'?a.em:a.ph)]});
  return secs;
}

/* ---------- submit ---------- */
function submit(box){
  var s=box._s,btn=box.querySelector('[data-act=next]');btn.disabled=true;btn.textContent='Sending...';
  var body={kind:s.kind,svcId:s.id,service:s.svc.name,sections:faxSections(s),slot:s.kind==='rx'?null:s.slot,website:''};
  api('POST','/api/submit',body).then(function(r){done(box,r)},function(e){
    btn.disabled=false;btn.textContent='Submit request';
    if(e&&e.status===409){s.slot=null;s.slotDay=null;s.slotNote='That time was just booked by someone else. Please choose another.';loadSlots(box)}
    showErr(box,(e&&e.message)||'Something went wrong. Please try again or call the pharmacy at (613) 253-3334.');
  });
}
function done(box,r){
  var s=box._s,rx=s.kind==='rx',a=s.a,rows,msg;
  if(rx){
    msg='Thank you, your request has been sent to the pharmacy. We will contact you shortly with confirmation of your '+esc(s.svc.name.toLowerCase().replace(/^prescription /,'prescription '))+'.';
    rows='<li><span>Request</span><span>'+esc(s.svc.name)+'</span></li>'+(a.ful?'<li><span>Receive</span><span>'+esc(a.ful)+'</span></li>':'')+(a.cp?'<li><span>We will contact you by</span><span>'+esc(a.cp)+'</span></li>':'');
  }else{
    msg='Thank you, your request has been sent to the pharmacy. We will contact you shortly with confirmation of your appointment.';
    rows='<li><span>Service</span><span>'+esc(s.svc.name)+'</span></li>'+(a.nt?'<li><span>We will contact you by</span><span>'+esc(a.nt)+'</span></li>':'')+'<li><span>Visit</span><span>'+esc(a.visit)+'</span></li><li><span>Requested time</span><span>'+esc(dLong(r.date)+' at '+t12(r.time))+'</span></li>';
  }
  rows+='<li><span>Reference</span><span>'+esc(r.ref||'')+'</span></li>';
  box.innerHTML='<div class="done"><span class="bk-ic">'+s.icon+'</span><h3>Thank you, '+esc(a.fn)+'.</h3><p>'+msg+'</p><ul>'+rows+'</ul>'
    +(rx?'':'<p class="hint" style="margin-top:14px">Need to change your time? Call (613) 253-3334 and tell us your reference.</p>')
    +(PREVIEW?'<p class="demo">Preview only: this page is not connected to the pharmacy system, so nothing was sent.</p>':'')
    +'<button type="button" class="btn pri" data-act="all">'+(rx?'Make another request':'Book another appointment')+'</button>'
    +'<p class="bk-911">In an emergency, such as trouble breathing, chest pain or a severe allergic reaction, call 911.</p></div>';
  box.scrollIntoView({behavior:'smooth',block:'start'});
}

/* ---------- events ---------- */
function wire(root){
  root.addEventListener('click',function(e){
    var t=e.target.closest('[data-id],[data-act]');
    if(!t||!root.contains(t))return;
    if(t.hasAttribute('data-id')){
      if(t.getAttribute('data-id')==='refill'){var rf=document.getElementById('refill');if(rf){rf.scrollIntoView({behavior:'smooth',block:'start'});var f0=document.getElementById('rx');if(f0)setTimeout(function(){f0.focus({preventScroll:true})},500)}return}
      start(t.closest('.bkb'),t.getAttribute('data-id'));return}
    var box=t.closest('.bk-form'),act=t.getAttribute('data-act');
    if(act&&act.indexOf('sp-')===0){slotClick(box,t);return}
    if(act==='next'){go(box,1)}else if(act==='back'){go(box,-1)}else if(act==='all'){exit(box)}
  });
  root.addEventListener('keydown',function(e){
    var t=e.target;
    if(e.key==='Enter'&&t.tagName==='INPUT'&&/^(text|tel|email|date)$/.test(t.type)){
      var box=t.closest('.bk-form');
      if(box&&box._s){e.preventDefault();go(box,1)}
    }
  });
  root.addEventListener('submit',function(e){e.preventDefault()});
  root.addEventListener('change',function(e){
    var t=e.target,box=t.closest('.bk-form');if(!box||!t.name)return;
    var name=t.name;
    if(t.type==='checkbox'&&t.checked&&box.querySelectorAll('input[name="'+name+'"]').length>1){
      if(t.hasAttribute('data-ex')){box.querySelectorAll('input[name="'+name+'"]').forEach(function(x){if(x!==t)x.checked=false})}
      else{box.querySelectorAll('input[name="'+name+'"][data-ex]').forEach(function(x){x.checked=false})}
    }
    var oth=box.querySelector('input[name="'+name+'o"]');
    if(oth){var oc=box.querySelector('input[name="'+name+'"][value="Other"]');oth.hidden=!(oc&&oc.checked);if(!oth.hidden&&t===oc)oth.focus()}
    syncWhen(box);
    var er=box.querySelector('.err');if(er)er.hidden=true;
  });
}
['book','prescriptions'].forEach(function(id){var r=document.getElementById(id);if(r)wire(r)});

/* "Book an appointment" links inside the services menu open the right dropdown */
document.addEventListener('click',function(e){
  var a=e.target.closest('[data-open]');if(!a)return;
  var d=document.getElementById(a.getAttribute('data-open'));if(d)d.open=true;
});
})();

(function(){
var box=document.getElementById('pmap'),fb=document.getElementById('mfb');
if(!box)return;
var LAT=45.1400,LON=-76.1287,Z=16,T=256,loaded=0,shown=false;
function wx(lon,z){return (lon+180)/360*Math.pow(2,z)*T}
function wy(lat,z){var r=lat*Math.PI/180;return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2*Math.pow(2,z)*T}
var cx=wx(LON,Z),cy=wy(LAT,Z),tiles={},drag=null;
box.style.cssText+=';overflow:hidden;touch-action:none;cursor:grab;background:#e8eef5;user-select:none';
var layer=document.createElement('div');layer.style.cssText='position:absolute;left:0;top:0;width:100%;height:100%';
box.appendChild(layer);
var pin=document.createElement('div');
pin.innerHTML='<svg viewBox="0 0 40 52" width="40" height="52" style="display:block;filter:drop-shadow(0 3px 3px rgba(0,0,0,.35))"><path d="M20 50S4 32 4 19a16 16 0 0 1 32 0c0 13-16 31-16 31z" fill="#C8283C" stroke="#0B2447" stroke-width="2.5"/><circle cx="20" cy="19" r="6.5" fill="#fff"/></svg>';
pin.style.cssText='position:absolute;z-index:3;width:40px;height:52px;margin:-52px 0 0 -20px;pointer-events:none';
box.appendChild(pin);
var lab=document.createElement('div');
lab.innerHTML='<b>Seaway Valley Compounding Pharmacy</b><br>320 Coleman St Unit 2C';
lab.style.cssText='position:absolute;z-index:3;transform:translate(-50%,-100%);margin-top:-58px;background:#fff;color:#0B2447;border-radius:12px;padding:8px 12px;font:600 13px/1.3 Manrope,system-ui,sans-serif;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.25);pointer-events:none;white-space:nowrap';
box.appendChild(lab);
var at=document.createElement('div');
at.innerHTML='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener" style="color:inherit">OpenStreetMap</a> contributors';
at.style.cssText='position:absolute;right:0;bottom:0;z-index:4;background:rgba(255,255,255,.8);color:#333;font:11px Manrope,system-ui,sans-serif;padding:2px 6px';
box.appendChild(at);
function btn(t,top,f,l){var b=document.createElement('button');b.type='button';b.textContent=t;b.setAttribute('aria-label',l);
 b.style.cssText='position:absolute;z-index:4;right:12px;top:'+top+'px;width:42px;height:42px;border-radius:12px;border:1.5px solid #cfd8e3;background:#fff;color:#0B2447;font:700 22px/1 Manrope,system-ui,sans-serif;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2)';
 b.addEventListener('click',f);b.addEventListener('pointerdown',function(e){e.stopPropagation()});box.appendChild(b)}
function zoom(d){var nz=Math.max(12,Math.min(18,Z+d));if(nz===Z)return;var k=Math.pow(2,nz-Z);cx*=k;cy*=k;Z=nz;layer.innerHTML='';tiles={};draw()}
btn('+',12,function(){zoom(1)},'Zoom in');btn('−',60,function(){zoom(-1)},'Zoom out');
function draw(){
 var w=box.clientWidth||600,h=box.clientHeight||400,n=Math.pow(2,Z);
 var x0=Math.floor((cx-w/2)/T),x1=Math.floor((cx+w/2)/T),y0=Math.floor((cy-h/2)/T),y1=Math.floor((cy+h/2)/T);
 for(var x=x0;x<=x1;x++)for(var y=y0;y<=y1;y++){
  if(y<0||y>=n)continue;var k=Z+'/'+x+'/'+y,im=tiles[k];
  if(!im){im=document.createElement('img');im.alt='';im.draggable=false;im.referrerPolicy='no-referrer';
   im.style.cssText='position:absolute;width:'+T+'px;height:'+T+'px;max-width:none';
   im.onload=function(){loaded++;if(!shown){shown=true}};
   im.src='https://tile.openstreetmap.org/'+Z+'/'+(((x%n)+n)%n)+'/'+y+'.png';
   layer.appendChild(im);tiles[k]=im}
  im.style.left=Math.round(x*T-cx+w/2)+'px';im.style.top=Math.round(y*T-cy+h/2)+'px'}
 var px=wx(LON,Z)-cx+w/2,py=wy(LAT,Z)-cy+h/2;
 pin.style.left=px+'px';pin.style.top=py+'px';lab.style.left=px+'px';lab.style.top=py+'px';
}
box.addEventListener('pointerdown',function(e){drag={x:e.clientX,y:e.clientY};box.style.cursor='grabbing';try{box.setPointerCapture(e.pointerId)}catch(_){}});
box.addEventListener('pointermove',function(e){if(!drag)return;cx-=e.clientX-drag.x;cy-=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};draw()});
function up(){drag=null;box.style.cursor='grab'}
box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);
box.addEventListener('dblclick',function(){zoom(1)});
window.addEventListener('resize',draw);
draw();setTimeout(draw,300);
setTimeout(function(){if(!loaded&&fb){fb.hidden=false;box.style.display='none'}},7000);
})();



(function(){
if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
var d=document,de=d.documentElement;de.classList.add('js-a');
/* 1. scroll progress in the header */
var h=d.querySelector('header'),tk=false;
function prog(){var m=de.scrollHeight-innerHeight;h&&h.style.setProperty('--p',m>0?Math.min(1,scrollY/m).toFixed(4):0);tk=false}
addEventListener('scroll',function(){if(!tk){tk=true;requestAnimationFrame(prog)}},{passive:true});prog();
/* 2. modules rise in sequence as they scroll into view */
var sel='.tile,.way,.rx-it,.rv-feat,.refill,.cbox,.crew figure,.acc details,.ph3 figure';
var els=[].slice.call(d.querySelectorAll(sel));
els.forEach(function(e){e.classList.add('rvl');var sib=[].slice.call(e.parentNode.children).filter(function(x){return x.classList.contains('rvl')});e.style.setProperty('--i',Math.max(0,sib.indexOf(e)))});
if('IntersectionObserver' in window){
  var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.05});
  els.forEach(function(e){io.observe(e)});
}else els.forEach(function(e){e.classList.add('in')});
/* 3. cursor spotlight on modules, tilt on cards */
var fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
if(fine){
  d.addEventListener('pointermove',function(ev){
    var t=ev.target.closest&&ev.target.closest('.tile,.way,.refill,.rv-feat,.rv-card,.quote,.cbox,.rx-it');
    if(t){var r=t.getBoundingClientRect(),x=ev.clientX-r.left,y=ev.clientY-r.top;t.style.setProperty('--mx',x+'px');t.style.setProperty('--my',y+'px');
      if(t.classList.contains('way')){t.style.setProperty('--ry',((x/r.width-.5)*7).toFixed(2)+'deg');t.style.setProperty('--rx',((.5-y/r.height)*7).toFixed(2)+'deg')}}
    var s=ev.target.closest&&ev.target.closest('.hero');var st=d.querySelector('.hero .store');
    if(s&&st){var b=st.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2;st.style.setProperty('--ry',(Math.max(-1,Math.min(1,(ev.clientX-cx)/600))*6).toFixed(2)+'deg');st.style.setProperty('--rx',(Math.max(-1,Math.min(1,(ev.clientY-cy)/600))*-5).toFixed(2)+'deg')}
  },{passive:true});
  d.addEventListener('pointerout',function(ev){var t=ev.target.closest&&ev.target.closest('.way');if(t&&!t.contains(ev.relatedTarget)){t.style.setProperty('--rx','0deg');t.style.setProperty('--ry','0deg')}});
  d.addEventListener('pointerleave',function(){var st=d.querySelector('.hero .store');if(st){st.style.setProperty('--rx','0deg');st.style.setProperty('--ry','0deg')}});
}
})();


/* multi-page: no extra scripts needed */
