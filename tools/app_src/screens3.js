/* ---------- Shelf helpers ---------- */
async function saveShelf(next){const j=await api('shelf',{method:'PUT',body:{shelf:next}});S.shelf=j.shelf;return j.shelf;}
async function addToShelf(pid,extra={}){
 if(onShelf(pid)) return false;
 const next=S.shelf.concat([{pid,status:'using',since:new Date().toISOString(),...extra}]);
 await saveShelf(next); return true;
}
const daysSince=iso=>Math.max(0,(Date.now()-new Date(iso).getTime())/864e5);
function lifeLeft(it){const p=S.cache[it.pid];const ml=p&&parseFloat(String(p.size||'').replace(',','.'));const perDay=(p&&p.cat==='sun')?1.2:0.6;const days=ml?ml/perDay:60;return Math.max(0,1-daysSince(it.since)/days);}
function dueCheckin(it){if(it.status!=='using'||shelfOnly(itemProduct(it)))return null;const d=daysSince(it.since);if(!it.reviewed.early&&d>=5)return'early';if(!it.reviewed.late&&d>=28)return'late';return null;}
function itemName(it){return it.name||(S.cache[it.pid]&&S.cache[it.pid].name)||it.pid;}
function itemProduct(it){return S.cache[it.pid]||{id:it.pid,name:it.name||it.pid,cat:it.cat||'moist',shape:'tube',c:['#EEF1EF','#7B8A82'],custom:true};}
async function ensureCatalogue(){if(!S.cache._all){const j=await api('products',{query:{limit:'200'}});j.products.forEach(p=>S.cache[p.id]=p);S.cache._all=true;}await ensureShelfCards();}
// Shelf items outside the top of Matches (and every shelf-only kind) are looked up by id.
async function ensureShelfCards(){const miss=S.shelf.map(x=>x.pid).filter(id=>!S.cache[id]&&!id.startsWith('x-'));if(!miss.length)return;const j=await api('find',{query:{ids:miss.slice(0,100).join(','),limit:'100'}});j.products.forEach(p=>S.cache[p.id]=p);}

