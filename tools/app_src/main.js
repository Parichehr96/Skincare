/* ---------- Basics ---------- */
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur=n=>n==null?'':'€'+Number(n).toFixed(2).replace('.',',');
const TONES=['#F6EDE4','#F3E7DB','#F7EAD0','#EADABA','#D7BD96','#A07E56','#825C43','#604134'];
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};

const S={token:store.get('sp-token'),user:null,shelf:[],cfg:{},chat:[],m:{cat:'moist',max:null,shop:null,ff:false,spf:false,nobreak:false},cache:{}};
const chatKey=()=>'sp-chat-'+(S.user?S.user.id:'x');
function saveChat(){store.set(chatKey(),S.chat.slice(-60));}

/* ---------- API ---------- */
class ApiError extends Error{constructor(code,status){super(code);this.code=code;this.status=status;}}
async function api(route,{method='GET',body,query}={}){
  const qs=new URLSearchParams({r:route,...(query||{})});
  const r=await fetch('/api/app?'+qs,{method,headers:{'Content-Type':'application/json',...(S.token?{Authorization:'Bearer '+S.token}:{})},body:body?JSON.stringify(body):undefined});
  let j={};try{j=await r.json();}catch(e){}
  if(r.status===401&&route!=='auth/verify'&&route!=='auth/start'){signedOut();throw new ApiError('signed_out',401);}
  if(!r.ok) throw new ApiError(j.error||'error',r.status);
  return j;
}
function track(name){api('event',{method:'POST',body:{name}}).catch(()=>{});}
function signedOut(){S.token=null;S.user=null;store.del('sp-token');go('welcome',{},'reset');}

/* ---------- Labels ---------- */
const TYPE_OPTS=[['dry','Tight or flaky'],['oily','Shiny all over'],['combination','Shiny T-zone only'],['normal','Comfortable'],['unsure','Not sure']];
const TYPE_NAME={dry:'Dry',oily:'Oily',combination:'Combination',normal:'Normal',unsure:'Not sure yet'};
const AGE_OPTS=['18-24','25-34','35-44','45-54','55+'];
const SUN_OPTS=[['burns','Burns easily'],['burns-tans','Burns, then tans'],['tans','Rarely burns']];
const BUDGET_OPTS=[['u10','Under €10'],['10-20','€10–20'],['20-35','€20–35'],['any',"Price doesn't matter"]];
const BUDGET_MAX={u10:10,'10-20':20,'20-35':35,any:null};
const CONCERNS=[['breakouts','Breakouts'],['redness','Redness'],['dark spots','Dark spots'],['dryness','Dryness'],['sensitivity','Sensitivity'],['fine lines','Fine lines']];
const ageLabel=a=>String(a||'').replace('-','–');
const prof=()=>S.user&&S.user.profile;
const groupLabel=()=>{const p=prof();return p?`${TYPE_NAME[p.type]||''}, ${ageLabel(p.age)}`:'';};
const onShelf=pid=>S.shelf.find(x=>x.pid===pid);
/* Kinds. Reviews, Matches and the chat's picks cover sunscreens and moisturisers (cat sun/moist) for now; every other
   kind (cat other) can sit on a shelf and gets the ingredient check, the brand's claims and shop ratings. */
const KIND_PLURAL={'night cream':'night creams','eye cream':'eye creams',serum:'serums',cleanser:'cleansers',toner:'toners',mask:'masks',exfoliant:'exfoliants'};
const shelfOnly=p=>!!p&&p.cat==='other';
const reviewable=p=>!!p&&!p.custom&&!shelfOnly(p);
const kindLabel=p=>p.cat==='sun'?'sunscreen':p.cat==='moist'?'moisturiser':(p.kind&&p.kind!=='other'?p.kind:'face care');
const cap=t=>t?t[0].toUpperCase()+t.slice(1):'';
const notOpenLine=p=>`Reviews for ${KIND_PLURAL[p.kind]||'these products'} aren't open yet. You can keep it on your shelf.`;

/* ---------- Pieces ---------- */
/* Product pictures. A real photo when we have one: the shop's pack photo, or on her own shelf the photo she took herself.
   Her own photos stay in this browser (localStorage) and are never sent anywhere, so nobody else sees them. */
