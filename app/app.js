(function(){"use strict";
const P_='fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
const IC={
 back:`<svg width="24" height="24" viewBox="0 0 24 24" ${P_}><path d="M15 5.5 8.5 12l6.5 6.5"/></svg>`,
 close:`<svg width="22" height="22" viewBox="0 0 24 24" ${P_}><path d="M6 6l12 12M18 6 6 18"/></svg>`,
 send:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><path d="M5 12h13M12.5 6l6 6-6 6"/></svg>`,
 chat:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 17H10l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5z"/></svg>`,
 scan:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16M8 9v6M11 9v6M14 9v6M17 9v6"/></svg>`,
 search:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>`,
 check:`<svg width="18" height="18" viewBox="0 0 24 24" ${P_}><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
 plus:`<svg width="18" height="18" viewBox="0 0 24 24" ${P_}><path d="M12 5v14M5 12h14"/></svg>`,
 lock:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><rect x="5" y="10.5" width="14" height="10" rx="3"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>`,
 info:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/></svg>`,
 alert:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4M12 17h.01"/></svg>`,
 bell:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14zM10 20.5h4"/></svg>`,
 chev:`<svg width="18" height="18" viewBox="0 0 24 24" ${P_}><path d="m9.5 6 6 6-6 6"/></svg>`,
 ext:`<svg width="16" height="16" viewBox="0 0 24 24" ${P_}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`,
 trash:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/></svg>`,
 down:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>`,
 edit:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>`,
 swatch:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><circle cx="8" cy="8" r="3.5"/><circle cx="16" cy="8" r="3.5"/><circle cx="12" cy="15.5" r="3.5"/></svg>`,
 jump:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><path d="M4 12h16M14 6l6 6-6 6"/></svg>`,
 restart:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/></svg>`,
 shield:`<svg width="20" height="20" viewBox="0 0 24 24" ${P_}><path d="M12 3.5 5 6v5.5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9V6z"/></svg>`,
};

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
/* Returns what to show for a product: her own shelf photo, or the shop's full-size pack photo with a tiny built-in
   thumbnail as the instant placeholder and fallback. The full photo is always the main image, so cards and the
   product page are sharp; the thumbnail only shows while it loads, or if it can't load at all. */
function photoOf(p,own){
 if(!p||!p.id)return null;
 const mine=own&&myPhotos()[p.id]; if(mine)return {main:mine,own:true};
 const th=window.SP_THUMBS&&window.SP_THUMBS[p.id];
 if(p.image)return {main:p.image,ph:th||null};
 if(th)return {main:th};
 return null;
}
document.addEventListener('error',e=>{const t=e.target;if(!t||!t.classList||!t.classList.contains('pphoto'))return;
 const fb=t.getAttribute('data-fb');
 if(fb&&t.src!==fb){t.removeAttribute('data-fb');t.src=fb;return;}   // full photo failed: drop to the thumbnail
 t.hidden=true;const s=t.nextElementSibling;if(s)s.removeAttribute('hidden');const box=t.parentElement;if(box)box.classList.remove('hasphoto');},true);
function art(p,w=60,h=72,{own=false,large=false}={}){
 const ph=photoOf(p,own);
 if(!ph)return artSvg(p,w,h,false);
 const bg=ph.ph?` style="background-image:url(${esc(ph.ph)})"`:'';   // blurred thumbnail behind, until the full photo arrives
 return `<img class="pphoto"${bg} src="${esc(ph.main)}"${ph.ph?` data-fb="${esc(ph.ph)}"`:''} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">${artSvg(p,w,h,true)}`;
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
/* ---------- Welcome ---------- */
SCREENS.welcome={label:'Welcome',render(){
 let d=''; const N=46;
 for(let i=0;i<N;i++){const a=i*2.39996,r=Math.sqrt(i+1)*19.5;const x=50+Math.cos(a)*r/3.9,y=150+Math.sin(a)*r*.98;const s=14+((i*7)%4)*4;const peer=[2,5,7,10,13,17,22].includes(i);
  d+=`<span class="d ${peer?'peer':''}" style="--c:${TONES[(i*5)%8]};--s:${s}px;--x:${x}%;--y:${y}px;--t:${i*22}ms"></span>`;}
 return `<div class="body" style="padding-top:8px">
  <div class="hero" aria-hidden="true">${d}</div>
  <h1 class="display">Skincare that worked for women like you</h1>
  <p class="lede">Reviews from women in the Netherlands with your skin, age and budget. No ads, and brands can't pay for a better spot.</p>
 </div>
 <div class="foot">
  <button class="btn primary" data-a="signin">Get started</button>
  <button class="btn line" data-a="signin">I already have an account</button>
  <p class="fine" style="margin:4px 0 0">For ages 18 and up. The assistant gives general skincare advice, not medical advice. <a href="#" data-a="privacy">Privacy</a></p>
 </div>`;
}};

/* ---------- Sign in ---------- */
let signin={email:'',step:'email',busy:false,testCode:null};
SCREENS.signin={label:'Sign in',render(){
 if(signin.step==='code') return `${hdr('Check your email',{back:true})}
 <form class="body" id="codeform" novalidate>
  <p style="margin:0">We sent a 6-digit code to <b>${esc(signin.email)}</b>. It works for 10 minutes.</p>
  ${signin.testCode?`<div class="note butter">${IC.info}<span>Test mode: email isn't set up yet, so here is your code: <b style="letter-spacing:.2em">${esc(signin.testCode)}</b></span></div>`:''}
  <label class="label" for="code">Code</label>
  <input id="code" class="field codein" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••">
  <p class="err" id="err" role="alert"></p>
  <button class="btn primary" id="go">Sign in</button>
  <button class="btn line small" type="button" data-a="resend">Send a new code</button>
 </form>`;
 return `${hdr('Sign in or create an account',{back:true})}
 <form class="body" id="emailform" novalidate>
  <p style="margin:0">Enter your email and we'll send you a code. No password needed.</p>
  <label class="label" for="email">Email</label>
  <input id="email" class="field" type="email" autocomplete="email" inputmode="email" placeholder="name@example.com" value="${esc(signin.email)}">
  <p class="err" id="err" role="alert"></p>
  <button class="btn primary" id="go">Send me a code</button>
  <p class="fine" style="margin:0;text-align:left">We use your email only to sign you in. It's never shown with your reviews.</p>
 </form>`;
},mount(){
 const ef=$('#emailform'),cf=$('#codeform');
 if(ef){const i=$('#email');setTimeout(()=>i.focus(),350);ef.addEventListener('submit',async e=>{e.preventDefault();await sendCode(i.value.trim());});}
 if(cf){const i=$('#code');setTimeout(()=>i.focus(),350);i.addEventListener('input',()=>{i.value=i.value.replace(/\D/g,'').slice(0,6);if(i.value.length===6)verifyCode(i.value);});cf.addEventListener('submit',e=>{e.preventDefault();verifyCode(i.value);});}
}};
async function sendCode(email){
 const err=$('#err'),btn=$('#go');
 if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)){err.textContent='Enter a full email address, like name@example.com.';return;}
 btn.disabled=true;btn.textContent='Sending…';
 try{const j=await api('auth/start',{method:'POST',body:{email}});signin.email=email;signin.step='code';signin.testCode=j.testCode||null;refresh();}
 catch(e){btn.disabled=false;btn.textContent='Send me a code';err.textContent={too_many_codes:'Too many codes asked for this email. Try again in an hour.',mail_not_configured:'Sign-in email isn\'t set up yet. Ask Pari to finish the setup.',mail_failed:'The email couldn\'t be sent. Try again in a minute.',invalid_email:'That email address doesn\'t look right.'}[e.code]||'Couldn\'t send the code. Check your connection and try again.';}
}
async function verifyCode(code){
 const err=$('#err'),btn=$('#go');
 if(code.length!==6){err.textContent='Enter the 6 digits from the email.';return;}
 if(signin.busy) return; signin.busy=true; btn.disabled=true; btn.textContent='Signing in…';
 try{const j=await api('auth/verify',{method:'POST',body:{email:signin.email,code}});S.token=j.token;store.set('sp-token',j.token);signin={email:'',step:'email',busy:false,testCode:null};await boot();}
 catch(e){signin.busy=false;btn.disabled=false;btn.textContent='Sign in';err.textContent={wrong_code:'That code isn\'t right. Check the email and try again.',code_expired:'That code has expired. Send a new one.',too_many_tries:'Too many tries. Send a new code.'}[e.code]||'Couldn\'t sign in. Try again.';}
}

/* ---------- First-open screens (from the survey: trust before asking) ---------- */
const INTRO=[
 {h:'Picks from women with skin like yours',p:'We match you with women on skin type, age, skin tone and budget. You see how many of them would buy a product again, next to the total number of reviews.',ill:'peers'},
 {h:'Then we add what reviews can\'t see',p:'The assistant reads each product\'s ingredient list, and we\'re adding independent tests and expert advice. It always says where something comes from. It gives guidance, not a diagnosis.',ill:'sources'},
 {h:'No brand pays for a spot',p:'The order is decided by reviews and your skin, nothing else. If we ever earn a small fee from a shop link, it will be labelled and it won\'t change the order.',ill:'fair'},
 {h:'Your data stays yours',p:'Your profile is stored in the EU. Skin concerns are optional, photos are only used to read a label and aren\'t kept, and what you write about symptoms isn\'t saved. You can download or delete everything in Me.',ill:'data'},
 {h:'Review one, see them all',p:'Tell us how one product you already use works for you, in three taps, and you\'ll see every review. It\'s what keeps the reviews real, and it helps the next woman like you.',ill:'unlock'}
];
function introIll(k){
 const T=TONES;
 if(k==='peers'){let s='';for(let i=0;i<18;i++){const a=i/18*Math.PI*2,r=i%3?78:52;const on=[0,3,6,9,12,15].includes(i);s+=`<circle cx="${110+Math.cos(a)*r}" cy="${100+Math.sin(a)*r}" r="${on?11:8}" fill="${T[(i*3)%8]}" ${on?'stroke="#1F4D3A" stroke-width="3"':''}/>`;}return `<svg width="220" height="200" viewBox="0 0 220 200" aria-hidden="true">${s}<circle cx="110" cy="100" r="22" fill="${T[3]}" stroke="#CDEBD8" stroke-width="5"/></svg>`;}
 if(k==='sources') return `<svg width="230" height="190" viewBox="0 0 230 190" aria-hidden="true"><rect x="70" y="40" width="90" height="110" rx="18" fill="#fff"/><rect x="84" y="58" width="62" height="8" rx="4" fill="#CDEBD8"/><rect x="84" y="74" width="48" height="8" rx="4" fill="#E9F6EE"/><rect x="84" y="90" width="56" height="8" rx="4" fill="#E9F6EE"/><circle cx="40" cy="60" r="24" fill="#DCEBF7"/><path d="M30 60h20M40 50v20" stroke="#1F4A6B" stroke-width="4" stroke-linecap="round"/><circle cx="192" cy="58" r="24" fill="#FBEFD3"/><path d="M182 58l7 7 13-14" stroke="#6A4A10" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="44" cy="140" r="20" fill="#E9F6EE"/><circle cx="190" cy="138" r="20" fill="#CDEBD8"/></svg>`;
 if(k==='fair') return `<svg width="220" height="190" viewBox="0 0 220 190" aria-hidden="true"><path d="M110 30v130M70 160h80" stroke="#1F4D3A" stroke-width="6" stroke-linecap="round"/><path d="M40 60h140" stroke="#1F4D3A" stroke-width="6" stroke-linecap="round"/><path d="M40 60l-22 46h44zM180 60l-22 46h44z" fill="#CDEBD8"/><circle cx="110" cy="30" r="10" fill="#1F4D3A"/></svg>`;
 if(k==='data') return `<svg width="220" height="190" viewBox="0 0 220 190" aria-hidden="true"><path d="M110 22 50 46v42c0 40 26 66 60 80 34-14 60-40 60-80V46z" fill="#CDEBD8"/><rect x="86" y="86" width="48" height="40" rx="10" fill="#1F4D3A"/><path d="M96 86V74a14 14 0 0 1 28 0v12" stroke="#1F4D3A" stroke-width="7" fill="none"/></svg>`;
 return `<svg width="220" height="190" viewBox="0 0 220 190" aria-hidden="true"><rect x="58" y="24" width="104" height="150" rx="22" fill="#fff"/><rect x="74" y="50" width="72" height="22" rx="11" fill="#1F4D3A"/><rect x="74" y="82" width="72" height="22" rx="11" fill="#1F4D3A"/><rect x="74" y="114" width="72" height="22" rx="11" fill="#CDEBD8"/><circle cx="168" cy="40" r="20" fill="#FBEFD3"/><path d="M160 40l6 6 11-12" stroke="#6A4A10" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
}
let introI=0;
SCREENS.intro={label:'How Skin Peers works',render({again}){
 return `<div class="intro">
  <header class="hdr" style="justify-content:flex-end">${again?`<button class="iconbtn" data-a="back" aria-label="Close">${IC.close}</button>`:`<button class="btn line small" data-a="introskip">Skip</button>`}</header>
  <div class="slides" id="slides">${INTRO.map((s,i)=>`<article class="slide" aria-hidden="${i!==introI}" style="transform:translateX(${(i-introI)*100}%);opacity:${i===introI?1:0}"><div class="ill">${introIll(s.ill)}</div><h2>${esc(s.h)}</h2><p>${esc(s.p)}</p></article>`).join('')}</div>
  <div class="foot"><div class="pager" aria-label="Screen ${introI+1} of ${INTRO.length}">${INTRO.map((_,i)=>`<i class="${i===introI?'on':''}"></i>`).join('')}</div>
   <button class="btn primary" data-a="intronext">${introI<INTRO.length-1?'Next':(again?'Done':'Start')}</button></div>
 </div>`;
},mount(el,params){
 let x0=null;const sl=$('#slides',el);
 sl.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;},{passive:true});
 sl.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(dx<-40)introMove(1,params);else if(dx>40)introMove(-1,params);});
}};
function introMove(d,params){
 const n=introI+d; if(n<0) return;
 if(n>=INTRO.length){introFinish(params&&params.again,'intro_done');return;}
 introI=n; const t=top(); const el=t.el;
 el.querySelectorAll('.slide').forEach((s,i)=>{s.style.transform=`translateX(${(i-introI)*100}%)`;s.style.opacity=i===introI?1:0;s.setAttribute('aria-hidden',i!==introI);});
 el.querySelectorAll('.pager i').forEach((p,i)=>p.classList.toggle('on',i===introI));
 el.querySelector('[data-a=intronext]').textContent=introI<INTRO.length-1?'Next':(params&&params.again?'Done':'Start');
}
async function introFinish(again,ev){
 introI=0;
 if(again){back();return;}
 track(ev);
 try{const j=await api('me',{method:'PUT',body:{seenIntro:true}});S.user=j.user;}catch(e){}
 route();
}