/* ---------- Scan ---------- */
const ZX_URL='https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';
SCREENS.scan={label:'Scan your products',render(){
 const mode=S.scanMode||'photo';
 const bars=[3,1,2,1,4,1,2,3,1,1,2,4,1,3,1,2,1,3,2,1,4,1,2,1,3].map(w=>`<b style="--w:${w}px"></b>`).join('');
 return `${hdr('Scan your products',{back:true,right:`<button class="btn soft small" data-a="back" style="margin-right:4px">Done</button>`})}
 <div class="body">
  <div class="seg ${mode==='barcode'?'right':''}" role="tablist" aria-label="How to scan"><span class="knob"></span><button role="tab" aria-selected="${mode==='photo'}" class="${mode==='photo'?'on':''}" data-a="scanmode" data-v="photo">Product photo</button><button role="tab" aria-selected="${mode==='barcode'}" class="${mode==='barcode'?'on':''}" data-a="scanmode" data-v="barcode">Barcode</button></div>
  <div class="viewfinder m-${mode}" id="vf">
   <video id="vfvideo" playsinline muted autoplay aria-hidden="true"></video>
   <img id="vfshot" class="vf-shot" alt="" hidden>
   <div class="vf-box"><i></i><i></i><i></i><i></i><div style="position:absolute;inset:0;display:grid;place-items:center"><div class="vf-bars">${bars}</div></div><span class="vf-hint" aria-hidden="true"><svg width="70" height="120" viewBox="0 0 60 104"><rect x="20" y="2" width="20" height="22" rx="6" fill="#fff"/><rect x="10" y="22" width="40" height="80" rx="14" fill="none" stroke="#fff" stroke-width="3"/></svg></span><span class="vf-line"></span></div>
   <div class="vf-photo" id="vfphotobox" hidden><label class="btn" for="vfphoto">${IC.scan}${mode==='photo'?'Take a photo of the product':'Take a photo of the barcode'}</label><span id="vfphotonote">${mode==='photo'?'Show the front, with the name readable.':'Hold the barcode flat, close and sharp.'}</span></div>
   <button class="vf-shutter" id="vfshutter" data-a="shutter" aria-label="Take photo" hidden></button>
   <input type="file" id="vfphoto" accept="image/*" capture="environment" hidden>
   <span class="vf-cap" id="vfcap" role="status" aria-live="polite">Starting the camera…</span>
  </div>
  <button class="btn line small" data-a="searchname">${IC.search}Search by name</button>
  <span class="label" id="addedlabel">${scanAdded.length?`Added, ${scanAdded.length}`:'Nothing added yet'}</span>
  <div class="list" id="scanlist">${scanAdded.map(pid=>scanRow(pid)).join('')}</div>
  <div class="note sky">${IC.lock}<span>Tell us how one of them works for you (three taps) and you'll see what women like you think of everything.</span></div>
 </div>
 <div class="foot"><button class="btn primary" data-a="tab" data-t="matches">See matches for your skin</button><button class="btn line" data-a="reviewone" ${scanAdded.length?'':'disabled'} id="reviewone">Review one now</button></div>`;
},mount(){
 const inp=$('#vfphoto'); inp&&inp.addEventListener('change',e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f)return;if((S.scanMode||'photo')==='photo')identifyPhoto(f);else decodePhoto(f);});
 startCamera(); track('scan_open'); ensureCatalogue().catch(()=>{});
}};
let scanAdded=[];
function scanRow(pid){const it=onShelf(pid)||{pid};const p=itemProduct(it);return `<div class="srow anim"><span class="art" style="${artBg(p)}">${art(p,36,44)}</span><span style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0"><span class="pname" style="font-size:14px">${esc(p.name)}</span>${p.custom?'<span class="pmeta">No reviews yet. Yours can be the first.</span>':peerLine(p)}</span></div>`;}
let cam={};let zxP=null;
function loadZX(){if(window.ZXing)return Promise.resolve(window.ZXing);if(zxP)return zxP;zxP=new Promise(res=>{const sc=document.createElement('script');sc.src=ZX_URL;sc.onload=()=>res(window.ZXing||null);sc.onerror=()=>{zxP=null;res(null);};document.head.appendChild(sc);});return zxP;}
function zxReader(Z){const h=new Map();const F=Z.BarcodeFormat;h.set(Z.DecodeHintType.POSSIBLE_FORMATS,[F.EAN_13,F.EAN_8,F.UPC_A,F.UPC_E,F.CODE_128]);h.set(Z.DecodeHintType.TRY_HARDER,true);const mf=new Z.MultiFormatReader();mf.setHints(h);return {decodeCanvas(cv){try{const r=mf.decodeWithState(new Z.BinaryBitmap(new Z.HybridBinarizer(new Z.HTMLCanvasElementLuminanceSource(cv))));return r?r.getText():null;}catch(e){return null;}finally{try{mf.reset();}catch(e){}}}};}
function frameCanvas(src,w,h,max){const k=Math.min(1,max/Math.max(w,h));const cv=document.createElement('canvas');cv.width=Math.round(w*k);cv.height=Math.round(h*k);cv.getContext('2d',{willReadFrequently:true}).drawImage(src,0,0,cv.width,cv.height);return cv;}
function vfCap(t){const c=$('#vfcap');if(c)c.textContent=t;}
function vfMode(mode,note){const vf=$('#vf');if(!vf)return;vf.classList.toggle('live',mode==='live');vf.classList.toggle('photo',mode==='photo');$('#vfphotobox').hidden=mode!=='photo';if(mode==='photo'){$('#vfvideo').hidden=true;vfCap('');const ph=(S.scanMode||'photo')==='photo';$('#vfphotonote').textContent=(note?note+' ':'')+(ph?'Show the front, with the name readable.':'Hold the barcode flat, close and sharp.');}}
async function startCamera(){
 stopCamera(); const my=cam={on:true}; const md=navigator.mediaDevices;
 if(!md||!md.getUserMedia||!window.isSecureContext){vfMode('photo','');return;}
 let stream;
 try{stream=await md.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});}
 catch(e){if(cam!==my)return;vfMode('photo',e&&e.name==='NotAllowedError'?'Camera access is off, so this opens your camera app.':'');return;}
 if(cam!==my||!$('#vfvideo')){stream.getTracks().forEach(t=>t.stop());return;}
 my.stream=stream;const v=$('#vfvideo');v.srcObject=stream;try{await v.play();}catch(e){}
 vfMode('live');
 if((S.scanMode||'photo')==='photo'){vfCap('Fit the product in the frame, then tap');$('#vfshutter').hidden=false;return;}
 vfCap('Point at the barcode');
 let detect=null;
 if('BarcodeDetector' in window){try{const fm=await BarcodeDetector.getSupportedFormats();const want=['ean_13','ean_8','upc_a','upc_e','code_128'].filter(f=>fm.includes(f));if(want.length){const d=new BarcodeDetector({formats:want});detect=async()=>{const r=await d.detect(v);return r&&r[0]?r[0].rawValue:null;};}}catch(e){}}
 if(!detect){const Z=await loadZX();if(cam!==my)return;if(!Z){vfCap('The barcode reader didn\'t load. Check your connection, or search by name.');return;}my.reader=zxReader(Z);detect=async()=>my.reader.decodeCanvas(frameCanvas(v,v.videoWidth,v.videoHeight,960));}
 const loop=async()=>{if(cam!==my)return;if(!my.paused&&v.readyState>=2){const code=await detect().catch(()=>null);if(code&&cam===my&&!my.paused){const now=Date.now();if(!(code===my.last&&now-my.lastAt<4000)){my.last=code;my.lastAt=now;my.paused=true;onCode(code);}}}my.timer=setTimeout(loop,220);};
 loop();
}
function stopCamera(){const c=cam;cam={};clearTimeout(c.timer);try{c.stream&&c.stream.getTracks().forEach(t=>t.stop());}catch(e){}}
function resumeCamera(delay=1200){const c=cam;setTimeout(()=>{if(cam===c&&c.on){c.paused=false;if(c.stream)vfCap((S.scanMode||'photo')==='photo'?'Fit the next product in the frame, then tap':'Point at the next barcode');}},delay);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera();else{const t=top();if(t&&t.name==='scan')startCamera();}});
function flashVF(){const vf=$('#vf');if(!vf)return;vf.classList.remove('hit');void vf.offsetWidth;vf.classList.add('hit');if(navigator.vibrate){try{navigator.vibrate(30)}catch(e){}}}
async function barcodeFromImage(file){const url=URL.createObjectURL(file);let code=null;try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});const cv=frameCanvas(img,img.naturalWidth,img.naturalHeight,1600);if('BarcodeDetector' in window){try{const d=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128']});const r=await d.detect(cv);if(r&&r[0])code=r[0].rawValue;}catch(e){}}if(!code){const Z=await loadZX();if(Z){const rd=zxReader(Z);code=rd.decodeCanvas(cv)||rd.decodeCanvas(frameCanvas(img,img.naturalWidth,img.naturalHeight,900));}}}catch(e){}URL.revokeObjectURL(url);return code;}
async function decodePhoto(file){vfCap('Reading the barcode…');$('#vfphotonote').textContent='Reading the barcode…';const code=await barcodeFromImage(file);if(!$('#vf'))return;if(!code){$('#vfphotonote').textContent='No barcode found in that photo. Try again closer, with the barcode flat and in focus.';return;}$('#vfphotonote').textContent='Hold the barcode flat, close and sharp.';onCode(code);}
async function scanFound(pid,extra){
 flashVF();
 if(onShelf(pid)){vfCap('Already on your shelf: '+itemName(onShelf(pid)));resumeCamera(1800);return;}
 try{await addToShelf(pid,extra);}catch(e){vfCap('Couldn\'t save that. Check your connection.');resumeCamera(1800);return;}
 scanAdded.unshift(pid);
 vfCap('Added '+itemName(onShelf(pid)));
 const list=$('#scanlist');list&&list.insertAdjacentHTML('afterbegin',scanRow(pid));
 const al=$('#addedlabel');al&&(al.textContent=`Added, ${scanAdded.length}`);
 const ro=$('#reviewone');ro&&(ro.disabled=false);
 resumeCamera(1600);
}
function norm(t){return String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9+ ]/g,' ');}
function matchCatalogue(text){const t=' '+norm(text)+' ';let best=null,bs=0;Object.values(S.cache).forEach(p=>{if(!p||!p.name||!p.brand)return;const w=norm(p.name).split(/\s+/).filter(x=>x.length>2);if(!t.includes(' '+norm(p.brand).split(' ')[0]))return;const hits=w.filter(x=>t.includes(x)).length;if(hits>bs){bs=hits;best=p;}});return bs>=3?best.id:null;}
async function onCode(code){
 flashVF(); vfCap('Found barcode '+code+'. Looking it up…'); track('barcode');
 let pid=null;
 try{pid=(await api('ean',{query:{code}})).pid;}catch(e){}
 let obfName='';
 if(!pid){try{const ctl=new AbortController();const tm=setTimeout(()=>ctl.abort(),5000);const r=await fetch(`https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands`,{signal:ctl.signal});clearTimeout(tm);if(r.ok){const j=await r.json();if(j&&j.product){obfName=[j.product.brands,j.product.product_name].filter(Boolean).join(' ');pid=matchCatalogue(obfName);if(!pid&&j.product.brands){try{const f=await api('find',{query:{q:String(j.product.brands).split(',')[0].slice(0,40),limit:'100'}});f.products.forEach(p=>S.cache[p.id]=p);pid=matchCatalogue(obfName);}catch(e){}}if(pid)api('ean',{method:'POST',body:{code,pid}}).catch(()=>{});}}}catch(e){}}
 if(!$('#vf'))return;
 if(pid){scanFound(pid);return;}
 vfCap('We don\'t know this barcode yet');
 pickProductSheet({title:'Which product is this?',lead:`We don't know barcode ${code} yet. Pick it below, and next time it scans straight away.`,code,prefill:obfName});
}
function pickProductSheet({title,lead,code,prefill}){
 openSheet(title,`<p style="margin:0">${esc(lead)}</p><label for="uq" class="label">Search our products</label><input id="uq" class="field" placeholder="For example: Nivea" autocomplete="off" value=""><div class="list" id="uqres">${spinner()}</div>
  <span class="label">Not in the list?</span><form id="uform" style="display:flex;flex-direction:column;gap:8px"><label for="uname" class="label" style="font-weight:500">Type the brand and product name</label><input id="uname" class="field" autocomplete="off" value="${esc(prefill||'')}"><div class="chips" id="ucat" role="group" aria-label="What kind of product"><button type="button" class="chip sm on" aria-pressed="true" data-v="moist">Moisturiser</button><button type="button" class="chip sm" aria-pressed="false" data-v="sun">Sunscreen</button><button type="button" class="chip sm" aria-pressed="false" data-v="other">Something else</button></div><button class="btn line" id="ubtn" ${prefill&&prefill.length>2?'':'disabled'}>Add it to my shelf</button></form>`,{onMount(sh){
  const q=sh.querySelector('#uq'),r=sh.querySelector('#uqres'),nm=sh.querySelector('#uname'),b=sh.querySelector('#ubtn'),seg=sh.querySelector('#ucat');let cat='moist';
  seg.addEventListener('click',e=>{const x=e.target.closest('button');if(!x)return;cat=x.dataset.v;seg.querySelectorAll('button').forEach(y=>{y.classList.toggle('on',y===x);y.setAttribute('aria-pressed',y===x);});});
  let tm;const draw=async()=>{try{const j=await api('find',{query:{q:q.value.trim(),limit:'8'}});j.products.forEach(p=>S.cache[p.id]=p);r.innerHTML=j.products.map(p=>`<button class="pcard" data-a="pickfound" data-id="${esc(p.id)}" data-code="${esc(code||'')}"><span class="art" style="${artBg(p)}">${art(p,36,44)}</span><span class="meta"><span class="pname" style="font-size:14px">${esc(p.name)}</span><span class="pmeta">${onShelf(p.id)?'On your shelf':esc(cap(kindLabel(p)))+(shelfOnly(p)?' · shelf and ingredient check':'')}</span></span></button>`).join('')||'<p class="pmeta" style="margin:0">Nothing with that name yet. Type it below instead.</p>';}catch(e){r.innerHTML='<p class="pmeta">Couldn\'t search right now.</p>';}};
  q.addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(draw,250);});draw();
  nm.addEventListener('input',()=>{b.disabled=nm.value.trim().length<3;});
  sh.querySelector('#uform').addEventListener('submit',e=>{e.preventDefault();const v=nm.value.trim();if(v.length<3)return;const pid='x-'+norm(v).trim().replace(/ +/g,'-').slice(0,50);closeSheet();scanFound(pid,{name:v,cat});});
 }});
}
let idBusy=false;
function showShot(blob){const im=$('#vfshot');if(!im)return;if(im.dataset.url)URL.revokeObjectURL(im.dataset.url);const u=URL.createObjectURL(blob);im.dataset.url=u;im.src=u;im.hidden=false;$('#vf').classList.add('thinking');}
function hideShot(){const im=$('#vfshot');if(!im)return;im.hidden=true;const vf=$('#vf');vf&&vf.classList.remove('thinking');}
function captureFrame(){const v=$('#vfvideo');if(!v||!v.videoWidth)return;flashVF();frameCanvas(v,v.videoWidth,v.videoHeight,1280).toBlob(b=>{if(b)identifyPhoto(b);},'image/jpeg',.88);}
async function toDataURL(blob){const url=URL.createObjectURL(blob);try{const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});return frameCanvas(img,img.naturalWidth,img.naturalHeight,1280).toDataURL('image/jpeg',.85);}finally{URL.revokeObjectURL(url);}}
async function identifyPhoto(blob){
 if(idBusy)return;idBusy=true;if(cam)cam.paused=true;
 const sh=$('#vfshutter');sh&&(sh.hidden=true);showShot(blob);vfCap('Recognising the product…');
 const done=()=>{idBusy=false;hideShot();const s=$('#vfshutter');if(s&&cam.stream)s.hidden=false;vfCap(cam.stream?'Fit the product in the frame, then tap':'');};
 let r;
 try{r=await api('identify',{method:'POST',body:{image:await toDataURL(blob)}});}
 catch(e){done();
  if(e.code==='ai_not_configured'){const code=await barcodeFromImage(blob);if(code){onCode(code);return;}pickProductSheet({title:'Which product is this?',lead:'Photo recognition isn\'t switched on yet. Pick the product instead.'});return;}
  vfCap(e.code==='slow_down'?'Too many photos at once. Wait a moment, then try again.':'Couldn\'t recognise it. Try again with the front label in view.');return;}
 done(); if(!$('#vf'))return;
 if(!r.readable){vfCap('Couldn\'t read a label. Try again with the front of the product filling the frame.');return;}
 const name=[r.brand,r.product].filter(Boolean).join(' ').trim();
 if(r.match&&r.confidence==='high'){scanFound(r.match);return;}
 if(r.match){const p=S.cache[r.match]||{name:r.match};openSheet('Is this your product?',`<div style="display:flex;gap:14px;align-items:center"><span class="art" style="${artBg(p)};width:60px;height:72px;border-radius:18px;display:grid;place-items:center;flex:none">${art(p,44,54)}</span><span style="display:flex;flex-direction:column;gap:2px"><span class="pname">${esc(p.name)}</span>${name?`<span class="pmeta">We read: ${esc(name)}</span>`:''}</span></div><button class="btn primary" data-a="pickfound" data-id="${esc(r.match)}">Yes, add it</button><button class="btn line" data-a="pickother" data-name="${esc(name)}">No, pick another</button>`);return;}
 pickProductSheet({title:'New to us',lead:(name?`This looks like ${name}. `:'')+(r.category==='other'?'We don\'t have it in our list yet. You can still add it to your shelf. Reviews are open for face sunscreens and moisturisers only for now.':'We don\'t have it in our list yet. Add it to your shelf, and your review can be the first.'),prefill:name});
}

