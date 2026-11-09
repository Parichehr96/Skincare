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