/* ---------- Onboarding: the questions, as a short chat ---------- */
const OB=[
 {k:'age',q:'Which age group are you in?',opts:AGE_OPTS.map(a=>[a,ageLabel(a)+(a==='55+'?'':'')])},
 {k:'type',q:'How does your skin usually feel by midday?',opts:TYPE_OPTS,help:true},
 {k:'tone',q:'Which shade is closest to your skin?',tone:true,note:'This helps match sunscreens without a white cast.'},
 {k:'sun',q:'How does your skin react to the sun?',opts:SUN_OPTS},
 {k:'budget',q:'What do you usually spend on one product?',opts:BUDGET_OPTS},
 {k:'consent',q:'Want to share skin concerns too? It\'s optional. We only use them to match you, and you can delete them any time.',opts:[['yes','Yes, choose concerns'],['no','Skip']]}
];
let ob=null;
const obLabel=(s,v)=>{if(s.tone) return v?`Shade ${v} of 8`:'Rather not say';const o=(s.opts||[]).find(x=>x[0]===v);return o?o[1]:v;};
function obStepHTML(i,a){const s=OB[i];return `<div class="msg${a?' anim':''}"><div class="bub">${esc(s.q)}</div>${s.note?`<span class="pmeta" style="max-width:300px">${esc(s.note)}</span>`:''}</div>`;}
SCREENS.onboard={label:'About your skin',render(){
 ob=ob||{i:0,ans:{},concerns:[],phase:'q'};
 return `<header class="hdr back"><button class="iconbtn" data-a="obback" aria-label="Back">${IC.back}</button><div class="prog" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="${OB.length}" aria-valuenow="${ob.i}"><i id="obprog"></i></div></header>
 <div class="body" id="obbody"><div class="thread" id="obthread"></div></div>
 <div class="foot" id="obfoot"></div>`;
},mount(){obRender(false);}};
function obRender(a){
 const th=$('#obthread'); if(!th) return;
 let h=`<div class="msg"><div class="bub">${S.user&&S.user.profile?'Let\'s update your skin details.':'Hi! A few quick questions, so we can match you with women whose skin is like yours.'}</div></div>`;
 for(let j=0;j<ob.i;j++){h+=obStepHTML(j,false)+`<div class="msg me"><div class="bub">${esc(obLabel(OB[j],ob.ans[OB[j].k]))}</div></div>`;}
 if(ob.i<OB.length) h+=obStepHTML(ob.i,a);
 th.innerHTML=h; $('#obprog').style.width=(ob.i/OB.length*100)+'%'; obFoot(a);
 const b=$('#obbody'); requestAnimationFrame(()=>b.scrollTop=b.scrollHeight);
}
function obFoot(a){
 const f=$('#obfoot'); const A=a?' anim':'';
 if(ob.phase==='concerns'){
  f.innerHTML=`<div class="chips${A}">${CONCERNS.map(([k,l])=>`<button class="chip ${ob.concerns.includes(k)?'on':''}" aria-pressed="${ob.concerns.includes(k)}" data-a="obconcern" data-v="${k}">${ob.concerns.includes(k)?IC.check:''}${l}</button>`).join('')}</div><button class="btn primary" data-a="obconcernsdone">${ob.concerns.length?'Save concerns':'Skip for now'}</button>`;return;
 }
 if(ob.i>=OB.length){
  const p=ob.result;
  f.innerHTML=`<div class="summary${A}"><span style="font-size:13px;opacity:.85">Your group</span><h3>${esc(TYPE_NAME[p.type])} skin, ${esc(ageLabel(p.age))}</h3><div class="chips"><span class="tag">${esc(obLabel(OB[3],p.sun))}</span><span class="tag">${esc(obLabel(OB[4],p.budget))}</span>${p.concerns.map(c=>`<span class="tag">${esc((CONCERNS.find(x=>x[0]===c)||[c,c])[1])}</span>`).join('')}</div><span style="font-size:14px;color:#D9EEE1">Everything you see is matched to women like you.</span></div><p class="err" id="oberr" role="alert"></p><button class="btn primary${A}" data-a="obfinish" id="obfinish">Show me what works</button>`;return;
 }
 const s=OB[ob.i];
 if(s.tone){
  f.innerHTML=`<div class="swatches${A}" role="group" aria-label="Skin shade">${TONES.map((c,i)=>`<button class="swatch" style="background:${c}" data-a="obtone" data-v="${i+1}" aria-label="Shade ${i+1} of 8${i===0?', lightest':i===7?', deepest':''}"></button>`).join('')}</div><div class="row" style="justify-content:space-between"><span class="pmeta">Lightest</span><span class="pmeta">Deepest</span></div><button class="btn line small" data-a="obtone" data-v="">I'd rather not say</button>`;return;
 }
 f.innerHTML=`<div class="chips${A}">${s.opts.map(([v,l])=>`<button class="chip" data-a="obpick" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>${s.help?`<button class="helpbtn${A}" data-a="skintest">Not sure? Try the 1-minute skin test tonight</button>`:''}`;
}
function obPick(v){
 const s=OB[ob.i]; ob.ans[s.k]=v; $('#obfoot').innerHTML='';
 $('#obthread').insertAdjacentHTML('beforeend',`<div class="msg me anim"><div class="bub">${esc(obLabel(s,v))}</div></div>`);
 if(s.k==='consent'&&v==='yes'){ob.phase='concerns';setTimeout(()=>obFoot(true),250);return;}
 obNext();
}
function obNext(){
 ob.i++; ob.phase='q'; $('#obprog').style.width=(ob.i/OB.length*100)+'%';
 if(ob.i>=OB.length){const a=ob.ans;ob.result={age:a.age,type:a.type,tone:a.tone?Number(a.tone):null,sun:a.sun,budget:a.budget,concernsConsent:a.consent==='yes'&&ob.concerns.length>0,concerns:a.consent==='yes'?ob.concerns.slice():[]};}
 const th=$('#obthread');
 th.insertAdjacentHTML('beforeend',`<div class="msg anim" id="obtyping"><span class="typing"><i></i><i></i><i></i></span></div>`);
 const b=$('#obbody'); b.scrollTop=b.scrollHeight;
 setTimeout(()=>{const t=$('#obtyping');t&&t.remove();
  if(ob.i<OB.length) th.insertAdjacentHTML('beforeend',obStepHTML(ob.i,true));
  else th.insertAdjacentHTML('beforeend',`<div class="msg anim"><div class="bub">Thanks! Here's your group.</div></div>`);
  obFoot(true); b.scrollTop=b.scrollHeight;},RM?0:600);
}
async function obFinish(){
 const btn=$('#obfinish'),err=$('#oberr'); btn.disabled=true; btn.textContent='Saving…';
 try{const j=await api('me',{method:'PUT',body:{profile:ob.result}});S.user=j.user;ob=null;S.m.max=BUDGET_MAX[S.user.profile.budget]||null;route();}
 catch(e){btn.disabled=false;btn.textContent='Show me what works';err.textContent='Couldn\'t save your answers. Check your connection and try again.';}
}
/* ---------- Chat ---------- */
const STARTERS=['A moisturiser under €20','A sunscreen with no white cast','My cheeks feel tight lately','Is my sunscreen good for me?'];
SCREENS.chat={tab:'chat',label:'Chat',render(){
 return `${hdr('Chat',{sub:'Assistant, not a doctor',right:`<button class="grp" data-a="tab" data-t="me">${esc(groupLabel())}</button>`})}
 <div class="body" id="chatbody"><div class="thread" id="thread">${S.chat.map(m=>msgHTML(m,false)).join('')}</div></div>
 <form class="composer" id="composer"><label for="msg" style="position:absolute;left:-9999px">Message</label><input id="msg" autocomplete="off" maxlength="800" placeholder="${esc(chatHints()[0])}"><button class="send" aria-label="Send">${IC.send}</button></form>`;
},mount(el,params){
 if(!S.chat.length){S.chat.push({who:'bot',type:'text',text:`Hi! You're matched with women with ${(TYPE_NAME[prof().type]||'').toLowerCase()} skin, aged ${ageLabel(prof().age)}. What are you looking for?`},{who:'bot',type:'chips',chips:STARTERS},{who:'bot',type:'scan'});saveChat();$('#thread').innerHTML=S.chat.map(m=>msgHTML(m,false)).join('');}
 const b=$('#chatbody'); requestAnimationFrame(()=>b.scrollTop=b.scrollHeight);
 startHints();
 $('#composer').addEventListener('submit',e=>{e.preventDefault();const i=$('#msg');const v=i.value.trim();if(!v)return;i.value='';userSays(v);});
 if(pendingSay){const v=pendingSay;pendingSay=null;setTimeout(()=>userSays(v),350);}
 if(pendingRunout){const id=pendingRunout;pendingRunout=null;setTimeout(()=>runoutMsgs(id),350);}
}};
let pendingSay=null,pendingRunout=null,chatBusy=false;
/* The placeholder suggests what she could ask next: about the product just shown, or from her own profile and shelf. */
function lastShown(){const r=S.chat.slice(-8);for(let i=r.length-1;i>=0;i--){const m=r[i];if(m.type==='products'&&m.items&&m.items.length)return m.items;}return [];}
function chatHints(){
 const p=prof()||{},c=p.concerns||[],shown=lastShown(),asked=S.chat.some(m=>m.who==='me');
 if(shown.length){const x=shown[0];return [x.flags&&x.flags.fragrance===false?'Does it have alcohol?':'Is it fragrance-free?','Where can I buy it?',x.reviewsOpen===false?"What's in it?":'Will it break me out?','Something cheaper?','Show me another option'];}
 const mine=(S.shelf||[]).map(x=>S.cache[x.pid]).filter(Boolean)[0];
 const out=[];
 if(mine)out.push(`Is my ${mine.brand||'product'} right for me?`);
 if(c.includes('breakouts'))out.push("A sunscreen that won't break me out");
 if(p.type==='oily'||p.type==='combination')out.push("A moisturiser that isn't shiny");
 if(p.type==='dry')out.push('Something for tight, dry cheeks');
 if(c.includes('sensitivity')||c.includes('redness'))out.push('A fragrance-free sunscreen');
 out.push(p.budget==='u10'?'A sunscreen under €10':p.budget==='20-35'?'A moisturiser under €30':'A moisturiser under €20','Name a product to check it');
 if(asked)out.push('Ask a follow-up, or name a product');
 return out;
}
let hintTimer=null;
function startHints(){
 clearInterval(hintTimer);let i=0;
 const tick=()=>{const el=$('#msg');if(!el){clearInterval(hintTimer);return;}if(el.value)return;const h=chatHints();i=i%h.length;el.placeholder=h[i];i++;};
 tick(); if(!RM) hintTimer=setInterval(tick,4000);
}
function msgHTML(m,a){
 const A=a?' anim':'';
 if(m.who==='me') return `<div class="msg me${A}"><div class="bub">${esc(m.text)}</div></div>`;
 switch(m.type){
  case 'text': return `<div class="msg${A}"><div class="bub">${esc(m.text)}</div></div>`;
  case 'products': return `<div class="msg wide${A}"><div class="list">${(m.items||[]).map(p=>pcard(p)).join('')}</div></div>`;
  case 'chips': return m.used?'':`<div class="chips${A}" data-chips>${m.chips.map(c=>`<button class="chip" data-a="chip" data-v="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
  case 'scan': return `<div class="msg wide${A}"><div class="note sky" style="align-items:center"><span style="flex:1">Scan what you use now, and I'll show you what women like you think of it.</span><button class="btn primary small" data-a="startscan">${IC.scan}Scan</button></div></div>`;
  case 'safety': return `<div class="msg wide${A}"><div class="stat" style="gap:8px"><span style="font-weight:700;font-size:15px">Where to go</span><a href="https://www.thuisarts.nl" target="_blank" rel="noopener" style="font-weight:600;display:inline-flex;gap:6px;align-items:center">Thuisarts.nl: information on skin complaints ${IC.ext}</a><span style="font-size:14px">Call your huisarts. Swelling of the face or trouble breathing: call 112.</span></div><div class="note butter">${IC.shield}<span>What you write about symptoms isn't saved to your profile.</span></div></div>`;
  case 'action': return `<div class="msg wide${A}"><button class="btn ${m.style||'soft'} small" data-a="${esc(m.act)}" data-id="${esc(m.id||'')}">${esc(m.label)}</button></div>`;
  case 'error': return `<div class="msg${A}"><div class="bub" style="background:var(--rose);color:var(--rose-ink)">${esc(m.text)}</div></div>`;
 }
 return '';
}
function appendMsgs(list,a=true){const th=$('#thread');list.forEach(m=>{S.chat.push(m);th&&th.insertAdjacentHTML('beforeend',msgHTML(m,a));});saveChat();const b=$('#chatbody');b&&(b.scrollTop=b.scrollHeight);}
function consumeChips(){S.chat.forEach(m=>{if(m.type==='chips')m.used=true;});document.querySelectorAll('[data-chips]').forEach(x=>x.remove());}
function chatContext(){return {shown:lastShown().map(x=>x.id).slice(0,3),cat:S.lastCat||null};}
function convo(){return S.chat.filter(m=>m.type==='text'&&!m.local).map(m=>({role:m.who==='me'?'user':'assistant',text:m.text})).slice(-8);}
async function userSays(text){
 if(chatBusy) return; chatBusy=true;
 consumeChips(); appendMsgs([{who:'me',type:'text',text}]);
 const th=$('#thread'); th&&th.insertAdjacentHTML('beforeend',`<div class="msg anim" id="typing"><span class="typing"><i></i><i></i><i></i></span></div>`);
 const b=$('#chatbody');b&&(b.scrollTop=b.scrollHeight);
 try{
  const context=chatContext();
  const j=await api('chat',{method:'POST',body:{messages:convo(),context}});
  const t=$('#typing');t&&t.remove();
  const out=[{who:'bot',type:'text',text:j.reply}];
  if(j.medical) out.push({who:'bot',type:'safety'});
  if(j.products&&j.products.length){out.push({who:'bot',type:'products',items:j.products});S.lastCat=j.products[0].cat;}
  const chips=(j.chips||[]).filter(c=>!/^see all/i.test(c)).slice(0,3); if(j.products&&j.products.length) chips.push('See all matches');
  if(chips.length) out.push({who:'bot',type:'chips',chips});
  for(const m of out){appendMsgs([m]);await new Promise(r=>setTimeout(r,RM?0:220));}
  startHints();
 }catch(e){const t=$('#typing');t&&t.remove();appendMsgs([{who:'bot',type:'error',local:true,text:e.code==='slow_down'?'That\'s a lot of questions in a short time. Wait a few minutes and ask again.':e.code==='daily_limit'?'The assistant has reached today\'s limit. Try again tomorrow, or browse Matches.':'I couldn\'t answer that just now. Check your connection and try again.'}]);}
 chatBusy=false;
}
function chipAction(v){
 if(v==='See all matches'){consumeChips();S.m.cat=S.lastCat||S.m.cat;go('matches',{},'tab');return;}
 if(/^scan (it|my product)/i.test(v)){consumeChips();A.startscan();return;}
 if(/pause a product|stop a product/i.test(v)){consumeChips();go('shelf',{},'tab');return;}
 if(/^is my sunscreen good/i.test(v)){
  const mine=S.shelf.find(x=>x.status==='using'&&S.cache[x.pid]&&S.cache[x.pid].cat==='sun');
  if(!mine){consumeChips();appendMsgs([{who:'me',type:'text',text:v},{who:'bot',type:'text',local:true,text:'Scan it first, and I\'ll show you what women like you think of it.'},{who:'bot',type:'scan'}]);return;}
  userSays(`Is my ${S.cache[mine.pid].name} a good sunscreen for me?`);return;
 }
 userSays(v);
}
async function runoutMsgs(pid){
 const p=S.cache[pid]; if(!p) return;
 consumeChips();
 appendMsgs([{who:'bot',type:'text',local:true,text:`Your ${p.name} is probably almost empty. Want the same again, or something new?`},{who:'bot',type:'products',items:[p]},{who:'bot',type:'action',act:'buy',id:pid,label:'Buy the same again',style:'primary'}]);
 try{const j=await api('products',{query:{cat:p.cat,limit:'4'}});const alt=j.products.filter(x=>x.id!==pid).slice(0,1);
  if(alt.length) appendMsgs([{who:'bot',type:'text',local:true,text:alt[0].peer.n>=5?`Women like you rate this one higher: ${alt[0].peer.yes} of ${alt[0].peer.n} would buy it again.`:'Here\'s the top match for you right now:'},{who:'bot',type:'products',items:alt},{who:'bot',type:'chips',chips:['See all matches','Remind me later']}]);
 }catch(e){}
}