/* ---------- Shelf ---------- */
SCREENS.shelf={tab:'shelf',label:'My shelf',render(){
 const right=`<button class="btn primary small" data-a="startscan" style="margin-right:4px">${IC.plus}Add</button>`;
 if(!S.shelf.length) return `${hdr('My shelf',{right})}<div class="body"><div class="empty" style="padding-top:60px"><svg width="96" height="80" viewBox="0 0 96 80" aria-hidden="true"><rect x="6" y="66" width="84" height="6" rx="3" fill="#CDEBD8"/><rect x="18" y="30" width="18" height="36" rx="6" fill="#DCEBF7"/><rect x="42" y="18" width="16" height="48" rx="6" fill="#FBEFD3"/><rect x="64" y="38" width="20" height="28" rx="8" fill="#E9F6EE"/></svg><h3>Your shelf is empty</h3><span>Add the products you use now. You'll see what women like you think of them, and get a nudge before they run out.</span><button class="btn primary" data-a="startscan" style="margin-top:6px">${IC.scan}Add my first product</button></div></div>`;
 return `${hdr('My shelf',{right})}<div class="body" id="shelfbody">${spinner()}</div>`;
},mount(){if(!S.shelf.length)return;ensureCatalogue().then(()=>{const b=$('#shelfbody');if(b)b.innerHTML=shelfHTML();}).catch(e=>{const b=$('#shelfbody');if(b)b.innerHTML=errorBox(e,'');});}};
function shelfHTML(){
 const using=S.shelf.filter(x=>x.status==='using'),stopped=S.shelf.filter(x=>x.status==='stopped');
 const due=using.map(x=>[x,dueCheckin(x)]).find(([,d])=>d);
 const first=!S.user.unlocked&&using.find(x=>!x.reviewed.early&&reviewable(itemProduct(x)));
 const low=using.find(x=>reviewable(itemProduct(x))&&lifeLeft(x)<0.15);
 let h='';
 if(due){const [it,stage]=due;h+=`<div class="note mint" style="flex-direction:column;gap:10px"><span>${stage==='early'?`You've had the ${esc(itemName(it))} for ${Math.floor(daysSince(it.since))} days. First impressions?`:`You've used the ${esc(itemName(it))} for a few weeks now. How is it going?`}</span><button class="btn primary small" data-a="checkin" data-id="${esc(it.pid)}" data-stage="${stage}" style="align-self:flex-start">Quick check-in</button></div>`;}
 else if(first){h+=`<div class="note sky" style="flex-direction:column;gap:10px">${IC.lock}<span>Review one product you use, in three taps, to see every review.</span><button class="btn primary small" data-a="checkin" data-id="${esc(first.pid)}" data-stage="early" style="align-self:flex-start">Review ${esc(itemName(first))}</button></div>`;}
 if(low) h+=`<div class="note butter" style="flex-direction:column;gap:10px"><span style="display:flex;gap:10px">${IC.bell}<span>Your ${esc(itemName(low))} is probably running low.</span></span><button class="btn line small" data-a="runout" data-id="${esc(low.pid)}" style="align-self:flex-start">Rebuy or switch</button></div>`;
 if(using.length) h+=`<span class="label">Using now</span><div class="list">${using.map(shelfRow).join('')}</div>`;
 if(stopped.length) h+=`<span class="label">Stopped using</span><div class="list">${stopped.map(shelfRow).join('')}</div>`;
 h+=`<div class="note sky">${IC.shield}<span>Your reviews show only your skin type, age group and skin tone, never your name or email.</span></div>`;
 return h;
}
function shelfRow(it){
 const p=itemProduct(it);
 const status=it.status==='stopped'?`Stopped: ${esc(it.reason||'no reason given')}`:shelfOnly(p)?`${esc(cap(kindLabel(p)))}, added ${Math.floor(daysSince(it.since))===0?'today':Math.floor(daysSince(it.since))+' days ago'}`:it.reviewed.late?'Reviewed after a few weeks':it.reviewed.early?'First impressions shared':`Added ${Math.floor(daysSince(it.since))===0?'today':Math.floor(daysSince(it.since))+' days ago'}`;
 const left=lifeLeft(it);
 return `<button class="srow ${it.status}" data-a="shelfitem" data-id="${esc(it.pid)}"><span class="art" style="${artBg(p)}">${art(p,38,46)}</span><span style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0"><span class="pname" style="font-size:14px">${esc(p.name)}</span><span class="pmeta">${status}</span>${it.status==='using'&&!p.custom?`<span class="meter ${left<.15?'low':''}" aria-label="About ${Math.round(left*100)}% left"><i style="width:${Math.round(left*100)}%"></i></span>`:''}</span>${IC.chev}</button>`;
}