const photoKey=()=>'sp-photos-'+(S.user?S.user.id:'x');
const myPhotos=()=>store.get(photoKey())||{};
function setMyPhoto(pid,dataUrl){const m=myPhotos();if(dataUrl)m[pid]=dataUrl;else delete m[pid];store.set(photoKey(),m);}
function photoOf(p,own){
 if(!p||!p.id)return null;
 const mine=own&&myPhotos()[p.id]; if(mine)return {src:mine,own:true};
 const th=window.SP_THUMBS&&window.SP_THUMBS[p.id];
 if(th)return {src:th};
 return p.image?{src:p.image}:null;
}
document.addEventListener('error',e=>{const t=e.target;if(!t||!t.classList||!t.classList.contains('pphoto'))return;
 if(t.dataset.fb&&t.src!==t.dataset.fb){const f=t.dataset.fb;delete t.dataset.fb;t.src=f;return;}
 t.hidden=true;const s=t.nextElementSibling;if(s)s.removeAttribute('hidden');const box=t.parentElement;if(box){box.classList.remove('hasphoto');}},true);
function art(p,w=60,h=72,{own=false,large=false}={}){
 const ph=photoOf(p,own);
 if(ph){const big=large&&!ph.own&&p.image&&p.image!==ph.src;
  return `<img class="pphoto" src="${esc(big?p.image:ph.src)}"${big?` data-fb="${esc(ph.src)}"`:''} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">${artSvg(p,w,h,true)}`;}
 return artSvg(p,w,h,false);
}
function artSvg(p,w=60,h=72,hidden=false){
 const [b,d]=p.c||['#EEF1EF','#7B8A82']; let g='';
 if(p.shape==='tube') g=`<rect x="15" y="4" width="30" height="6" rx="2.5" fill="${d}" opacity=".35"/><path d="M16 9h28l-3 47H19z" fill="${b}" stroke="${d}" stroke-opacity=".25"/><rect x="22" y="56" width="16" height="15" rx="4" fill="${d}"/><rect x="22" y="22" width="16" height="18" rx="4" fill="#fff" opacity=".7"/><rect x="25" y="27" width="10" height="2.5" rx="1.2" fill="${d}" opacity=".6"/>`;
 else if(p.shape==='jar') g=`<rect x="9" y="24" width="42" height="13" rx="5" fill="${d}"/><rect x="7" y="35" width="46" height="31" rx="11" fill="${b}" stroke="${d}" stroke-opacity=".25"/><rect x="18" y="43" width="24" height="14" rx="4" fill="#fff" opacity=".7"/><rect x="22" y="48" width="16" height="2.5" rx="1.2" fill="${d}" opacity=".6"/>`;
 else if(p.shape==='pump') g=`<rect x="26" y="4" width="8" height="11" rx="2" fill="${d}"/><rect x="33" y="5" width="12" height="5" rx="2.5" fill="${d}"/><rect x="21" y="14" width="18" height="9" rx="3" fill="${d}"/><rect x="15" y="22" width="30" height="49" rx="10" fill="${b}" stroke="${d}" stroke-opacity=".25"/><rect x="21" y="36" width="18" height="18" rx="4" fill="#fff" opacity=".7"/><rect x="24" y="41" width="12" height="2.5" rx="1.2" fill="${d}" opacity=".6"/>`;
 else g=`<rect x="24" y="4" width="12" height="18" rx="5" fill="${d}"/><rect x="18" y="21" width="24" height="50" rx="9" fill="${b}" stroke="${d}" stroke-opacity=".25"/><rect x="22" y="34" width="16" height="20" rx="4" fill="#fff" opacity=".7"/><rect x="25" y="40" width="10" height="2.5" rx="1.2" fill="${d}" opacity=".6"/>`;
 return `<svg width="${w}" height="${h}" viewBox="0 0 60 76" aria-hidden="true"${hidden?' hidden':''}>${g}</svg>`;
}
const artBg=(p,own)=>photoOf(p,own)?`--artbg:${(p.c||['#EEF1EF'])[0]}`:`background:${(p.c||['#EEF1EF'])[0]}`;
const artCls=(p,own)=>photoOf(p,own)?' hasphoto':'';
function dots(yes,total,{size=8,play=false,max=24}={}){
 let n=total,y=yes; if(total>max){n=20;y=Math.round(yes/total*20);}
 let h='';for(let i=0;i<n;i++){h+=`<span class="dot ${i<y?'':'no'}" style="--c:${TONES[(i*3)%8]};--i:${i};--s:${size}px"></span>`;}
 return `<span class="dots ${play?'play':''}" aria-hidden="true">${h}</span>`;
}
function peerLine(p){
 const b=p.basis;
 if(shelfOnly(p)) return `<span class="ppeer low">${esc(cap(kindLabel(p)))} · reviews not open yet${p.hasIngredients?' · ingredient check':''}</span>`;
 if(p.peer&&p.peer.n>=5) return `<span class="ppeer">${dots(p.peer.yes,p.peer.n,{size:7})}<span>${p.peer.yes} of ${p.peer.n} women like you would buy again</span><span class="ptotal">${p.all.n} reviews in total</span></span>`;
 if(p.all&&p.all.n>=5) return `<span class="ppeer low">${p.peer&&p.peer.n?`Only ${p.peer.n} from women like you yet · `:''}${p.all.yes} of ${p.all.n} reviewers would buy again</span>`;
 if((b==='similar'||b==='similar-all')&&p.similar){const s=b==='similar'?p.similar.peer:p.similar.all;return `<span class="ppeer low"><span class="srcchip">Similar formula</span>${s.yes} of ${s.n} ${b==='similar'?'women like you':'reviewers'} would buy ${p.similar.k>1?'these':'it'} again</span>`;}
 if(b==='outside'&&p.outside) return `<span class="ppeer low"><span class="srcchip">${esc(p.outside.source)}</span>${String(p.outside.rating).replace('.',',')} out of 5 from ${p.outside.n} ratings · none here yet</span>`;
 return `<span class="ppeer low">${p.hasIngredients?'No reviews yet · ingredient check only':'No reviews yet'}</span>`;
}
function metaLine(p){
 const bits=[];
 if(p.price!=null) bits.push(`${eur(p.price)} at ${esc(p.shop)}${p.was?' (offer)':''}`);
 if(p.flags&&p.flags.fragrance===false) bits.push('fragrance-free');
 if(p.spf&&p.cat==='moist') bits.push('SPF'+p.spf);
 return bits.join(', ');
}
function pcard(p,{act='product',reason=true}={}){
 const why=reason&&p.reasons&&p.reasons[0]?`<span class="reason">${IC.check}${esc(p.reasons[0])}</span>`:(reason&&p.cautions&&p.cautions[0]?`<span class="reason warn">${IC.info}${esc(p.cautions[0])}</span>`:'');
 return `<button class="pcard" data-a="${act}" data-id="${esc(p.id)}"><span class="art${artCls(p)}" style="${artBg(p)}">${art(p,44,54)}</span><span class="meta"><span class="pname">${esc(p.name)}</span><span class="pmeta">${metaLine(p)}</span>${peerLine(p)}${why}</span></button>`;
}
function hdr(title,{back=false,right='',sub=''}={}){
 return `<header class="hdr ${back?'back':''}">${back?`<button class="iconbtn" data-a="back" aria-label="Back">${IC.back}</button>`:''}<h1>${title}${sub?`<span class="sub" style="display:block;font-family:var(--f-body);font-weight:500">${sub}</span>`:''}</h1>${right}</header>`;
}
const spinner=()=>`<div class="spin" role="status" aria-label="Loading"></div>`;
function errorBox(e,retry){
 const msg={storage_not_configured:'The database isn\'t connected yet.',signed_out:'You were signed out.',slow_down:'That\'s a lot of questions in a short time. Wait a few minutes and try again.',daily_limit:'The assistant has reached today\'s limit. Try again tomorrow.'}[e&&e.code]||'Something went wrong loading this. Check your connection and try again.';
 return `<div class="empty"><h3>Couldn't load this</h3><span>${esc(msg)}</span>${retry?`<button class="btn soft small" data-a="${retry}">Try again</button>`:''}</div>`;
}