/* ---------- Matches ---------- */
SCREENS.matches={tab:'matches',label:'Matches',render(){
 const m=S.m; const kind=m.cat==='sun'?'Sunscreens':'Moisturisers';
 return `${hdr(kind+' for you',{sub:'Ranked by women like you'})}
 <div class="body" id="mbody">
  <div class="seg ${m.cat==='sun'?'right':''}" role="tablist"><span class="knob"></span><button role="tab" aria-selected="${m.cat==='moist'}" class="${m.cat==='moist'?'on':''}" data-a="mcat" data-v="moist">Moisturisers</button><button role="tab" aria-selected="${m.cat==='sun'}" class="${m.cat==='sun'?'on':''}" data-a="mcat" data-v="sun">Sunscreens</button></div>
  <div id="mfilters">${filtersHTML()}</div>
  <div id="mlist">${spinner()}</div>
  <div style="height:56px"></div>
 </div>
 <button class="fab" data-a="askabout">${IC.chat}Ask about these</button>`;
},mount(){loadMatches(false);track('matches_view');}};
function filtersHTML(){
 const m=S.m; const bmax=BUDGET_MAX[(prof()||{}).budget]||20;
 const t=(k,l,on)=>`<button class="chip sm ${on?'on':''}" aria-pressed="${on}" data-a="mf" data-k="${k}">${on?IC.check:''}${l}</button>`;
 const shops=['Kruidvat','Etos','Douglas','HEMA','Action'];
 return `<div class="chips scroll">${t('max',`Under €${m.max||bmax}`,!!m.max)}${t('ff','Fragrance-free',m.ff)}${t('nobreak','Rarely breaks out',m.nobreak)}${m.cat==='moist'?t('spf','With SPF',m.spf):''}${shops.map(s=>`<button class="chip sm ${m.shop===s?'on':''}" aria-pressed="${m.shop===s}" data-a="mshop" data-v="${s}">${m.shop===s?IC.check:''}${s}</button>`).join('')}</div>`;
}
let mreq=0;
async function loadMatches(fresh){
 const id=++mreq; const m=S.m; const box=$('#mlist'); if(!box) return;
 const q={cat:m.cat}; if(m.max)q.max=m.max; if(m.shop)q.shop=m.shop; if(m.ff)q.ff='1'; if(m.spf)q.spf='1'; if(m.nobreak)q.nobreak='1';
 try{
  const j=await api('products',{query:q}); if(id!==mreq||!$('#mlist')) return;
  j.products.forEach(p=>S.cache[p.id]=p);
  if(!j.products.length){box.innerHTML=`<div class="empty"><h3>No matches with these filters</h3><span>${m.nobreak?'"Rarely breaks out" needs at least 10 reviews per product, so newer products drop out. ':''}Remove a filter to see more products.</span><button class="btn soft small" data-a="mclear">Clear filters</button></div>`;return;}
  const samples=j.products.some(p=>p.samples);
  box.innerHTML=`<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px"><span class="label">${j.count} ${j.count===1?'match':'matches'}</span>${samples?'<span class="samplebadge">Includes sample reviews</span>':''}</div><div class="list ${fresh?'fresh':''}">${j.products.map((p,i)=>pcard(p).replace('class="pcard"',`class="pcard" style="--i:${Math.min(i,12)}"`)).join('')}</div>`;
 }catch(e){if(id===mreq&&$('#mlist'))box.innerHTML=errorBox(e,'mretry');}
}
function updateMatches(){$('#mfilters').innerHTML=filtersHTML();$('#mlist').innerHTML=spinner();loadMatches(true);}