/* ---------- Check-in (review) ---------- */
let ck=null;
SCREENS.checkin={label:'Check-in',render({id,stage}){
 const it=onShelf(id)||{pid:id}; const p=itemProduct(it);
 ck=ck&&ck.id===id&&ck.stage===stage?ck:{id,stage,again:null,feel:[],extra:[],note:'',stopped:null};
 const one=(k,opts)=>opts.map(([v,l])=>`<button class="chip ${ck[k]===v?'on':''}" aria-pressed="${ck[k]===v}" data-a="ck1" data-k="${k}" data-v="${v}">${l}</button>`).join('');
 const many=(k,opts)=>opts.map(([v,l])=>`<button class="chip ${ck[k].includes(v)?'on':''}" aria-pressed="${ck[k].includes(v)}" data-a="ckm" data-k="${k}" data-v="${v}">${ck[k].includes(v)?IC.check:''}${l}</button>`).join('');
 const feel=[['hydrated','Hydrated'],['greasy','Greasy'],['still tight','Still tight'],['stings','Stings'],['broke out','Broke me out'],['no change','No change']].concat(p.cat==='sun'?[['white cast','White cast'],['no white cast','No white cast']]:[]);
 const stings=ck.feel.includes('stings');
 return `${hdr(stage==='late'?'After a few weeks':'First impressions',{back:true})}
 <div class="body">
  <div style="display:flex;gap:12px;align-items:center"><span class="art" style="${artBg(p)};width:52px;height:62px;border-radius:14px;display:grid;place-items:center;flex:none">${art(p,40,48)}</span><span class="pname">${esc(p.name)}</span></div>
  <p class="q">Would you buy it again?</p><div class="chips">${one('again',[['y','Yes'],['m','Maybe'],['n','No']])}</div>
  <p class="q">How does your skin feel with it?</p><div class="chips">${many('feel',feel)}</div>
  <p class="q">Anything else? <span style="font-weight:400;color:var(--muted)">(optional)</span></p><div class="chips">${many('extra',[['good under makeup','Good under makeup'],['pills','Pills'],['too expensive','Too expensive'],['lasts long','Lasts long']])}</div>
  ${stage==='late'?`<p class="q">Still using it?</p><div class="chips">${one('stopped',[['','Yes'],['stung or burned','Stopped: it stung'],['broke me out','Stopped: breakouts'],['ran out','Stopped: ran out'],["didn't do much","Stopped: didn't help"]])}</div>`:''}
  <label for="cknote" class="label">Tell women like you in your own words (optional)</label>
  <input id="cknote" class="field" maxlength="300" value="${esc(ck.note)}" placeholder="What would you tell a friend?">
  <p class="pmeta" style="margin:0">Shown with your skin type and age group only. Please don't add names or health details.</p>
  <div class="note ${stings?'rose':'butter'}">${IC.alert}<span>${stings?'<b>Stinging that doesn\'t stop?</b> Stop using it. Swelling or a rash that spreads: contact your huisarts.':'Reaction that worries you, like swelling or a rash that spreads? Stop using it and contact your huisarts.'} <a href="#" data-a="medical">More about this</a></span></div>
  <p class="err" id="ckerr" role="alert"></p>
 </div>
 <div class="foot"><button class="btn primary" data-a="cksave" id="cksave" ${ck.again&&ck.feel.length?'':'disabled'}>${S.user.unlocked?'Save review':'Save, and unlock all reviews'}</button></div>`;
},mount(){const n=$('#cknote');n&&n.addEventListener('input',e=>{ck.note=e.target.value;});}};
function celebrate(helps,firstUnlock){
 const ov=$('#overlay');let d='';
 for(let i=0;i<22;i++){const a=i/22*Math.PI*2,r=86+(i%3)*10;const fa=a+1.2,fr=220;d+=`<span class="d" style="--c:${TONES[(i*3)%8]};--i:${i};--tx:${Math.cos(a)*r}px;--ty:${Math.sin(a)*r}px;--fx:${Math.cos(fa)*fr}px;--fy:${Math.sin(fa)*fr}px"></span>`;}
 d+=`<span class="d you" style="--c:${TONES[3]}"></span>`;
 ov.innerHTML=`<div class="celebrate" role="dialog" aria-modal="true" aria-label="Review saved"><div class="orbit" aria-hidden="true">${d}</div><h2>Saved. Thank you!</h2><p>${helps>0?`Your review now helps ${helps} women with skin like yours.`:'Your review helps the next woman with skin like yours.'}${firstUnlock?' All reviews are unlocked for you.':''}</p><button class="btn light" data-a="celebratedone">Back to my shelf</button></div>`;
}