/* ---------- Router ---------- */
const stage=$('#stage'); let stack=[];
const SCREENS={};
function build(name,params){
 const d=SCREENS[name]; const el=document.createElement('section');
 el.className='scr'+(d.tab?' tabbed':''); el.dataset.screen=name; el.setAttribute('aria-label',d.label||name);
 el.innerHTML=d.render(params||{}); return el;
}
function anim(el,frames,opts){ if(RM||!el.animate) return Promise.resolve(); return el.animate(frames,Object.assign({duration:380,easing:'cubic-bezier(.22,.8,.24,1)',fill:'both'},opts)).finished.catch(()=>{}); }
function go(name,params={},mode='push'){
 stopCamera(); closeSheet(true);
 const prev=stack[stack.length-1];
 if(prev){const b=prev.el.querySelector('.body');prev.scroll=b?b.scrollTop:0;}
 const el=build(name,params);
 if(mode==='tab'||mode==='reset') stack=[{name,params,el}];
 else if(mode==='replace'){stack.pop();stack.push({name,params,el});}
 else stack.push({name,params,el});
 stage.appendChild(el);
 setTab(SCREENS[name].tab);
 SCREENS[name].mount&&SCREENS[name].mount(el,params);
 if(!prev){return;}
 const out=prev.el;
 if(mode==='push'||mode==='replace'){
   el.style.zIndex=2;
   anim(el,[{transform:'translateX(100%)'},{transform:'none'}],{duration:420});
   anim(out,[{transform:'none',opacity:1},{transform:'translateX(-28%)',opacity:.6}],{duration:420}).then(()=>out.remove());
 } else {
   anim(el,[{opacity:0,transform:'translateY(10px) scale(.985)'},{opacity:1,transform:'none'}],{duration:300});
   anim(out,[{opacity:1},{opacity:0}],{duration:160}).then(()=>out.remove());
 }
}
function back(){
 if(stack.length<2){return;}
 stopCamera(); closeSheet(true);
 const cur=stack.pop(); const prev=stack[stack.length-1];
 const el=build(prev.name,prev.params); prev.el=el;
 stage.insertBefore(el,cur.el); setTab(SCREENS[prev.name].tab);
 SCREENS[prev.name].mount&&SCREENS[prev.name].mount(el,prev.params);
 const b=el.querySelector('.body'); if(b&&prev.scroll){b.style.scrollBehavior='auto';b.scrollTop=prev.scroll;b.style.scrollBehavior='';}
 cur.el.style.zIndex=2;
 anim(el,[{transform:'translateX(-28%)',opacity:.6},{transform:'none',opacity:1}],{duration:380});
 anim(cur.el,[{transform:'none'},{transform:'translateX(100%)'}],{duration:380}).then(()=>cur.el.remove());
}
function top(){return stack[stack.length-1];}
function refresh(){const t=top();if(!t)return;const b=t.el.querySelector('.body');const sc=b?b.scrollTop:0;t.el.innerHTML=SCREENS[t.name].render(t.params);SCREENS[t.name].mount&&SCREENS[t.name].mount(t.el,t.params,true);const nb=t.el.querySelector('.body');if(nb){nb.style.scrollBehavior='auto';nb.scrollTop=sc;nb.style.scrollBehavior='';}}
const TABS=['chat','matches','shelf','me'];
function setTab(t){
 const bar=$('#tabbar'); bar.classList.toggle('hide',!t);
 TABS.forEach(x=>{const b=$('#tab-'+x);b.classList.toggle('on',x===t);b.setAttribute('aria-current',x===t?'page':'false');});
 if(t) $('#tabind').style.transform=`translateX(${TABS.indexOf(t)*100}%)`;
}