/* ---------- Product ---------- */
SCREENS.product={label:'Product',render({id}){
 const p=S.cache[id];
 return `${hdr('',{back:true,right:`<button class="iconbtn" data-a="share" data-id="${esc(id)}" aria-label="Share">${IC.ext}</button>`})}
 <div class="body" id="pbody">${p?productTop(p):''}${spinner()}</div>
 <div class="foot" id="pfoot"></div>`;
},mount(el,{id,view},again){loadProduct(id,view,again);}};
function productTop(p){return `<div class="pstage${artCls(p)}" style="${artBg(p)}">${art(p,60,72,{large:true})}</div><div style="display:flex;flex-direction:column;gap:6px"><h2 class="ptitle">${esc(p.name)}</h2><span class="pmeta">${esc([p.size,kindLabel(p),p.spf?('SPF'+p.spf):''].filter(Boolean).join(', '))}</span></div>`;}
async function loadProduct(id,view,again){
 try{
  const d=S.cache['d:'+id]&&again?S.cache['d:'+id]:await api('product',{query:{id}});
  S.cache['d:'+id]=d; S.cache[id]=d.product;
  const t=top(); if(!t||t.name!=='product'||t.params.id!==id) return;
  const v=view||t.params.view||d.stats.view; t.params.view=v;
  $('#pbody').innerHTML=productHTML(d,v); $('#pfoot').innerHTML=productFoot(d.product);
 }catch(e){const b=$('#pbody');if(b)b.innerHTML=errorBox(e,'');}
}
function brkLine(b){
 if(!b||!b.of) return '';
 const who=b.who==='peer'?'women like you':'reviewers';
 if(b.of<10) return `<div class="kv"><span>Breakouts</span><b style="font-weight:500;color:var(--muted)">Too few reviews to say</b></div>`;
 const r=b.n/b.of; const col=r>=.15?'var(--butter-ink)':r<=.06?'var(--forest)':'var(--ink)';
 return `<div class="kv"><span>Said it broke them out</span><b style="color:${col}">${b.n} of ${b.of} ${who}</b></div>`;
}
function flagRow(label,v,good){const txt=v===true?'Yes':v===false?'No':'Not listed';const ok=v==null||good==null?'':((v===good)?' style="color:var(--forest)"':' style="color:var(--butter-ink)"');return `<div class="kv"><span>${label}</span><b${ok}>${txt}</b></div>`;}
function title1(t){return esc(/[a-z]/.test(t)?t:t.toLowerCase().replace(/(^|[\s\-/(])([a-z])/g,(m,x,y)=>x+y.toUpperCase()));}
function evidenceCard(p,st){
 const b=p.basis;
 if((b==='similar'||b==='similar-all')&&p.similar){const s=b==='similar'?p.similar.peer:p.similar.all;const who=b==='similar'?'women like you':'reviewers';
  return `<div class="stat"><span class="label">No reviews of this one yet</span>
   <div class="big">${s.yes} <small>of ${s.n} ${who} would buy ${p.similar.k>1?'these':'it'} again</small></div>${dots(s.yes,s.n,{size:s.n>24?11:13,play:true})}
   <span class="pmeta">From reviews of ${p.similar.k>1?p.similar.k+' products with a near-identical formula':'a product with a near-identical formula'}: ${p.similar.names.map(esc).join(', ')}${p.similar.k>2?' and more':''}. The same ingredients in nearly the same order often behave alike, but not always, so this counts for less as reviews of this product come in.</span>
   ${st.samples||p.samples?'<span class="samplebadge" style="align-self:flex-start">Includes sample reviews for testing</span>':''}</div>`;}
 if(b==='outside'&&p.outside) return `<div class="stat"><span class="label">No reviews here yet</span>
   <div class="big">${String(p.outside.rating).replace('.',',')} <small>out of 5 on ${esc(p.outside.source)}, ${p.outside.n} ratings</small></div>
   <span class="pmeta">This is ${esc(p.outside.source)}'s own star rating, as shown on ${esc(fmtDate(p.outside.date))}. It covers all skin types, and we can't check who rated it, so it doesn't count as "women like you".</span></div>`;
 return `<div class="empty" style="padding:8px"><h3>No reviews yet</h3><span>${p.hasIngredients?'Below is what the ingredient list and the brand say. ':''}Have you used it? Your review would be the first.</span></div>`;
}
// Label facts that matter more outside sunscreens and day creams: acids, retinoids, benzoyl peroxide and so on.
function kindRows(p){
 const f=p.flags||{}; const list=(k,l)=>Array.isArray(f[k])&&f[k].length?`<div class="kv"><span>${l}</span><b style="font-weight:500;text-align:right">${f[k].map(esc).join(', ')}</b></div>`:'';
 let h=list('acids','Exfoliating acids');
 if(p.cat!=='moist') h+=list('retinoids','Retinoids');
 if(f.benzoylPeroxide) h+=`<div class="kv"><span>Benzoyl peroxide</span><b>Yes</b></div>`;
 h+=list('azelaic','Azelaic acid')+list('vitaminC','Vitamin C');
 const sf=f.surfactants;
 if(p.kind==='cleanser'&&sf&&(sf.strong.length||sf.mild.length)) h+=`<div class="kv"><span>Cleansing agents</span><b style="font-weight:500;text-align:right">${sf.strong.length?`<span style="color:var(--butter-ink)">${sf.strong.map(esc).join(', ')} (strong)</span>${sf.mild.length?', ':''}`:''}${sf.mild.length?`${sf.mild.map(esc).join(', ')} (milder)`:''}</b></div>`;
 const hints=(p.hints||[]).slice();
 if(!hints.length&&(f.acids||[]).length) hints.push('Acids and retinoids used together can irritate.');
 if(hints.length) h+=`<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">${hints.map(t=>`<span class="reason warn">${IC.info}${esc(t)}</span>`).join('')}<span class="pmeta">Hints from the ingredient list, not promises: amounts aren't on the label.</span></div>`;
 return h;
}
function notOpenCard(p){
 return `<div class="note sky" style="flex-direction:column;gap:6px">${IC.info}<span>${esc(notOpenLine(p))}</span><span class="pmeta">Below is what the ingredient list, the brand and the shops say.</span></div>`;
}
function productHTML(d,v){
 const p=d.product, st=d.stats; const s=v==='peer'?st.peer:st.all; const f=p.flags||{};
 const small=v==='peer'&&st.peer.n<10; const own=st.all.n>=1;
 const pore=f.poreClogging; const ext=(p.external||[]).filter(e=>shelfOnly(p)||!p.outside||e.source!==p.outside.source||p.basis!=='outside');
 return `${productTop(p)}
  ${p.reasons.length||p.cautions.length?`<div style="display:flex;flex-direction:column;gap:6px">${p.reasons.map(r=>`<span class="reason">${IC.check}${esc(r)}</span>`).join('')}${p.cautions.map(r=>`<span class="reason warn">${IC.info}${esc(r)}</span>`).join('')}</div>`:''}
  ${shelfOnly(p)?notOpenCard(p):own?`<div class="seg ${v==='all'?'right':''}" role="tablist"><span class="knob"></span><button role="tab" aria-selected="${v==='peer'}" class="${v==='peer'?'on':''}" data-a="pview" data-v="peer">Women like you</button><button role="tab" aria-selected="${v==='all'}" class="${v==='all'?'on':''}" data-a="pview" data-v="all">Everyone</button></div>
  <div class="stat">
   ${s.n?`${small?`<div class="note mint" style="padding:12px">${IC.info}<span>${st.peer.n?`Only ${st.peer.n} women like you reviewed this so far.`:'No women like you reviewed this yet.'} Switch to Everyone for a fuller picture.</span></div>`:''}
   <div class="big">${s.yes} <small>of ${s.n} would buy again</small></div>${dots(s.yes,s.n,{size:s.n>24?11:13,play:true})}
   ${v==='peer'?`<div class="kv" style="border-top:1px solid var(--line);padding-top:10px"><span>Everyone, all skin types</span><b>${st.all.yes} of ${st.all.n} would buy again</b></div>`:''}
   ${brkLine(st.breakouts)}
   <span class="pmeta">${v==='peer'?`Women with ${esc(groupLabel().toLowerCase())} skin and a similar skin tone. ${st.late} used it for 3 weeks or more.`:`All skin types and ages, from ${st.all.n} reviews on Skin Peers.`}</span>
   ${st.samples?'<span class="samplebadge" style="align-self:flex-start">Includes sample reviews for testing</span>':''}`
   :`<div class="empty" style="padding:8px"><h3>No women like you yet</h3><span>Switch to Everyone to see all reviews.</span></div>`}
  </div>`:evidenceCard(p,st)}
  ${!shelfOnly(p)&&st.tags.length?`<div style="display:flex;flex-direction:column;gap:8px"><span class="label">What they mention</span><div class="chips">${st.tags.map(([t,c,good])=>`<span class="tag ${good?'':'grey'}">${esc(t)} ${c}</span>`).join('')}</div></div>`:''}
  ${!shelfOnly(p)&&d.totalNotes?`<button class="btn line" data-a="reviews" data-id="${esc(p.id)}">Read what they wrote (${d.totalNotes})</button>`:''}
  <div class="stat" style="gap:0;padding:6px 18px"><span class="label" style="padding-top:10px">From the ingredient list</span>
   ${p.cat==='sun'?`<div class="kv"><span>Filters</span><b>${f.filters?esc(f.filters[0].toUpperCase()+f.filters.slice(1)):'Not listed'}</b></div>`:''}
   ${flagRow('Fragrance',f.fragrance,false)}${flagRow('Drying alcohol',f.dryingAlcohol,false)}${p.cat==='moist'?flagRow('Retinol',f.retinol,null):p.cat==='sun'?flagRow('Tinted',f.tinted,null):''}
   <div class="kv"><span>On pore-clogging lists</span>${pore==null?'<b style="font-weight:500;color:var(--muted)">Not checked yet</b>':pore.length?`<b style="color:var(--butter-ink);text-align:right">${pore.map(title1).join(', ')}</b>`:'<b style="color:var(--forest)">None found</b>'}</div>
   ${p.actives&&p.actives.length?`<div class="kv"><span>Notable ingredients</span><b style="font-weight:500;text-align:right">${p.actives.map(esc).join(', ')}</b></div>`:''}
   ${pore&&pore.length?`<p class="pmeta" style="margin:8px 0 0">These ingredients show up on common pore-clogging lists, which come mostly from old lab tests on single ingredients. How a whole product behaves on your skin varies${shelfOnly(p)?'.':', so check what women like you report too.'}</p>`:''}
   ${kindRows(p)}
   ${p.ingredients&&p.ingredients.length?`<details class="inci"><summary>Full ingredient list (${p.ingredients.length})</summary><p>${p.ingredients.map(title1).join(', ')}</p></details>`:''}
   <p class="pmeta" style="margin:8px 0 10px">${p.ingredientsSource?`Read from the ingredient list on ${esc(p.ingredientsSource.shop)}'s website, ${esc(fmtDate(p.ingredientsSource.date))}. Brands change formulas, so check the pack.`:`Read from the ingredient list on the shop's website, ${esc(fmtDate(p.checked))}.`}</p></div>
  ${p.claims&&p.claims.length?`<div class="stat" style="gap:8px"><span class="label">What the brand says</span><div class="chips">${p.claims.map(c=>`<span class="tag grey">${esc(c)}</span>`).join('')}</div><span class="pmeta">From the product description. These are the brand's claims, not checked by us or by women here.</span></div>`:''}
  ${ext.length?`<div class="stat" style="gap:0;padding:6px 18px"><span class="label" style="padding-top:10px">Ratings on other sites</span>${ext.map(e=>`<div class="kv"><span>${esc(e.source)}</span><b>${String(e.rating).replace('.',',')} out of 5 · ${e.n} ratings</b></div>`).join('')}<p class="pmeta" style="margin:8px 0 10px">The shops' own star ratings, all skin types, as shown on ${esc(fmtDate(ext[0].date))}. We don't copy their reviews.</p></div>`:''}
  ${p.similarList&&p.similarList.length?`<div class="stat" style="gap:8px"><span class="label">Similar formulas</span>${p.similarList.map(x=>`<button class="simrow" data-a="product" data-id="${esc(x.id)}"><span>${esc(x.name)}</span><span class="pmeta">${x.same?'Same formula':'Very similar ingredients'}${x.price!=null?' · '+eur(x.price):''}${x.reviews?' · '+x.reviews+' reviews':''}</span></button>`).join('')}<span class="pmeta">Matched on the ingredient list: the same ingredients in nearly the same order.</span></div>`:''}
  <div class="note butter">${IC.info}<span><b>Independent tests.</b> None on file for this product yet. We're adding independent tests as we find them.</span></div>
  <div class="stat" style="gap:0;padding:6px 18px"><span class="label" style="padding-top:10px">Where to buy</span>${(p.shops||[]).map((s,i)=>`<div class="shoprow"><span>${esc(s.shop)}${s.online===false?' <span class="pmeta">(in shops only)</span>':''}</span><span class="price">${s.price!=null?eur(s.price):''}${s.was?`<s>${eur(s.was)}</s>`:''}</span></div>`).join('')}</div>
  <p class="fine" style="margin:0">Prices as shown on ${esc(fmtDate(p.checked))} and may have changed. No shop or brand pays for its place here.</p>`;
}
function productFoot(p){const owned=onShelf(p.id);const s=(p.shops||[]).find(x=>x.url);return `<div class="row"><button class="btn line" data-a="have" data-id="${esc(p.id)}" ${owned?'disabled':''}>${owned?IC.check+'On your shelf':'I have this'}</button>${s?`<a class="btn primary" href="${esc(s.url)}" target="_blank" rel="noopener" data-a="buyout" data-id="${esc(p.id)}">View at ${esc(s.shop)}</a>`:''}</div>`;}
function fmtDate(iso){try{return new Date(iso+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});}catch(e){return iso;}}
function reviewsSheet(id){
 const d=S.cache['d:'+id]; if(!d) return;
 const items=d.reviews.map(r=>`<div class="stat" style="gap:6px;padding:14px 16px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><span class="tag ${r.again==='n'?'grey':''}">${r.again==='y'?'Would buy again':r.again==='m'?'Maybe':'Wouldn\'t buy again'}</span><span class="pmeta">${esc(r.who)}${r.like?', like you':''}${r.stage==='l'?', 3+ weeks':''}</span></div><span>${esc(r.note)}</span>${r.sample?'<span class="samplebadge" style="align-self:flex-start">Sample review</span>':''}</div>`).join('');
 const lock=d.locked?`<div class="note sky" style="flex-direction:column;gap:10px">${IC.lock}<span>These reviews come from women like you. Share how one product you use works for you (3 taps), and you'll see all ${d.totalNotes} of them.</span><div class="row" style="align-self:flex-start"><button class="btn primary small" data-a="unlockflow">Review a product</button><button class="btn line small" data-a="whyunlock">Why?</button></div></div>`:'';
 openSheet('What they wrote',items+lock);
}
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
function scanRow(pid){const it=onShelf(pid)||{pid};const p=itemProduct(it);return `<div class="srow anim"><span class="art${artCls(p,true)}" style="${artBg(p,true)}">${art(p,36,44,{own:true})}</span><span style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0"><span class="pname" style="font-size:14px">${esc(p.name)}</span>${p.custom?'<span class="pmeta">No reviews yet. Yours can be the first.</span>':peerLine(p)}</span></div>`;}
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
async function decodePhoto(file){lastShot=null;vfCap('Reading the barcode…');$('#vfphotonote').textContent='Reading the barcode…';const code=await barcodeFromImage(file);if(!$('#vf'))return;if(!code){$('#vfphotonote').textContent='No barcode found in that photo. Try again closer, with the barcode flat and in focus.';return;}$('#vfphotonote').textContent='Hold the barcode flat, close and sharp.';onCode(code);}
let lastShot=null;
/* A small copy of her own photo, kept in this browser only, shown on her shelf and nowhere else. */
async function keepMyPhoto(pid,blob){try{const url=URL.createObjectURL(blob);const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url;});
 const S0=240,k=Math.max(S0/img.naturalWidth,S0/img.naturalHeight),c=document.createElement('canvas');c.width=c.height=S0;
 c.getContext('2d').drawImage(img,(S0-img.naturalWidth*k)/2,(S0-img.naturalHeight*k)/2,img.naturalWidth*k,img.naturalHeight*k);URL.revokeObjectURL(url);setMyPhoto(pid,c.toDataURL('image/jpeg',.72));}catch(e){}}