/* ---------- Me ---------- */
SCREENS.me={tab:'me',label:'Me',render(){
 const p=prof()||{};
 return `${hdr('Me')}
 <div class="body">
  <div class="profile"><span style="font-size:13px;font-weight:600">Your group</span><h2>${esc(TYPE_NAME[p.type]||'')} skin, ${esc(ageLabel(p.age))}</h2><div class="chips">${p.tone?`<span class="tag" style="background:#fff;gap:6px"><i style="width:12px;height:12px;border-radius:50%;background:${TONES[p.tone-1]};box-shadow:inset 0 0 0 1px rgba(0,0,0,.15)"></i>Shade ${p.tone}</span>`:''}<span class="tag" style="background:#fff">${esc((SUN_OPTS.find(x=>x[0]===p.sun)||['',''])[1])}</span><span class="tag" style="background:#fff">${esc((BUDGET_OPTS.find(x=>x[0]===p.budget)||['',''])[1])}</span>${(p.concerns||[]).map(c=>`<span class="tag" style="background:#fff">${esc((CONCERNS.find(x=>x[0]===c)||[c,c])[1])}</span>`).join('')}</div></div>
  <div class="group">
   <button class="item" data-a="editskin">${IC.edit}<span class="grow">Change my skin details<small>Answer the questions again</small></span>${IC.chev}</button>
   <button class="item" data-a="howitworks">${IC.info}<span class="grow">How Skin Peers works<small>Matching, sources, money and your data</small></span>${IC.chev}</button>
   <div class="item">${IC.bell}<span class="grow">Run-out and check-in nudges<small>Shown on your shelf in the app</small></span><button class="switch" role="switch" aria-checked="${!!S.user.reminders}" aria-label="Run-out and check-in nudges" data-a="toggleremind"></button></div>
  </div>
  <span class="label">Your data and choices</span>
  <div class="group">
   <button class="item" data-a="mydata">${IC.down}<span class="grow">Download my data<small>Your profile, shelf and reviews as a file</small></span>${IC.chev}</button>
   <button class="item" data-a="delconcerns" ${(p.concerns||[]).length?'':'disabled'}>${IC.shield}<span class="grow">Delete my skin concerns<small>${(p.concerns||[]).length?'Your reviews stay':'You haven\'t shared any'}</small></span>${IC.chev}</button>
   <button class="item" data-a="privacy">${IC.lock}<span class="grow">Privacy<small>What we store and who sees it</small></span>${IC.chev}</button>
   <button class="item" data-a="signout">${IC.back}<span class="grow">Sign out<small>${esc(S.user.email)}</small></span></button>
   <button class="item danger" data-a="delacct">${IC.trash}<span class="grow">Delete my account<small style="color:inherit;opacity:.8">Removes your profile, shelf and reviews</small></span></button>
  </div>
  <p class="fine">Early version. Some review numbers include sample reviews for testing; they're marked where they appear.</p>
 </div>`;
}};
const PRIVACY=`<p style="margin:0">We store your email (to sign you in), your skin details, your shelf and your reviews, on servers in the EU. Your reviews show only your skin type, age group and skin tone, never your name or email.</p>
<p style="margin:0">Skin concerns are optional and need your OK. You can delete them, or your whole account, any time in Me, and download everything we store.</p>
<p style="margin:0">To answer your questions and read product photos, we send the question or photo to our AI provider. We don't store your chat or your photos; your chat stays on this device.</p>
<p class="pmeta" style="margin:0">Early version. The full privacy policy follows after legal review.</p>`;