/* ---------- Sheets & toast ---------- */
let sheetOpen=null;
function openSheet(title,html,{onMount}={}){
 closeSheet(true);
 const ov=$('#overlay');
 ov.innerHTML=`<div class="backdrop" data-a="closesheet"></div><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="grab"></div>${hdr(esc(title),{right:`<button class="iconbtn" data-a="closesheet" aria-label="Close">${IC.close}</button>`})}<div class="body">${html}</div></div>`;
 sheetOpen=true;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{const b=ov.querySelector('.backdrop'),s=ov.querySelector('.sheet');b&&b.classList.add('show');s&&s.classList.add('show');}));
 onMount&&onMount(ov.querySelector('.sheet'));
}
function closeSheet(instant){
 const ov=$('#overlay'); if(!sheetOpen&&!ov.firstChild) return;
 sheetOpen=null;
 const bd=ov.querySelector('.backdrop'),sh=ov.querySelector('.sheet');
 if(instant||RM||!sh){ov.innerHTML='';return;}
 bd&&bd.classList.remove('show'); sh.classList.remove('show'); setTimeout(()=>{if(!sheetOpen)ov.innerHTML='';},380);
}
let tt;function toast(msg){const t=$('#toast');t.innerHTML=IC.check+esc(msg);t.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('show'),2400);}