async function scanFound(pid,extra){
 flashVF();
 if(onShelf(pid)){vfCap('Already on your shelf: '+itemName(onShelf(pid)));resumeCamera(1800);return;}
 try{await addToShelf(pid,extra);}catch(e){vfCap('Couldn\'t save that. Check your connection.');resumeCamera(1800);return;}
 if(lastShot){await keepMyPhoto(pid,lastShot);lastShot=null;}
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
  let tm;const draw=async()=>{try{const j=await api('find',{query:{q:q.value.trim(),limit:'8'}});j.products.forEach(p=>S.cache[p.id]=p);r.innerHTML=j.products.map(p=>`<button class="pcard" data-a="pickfound" data-id="${esc(p.id)}" data-code="${esc(code||'')}"><span class="art${artCls(p,true)}" style="${artBg(p,true)}">${art(p,36,44,{own:true})}</span><span class="meta"><span class="pname" style="font-size:14px">${esc(p.name)}</span><span class="pmeta">${onShelf(p.id)?'On your shelf':esc(cap(kindLabel(p)))+(shelfOnly(p)?' · shelf and ingredient check':'')}</span></span></button>`).join('')||'<p class="pmeta" style="margin:0">Nothing with that name yet. Type it below instead.</p>';}catch(e){r.innerHTML='<p class="pmeta">Couldn\'t search right now.</p>';}};
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
 if(idBusy)return;idBusy=true;if(cam)cam.paused=true;lastShot=blob;
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
 if(r.match){const p=S.cache[r.match]||{name:r.match};openSheet('Is this your product?',`<div style="display:flex;gap:14px;align-items:center"><span class="art${artCls(p)}" style="${artBg(p)};width:60px;height:72px;border-radius:18px;display:grid;place-items:center;flex:none">${art(p,44,54)}</span><span style="display:flex;flex-direction:column;gap:2px"><span class="pname">${esc(p.name)}</span>${name?`<span class="pmeta">We read: ${esc(name)}</span>`:''}</span></div><button class="btn primary" data-a="pickfound" data-id="${esc(r.match)}">Yes, add it</button><button class="btn line" data-a="pickother" data-name="${esc(name)}">No, pick another</button>`);return;}
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
 return `<button class="srow ${it.status}" data-a="shelfitem" data-id="${esc(it.pid)}"><span class="art${artCls(p,true)}" style="${artBg(p,true)}">${art(p,38,46,{own:true})}</span><span style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0"><span class="pname" style="font-size:14px">${esc(p.name)}</span><span class="pmeta">${status}</span>${it.status==='using'&&!p.custom?`<span class="meter ${left<.15?'low':''}" aria-label="About ${Math.round(left*100)}% left"><i style="width:${Math.round(left*100)}%"></i></span>`:''}</span>${IC.chev}</button>`;
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
  <div style="display:flex;gap:12px;align-items:center"><span class="art${artCls(p,true)}" style="${artBg(p,true)};width:52px;height:62px;border-radius:14px;display:grid;place-items:center;flex:none">${art(p,40,48,{own:true})}</span><span class="pname">${esc(p.name)}</span></div>
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
<p style="margin:0">To answer your questions and read product photos, we send the question or photo to our AI provider. We don't store your chat or your photos; your chat stays on this device. A photo you take of a product on your shelf is kept on this phone only, and only you see it.</p>
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
  openSheet(p.name,`${shelfOnly(p)?`<p class="pmeta" style="margin:0">${esc(notOpenLine(p))}</p>`:''}${it.status==='using'&&reviewable(p)?`<button class="btn primary" data-a="checkin" data-id="${esc(it.pid)}" data-stage="${stage}">${stage==='early'?'Share first impressions':(it.reviewed.late?'Update my review':'Review after a few weeks')}</button>`:''}${it.status==='using'?`<button class="btn line" data-a="stopask" data-id="${esc(it.pid)}">I stopped using it</button>`:`<button class="btn line" data-a="restart" data-id="${esc(it.pid)}">I'm using it again</button>`}${p.custom?'':`<button class="btn line" data-a="product" data-id="${esc(it.pid)}">${shelfOnly(p)?'See the ingredient check':'See what women like you think'}</button>`}<label class="btn line" for="myphoto-${esc(it.pid)}">${myPhotos()[it.pid]?'Retake my photo':'Use my own photo'}</label><input type="file" accept="image/*" capture="environment" hidden id="myphoto-${esc(it.pid)}" data-pid="${esc(it.pid)}" class="myphotoin">${myPhotos()[it.pid]?`<button class="btn line" data-a="myphotodel" data-id="${esc(it.pid)}">Remove my photo</button>`:''}<p class="pmeta" style="margin:0">Your photo stays on this phone. Only you see it.</p><button class="btn line" data-a="remove" data-id="${esc(it.pid)}" style="color:var(--rose-ink)">Remove from my shelf</button>`);},
 myphotodel:(el)=>{setMyPhoto(el.dataset.id,null);closeSheet();refresh();},
 stopask:(el)=>{const id=el.dataset.id;openSheet('Why did you stop?',`<div class="chips">${['Stung or burned','Broke me out','Too greasy','Ran out',"Didn't do much",'Too expensive'].map(r=>`<button class="chip" data-a="stop" data-id="${esc(id)}" data-v="${esc(r)}">${esc(r)}</button>`).join('')}</div>`);},
 stop:async(el)=>{const next=S.shelf.map(x=>x.pid===el.dataset.id?{...x,status:'stopped',reason:el.dataset.v.toLowerCase()}:x);closeSheet();try{await saveShelf(next);toast('Moved to stopped using');refresh();}catch(e){toast('Couldn\'t save. Try again.');}},
 restart:async(el)=>{const next=S.shelf.map(x=>x.pid===el.dataset.id?{...x,status:'using',reason:null,since:new Date().toISOString()}:x);closeSheet();try{await saveShelf(next);refresh();}catch(e){}},
 remove:async(el)=>{const next=S.shelf.filter(x=>x.pid!==el.dataset.id);closeSheet();try{await saveShelf(next);setMyPhoto(el.dataset.id,null);toast('Removed from your shelf');refresh();}catch(e){}},
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
 signout:async()=>{try{await api('auth/logout',{method:'POST'});}catch(e){}store.del(chatKey());store.del(photoKey());S.chat=[];signedOut();},
 delacct:()=>openSheet('Delete your account?',`<p style="margin:0">This removes your profile, shelf and reviews for good. You can't undo it.</p><button class="btn primary" style="background:var(--rose-ink)" data-a="delconfirm">Delete my account</button><button class="btn line" data-a="closesheet">Keep my account</button>`),
 delconfirm:async(el)=>{el.disabled=true;el.textContent='Deleting…';try{await api('me',{method:'DELETE'});store.del(chatKey());store.del(photoKey());S.chat=[];closeSheet(true);signedOut();toast('Your account is deleted');}catch(e){el.disabled=false;el.textContent='Delete my account';}},
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

document.addEventListener('change',async e=>{const t=e.target;if(!t||!t.classList||!t.classList.contains('myphotoin'))return;const f=t.files&&t.files[0];if(!f)return;await keepMyPhoto(t.dataset.pid,f);closeSheet();refresh();toast('Photo saved on this phone');});

})();