/* ---------- Actions ---------- */
const A={
 tab:(el)=>{const t=el.dataset.t;const tp=top();if(tp&&tp.name===t&&stack.length===1){const b=tp.el.querySelector('.body');b&&(b.scrollTop=0);return;}go(t,{},'tab');},
 back:()=>back(),
 signin:()=>{signin={email:'',step:'email',busy:false,testCode:null};go('signin');},
 resend:()=>{signin.step='email';refresh();},
 privacy:(el,e)=>{e&&e.preventDefault();openSheet('Privacy',PRIVACY);},
 introskip:()=>introFinish(false,'intro_skip'),
 intronext:()=>introMove(1,top().params),
 howitworks:()=>{introI=0;go('intro',{again:true});},
 obback:()=>{if(!ob||ob.i===0){if(S.user&&S.user.profile)back();return;}if(ob.phase==='concerns'){ob.phase='q';obRender(false);return;}ob.i--;if(OB[ob.i].k==='consent')ob.concerns=[];obRender(false);},
 obpick:(el)=>obPick(el.dataset.v),
 obtone:(el)=>obPick(el.dataset.v),
 obconcern:(el)=>{const v=el.dataset.v;const i=ob.concerns.indexOf(v);i>=0?ob.concerns.splice(i,1):ob.concerns.push(v);obFoot(false);},
 obconcernsdone:()=>{if(ob.concerns.length){$('#obthread').insertAdjacentHTML('beforeend',`<div class="msg me anim"><div class="bub">${esc(ob.concerns.map(c=>(CONCERNS.find(x=>x[0]===c)||[c,c])[1]).join(', '))}</div></div>`);}else ob.ans.consent='no';$('#obfoot').innerHTML='';obNext();},
 obfinish:()=>obFinish(),
 skintest:()=>openSheet('1-minute skin test',`<ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:10px"><li>Wash your face with a mild cleanser in the evening.</li><li>Leave it bare for an hour, with no products.</li><li>Press a clean tissue on your forehead, nose and cheeks.</li></ol><div class="note sky">${IC.info}<span>Oil only on the forehead and nose? That's combination skin. Oil everywhere is oily; none, and feeling tight, is dry.</span></div><button class="btn primary" data-a="closesheet">Got it</button>`),
 chip:(el)=>chipAction(el.dataset.v),
 product:(el)=>go('product',{id:el.dataset.id}),
 mcat:(el)=>{if(S.m.cat===el.dataset.v)return;S.m.cat=el.dataset.v;S.m.spf=false;const seg=el.parentElement;seg.classList.toggle('right',S.m.cat==='sun');seg.querySelectorAll('button').forEach(b=>{const on=b.dataset.v===S.m.cat;b.classList.toggle('on',on);b.setAttribute('aria-selected',on);});top().el.querySelector('.hdr h1').firstChild.textContent=(S.m.cat==='sun'?'Sunscreens':'Moisturisers')+' for you';updateMatches();},
 mf:(el)=>{const k=el.dataset.k;if(k==='max')S.m.max=S.m.max?null:(BUDGET_MAX[(prof()||{}).budget]||20);else S.m[k]=!S.m[k];updateMatches();},
 mshop:(el)=>{S.m.shop=S.m.shop===el.dataset.v?null:el.dataset.v;updateMatches();},
 mclear:()=>{Object.assign(S.m,{max:null,shop:null,ff:false,spf:false,nobreak:false});updateMatches();},
 mretry:()=>updateMatches(),
 askabout:()=>{pendingSay=`Which of these ${S.m.cat==='sun'?'sunscreens':'moisturisers'} is best for me${S.m.max?` under €${S.m.max}`:''}${S.m.shop?` at ${S.m.shop}`:''}?`;go('chat',{},'tab');},
 pview:(el)=>{const t=top();t.params.view=el.dataset.v;refresh();},
 reviews:(el)=>reviewsSheet(el.dataset.id),
 whyunlock:()=>{track('why_unlock');openSheet('How reviews work',`<p style="margin:0">Every review here comes from a woman who uses the product. To keep it that way, everyone shares how one product they use works for them before reading all reviews.</p><div class="note sky">${IC.shield}<span>It takes three taps. Only your skin type, age group and skin tone are shown with it, never your name. And it helps the next woman with skin like yours.</span></div><button class="btn primary" data-a="unlockflow">Review a product</button><button class="btn line" data-a="closesheet">Not now</button>`);},
 unlockflow:()=>{closeSheet(true);const x=S.shelf.find(s=>s.status==='using'&&!s.reviewed.early&&reviewable(itemProduct(s)));if(x)go('checkin',{id:x.pid,stage:'early'});else go('scan');},
 have:async(el)=>{el.disabled=true;try{await addToShelf(el.dataset.id);toast('Added to your shelf');$('#pfoot')&&($('#pfoot').innerHTML=productFoot(S.cache[el.dataset.id]));}catch(e){el.disabled=false;toast('Couldn\'t add it. Try again.');}},
 buyout:()=>track('buy_click'),
 buy:(el)=>{const p=S.cache[el.dataset.id];const s=p&&(p.shops||[]).find(x=>x.url);track('runout_rebuy');if(s)window.open(s.url,'_blank','noopener');else go('product',{id:el.dataset.id});},
 share:async(el)=>{const p=S.cache[el.dataset.id];const text=`${p?p.name:''}: see what women with skin like yours think, on Skin Peers.`;track('share');try{if(navigator.share){await navigator.share({title:'Skin Peers',text,url:location.origin+'/app/'});return;}await navigator.clipboard.writeText(text+' '+location.origin+'/app/');toast('Link copied');}catch(e){}},
 startscan:()=>{scanAdded=[];go('scan');},
 scanmode:(el)=>{const v=el.dataset.v;if((S.scanMode||'photo')===v)return;S.scanMode=v;refresh();},
 shutter:()=>captureFrame(),
 searchname:()=>pickProductSheet({title:'Search by name',lead:'Find the product you use.'}),
 pickfound:(el)=>{const id=el.dataset.id,code=el.dataset.code;if(code)api('ean',{method:'POST',body:{code,pid:id}}).catch(()=>{});closeSheet();if(top().name==='scan')scanFound(id);else addToShelf(id).then(()=>{toast('Added to your shelf');refresh();}).catch(()=>{});},
 pickother:(el)=>pickProductSheet({title:'Which product is this?',lead:'Pick it from the list, or type its name.',prefill:el.dataset.name}),
 reviewone:()=>{const x=scanAdded.map(onShelf).find(s=>s&&!s.reviewed.early&&reviewable(itemProduct(s)));if(x)go('checkin',{id:x.pid,stage:'early'});else toast(scanAdded.some(id=>shelfOnly(itemProduct(onShelf(id)||{pid:id})))?'Reviews are open for sunscreens and moisturisers only for now':'Products not in our list can be reviewed once we add them');},
 checkin:(el)=>{const p=itemProduct(onShelf(el.dataset.id)||{pid:el.dataset.id});if(shelfOnly(p)){toast('Reviews for these aren\'t open yet');return;}go('checkin',{id:el.dataset.id,stage:el.dataset.stage||'early'});},
 shelfitem:(el)=>{const it=onShelf(el.dataset.id);const p=itemProduct(it);const stage=!it.reviewed.early?'early':'late';
  openSheet(p.name,`${shelfOnly(p)?`<p class="pmeta" style="margin:0">${esc(notOpenLine(p))}</p>`:''}${it.status==='using'&&reviewable(p)?`<button class="btn primary" data-a="checkin" data-id="${esc(it.pid)}" data-stage="${stage}">${stage==='early'?'Share first impressions':(it.reviewed.late?'Update my review':'Review after a few weeks')}</button>`:''}${it.status==='using'?`<button class="btn line" data-a="stopask" data-id="${esc(it.pid)}">I stopped using it</button>`:`<button class="btn line" data-a="restart" data-id="${esc(it.pid)}">I'm using it again</button>`}${p.custom?'':`<button class="btn line" data-a="product" data-id="${esc(it.pid)}">${shelfOnly(p)?'See the ingredient check':'See what women like you think'}</button>`}<button class="btn line" data-a="remove" data-id="${esc(it.pid)}" style="color:var(--rose-ink)">Remove from my shelf</button>`);},
 stopask:(el)=>{const id=el.dataset.id;openSheet('Why did you stop?',`<div class="chips">${['Stung or burned','Broke me out','Too greasy','Ran out',"Didn't do much",'Too expensive'].map(r=>`<button class="chip" data-a="stop" data-id="${esc(id)}" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>`);},
 stop:async(el)=>{const next=S.shelf.map(x=>x.pid===el.dataset.id?{...x,status:'stopped',reason:el.dataset.v.toLowerCase()}:x);closeSheet();try{await saveShelf(next);toast('Moved to stopped using');refresh();}catch(e){toast('Couldn\'t save. Try again.');}},
 restart:async(el)=>{const next=S.shelf.map(x=>x.pid===el.dataset.id?{...x,status:'using',reason:null,since:new Date().toISOString()}:x);closeSheet();try{await saveShelf(next);refresh();}catch(e){}},
 remove:async(el)=>{const next=S.shelf.filter(x=>x.pid!==el.dataset.id);closeSheet();try{await saveShelf(next);toast('Removed from your shelf');refresh();}catch(e){}},
 runout:(el)=>{pendingRunout=el.dataset.id;track('runout_switch');go('chat',{},'tab');},
 ck1:(el)=>{ck[el.dataset.k]=el.dataset.v;refresh();},
 ckm:(el)=>{const a=ck[el.dataset.k],v=el.dataset.v;const i=a.indexOf(v);if(i>=0)a.splice(i,1);else{if(v==='no change')a.length=0;else{const j=a.indexOf('no change');j>=0&&a.splice(j,1);}if(v==='white cast'){const k=a.indexOf('no white cast');k>=0&&a.splice(k,1);}if(v==='no white cast'){const k=a.indexOf('white cast');k>=0&&a.splice(k,1);}a.push(v);}refresh();},
 cksave:async(el)=>{el.disabled=true;el.textContent='Saving…';
  try{const j=await api('review',{method:'POST',body:{pid:ck.id,stage:ck.stage,again:ck.again,feel:ck.feel,extra:ck.extra,note:ck.note,stopped:ck.stopped||undefined}});S.shelf=j.shelf;const first=j.firstUnlock;S.user.unlocked=true;Object.keys(S.cache).filter(k=>k.startsWith('d:')).forEach(k=>delete S.cache[k]);ck=null;celebrate(j.helps,first);}
  catch(e){el.disabled=false;el.textContent='Save review';$('#ckerr').textContent=e.code==='reviews_not_open'?'Reviews for this kind of product aren\'t open yet. It stays on your shelf.':'Couldn\'t save your review. Check your connection and try again.';}},
 celebratedone:()=>{$('#overlay').innerHTML='';go('shelf',{},'tab');},
 medical:(el,e)=>{e&&e.preventDefault();openSheet('When to see your huisarts',`<p style="margin:0">Stop using a product if it burns, swells your skin, or gives you a rash that spreads. Contact your huisarts if it doesn't settle within a few days.</p><div class="note butter">${IC.alert}<span>Swelling of the face, lips or tongue, or trouble breathing: call 112.</span></div><a class="btn line" href="https://www.thuisarts.nl" target="_blank" rel="noopener">Thuisarts.nl ${IC.ext}</a>`);},
 editskin:()=>{ob=null;go('onboard');},
 toggleremind:async(el)=>{const v=!S.user.reminders;el.setAttribute('aria-checked',v);try{const j=await api('me',{method:'PUT',body:{reminders:v}});S.user=j.user;toast(v?'Nudges on':'Nudges off');}catch(e){el.setAttribute('aria-checked',!v);}},
 mydata:async()=>{try{const j=await api('me/export');const blob=new Blob([JSON.stringify(j,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='skin-peers-my-data.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);toast('Your data is downloading');}catch(e){toast('Couldn\'t get your data. Try again.');}},
 delconcerns:async()=>{try{const j=await api('me',{method:'PUT',body:{deleteConcerns:true}});S.user=j.user;toast('Skin concerns deleted');refresh();}catch(e){toast('Couldn\'t delete them. Try again.');}},
 signout:async()=>{try{await api('auth/logout',{method:'POST'});}catch(e){}store.del(chatKey());S.chat=[];signedOut();},
 delacct:()=>openSheet('Delete your account?',`<p style="margin:0">This removes your profile, shelf and reviews for good. You can't undo it.</p><button class="btn primary" style="background:var(--rose-ink)" data-a="delconfirm">Delete my account</button><button class="btn line" data-a="closesheet">Keep my account</button>`),
 delconfirm:async(el)=>{el.disabled=true;el.textContent='Deleting…';try{await api('me',{method:'DELETE'});store.del(chatKey());S.chat=[];closeSheet(true);signedOut();toast('Your account is deleted');}catch(e){el.disabled=false;el.textContent='Delete my account';}},
 closesheet:()=>{closeSheet();if(cam.on)resumeCamera(300);},
};
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-a]'); if(!el) return;
 const f=A[el.dataset.a]; if(!f) return;
 if(el.tagName==='A'&&el.dataset.a!=='buyout') e.preventDefault();
 f(el,e);
});

/* ---------- Boot ---------- */
function route(){
 if(!S.user){go('welcome',{},'reset');return;}
 if(!S.user.seenIntro){introI=0;go('intro',{},'reset');return;}
 if(!S.user.profile){ob=null;go('onboard',{},'reset');return;}
 go('chat',{},'reset');
}
async function boot(){
 if(!S.token){go('welcome',{},'reset');return;}
 stage.innerHTML=`<section class="scr">${spinner()}</section>`;
 try{
  const j=await api('me'); S.user=j.user; S.shelf=j.shelf||[]; S.chat=store.get(chatKey())||[];
  if(S.user.profile) S.m.max=BUDGET_MAX[S.user.profile.budget]||null;
  ensureCatalogue().catch(()=>{});
  stage.innerHTML=''; route();
 }catch(e){
  if(e.code==='signed_out') return;
  stage.innerHTML=`<section class="scr">${errorBox(e,'bootretry')}</section>`;
 }
}
A.bootretry=()=>boot();
boot();
