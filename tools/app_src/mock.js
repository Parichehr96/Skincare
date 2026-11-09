/* ---------- Prototype backend: the live app's API, run inside the page ---------- */
const DBK='sp-proto-db';
const DB=Object.assign({users:{},emails:{},sessions:{},shelves:{},reviews:[],ean:{},codes:{},stats:{}},store.get(DBK)||{});
const dbSave=()=>store.set(DBK,DB);
const rid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const AGES_=['18-24','25-34','35-44','45-54','55+'],TYPES_=['dry','oily','combination','normal','unsure'],SUNS_=['burns','burns-tans','tans'],BUDGETS_=['u10','10-20','20-35','any'];
const CONC_=['breakouts','redness','dark spots','dryness','sensitivity','fine lines'],FEEL_=['hydrated','greasy','still tight','stings','broke out','no change','white cast','no white cast'],EXTRA_=['good under makeup','pills','too expensive','lasts long'];
const pickv=(v,l)=>l.includes(v)?v:null;
function cleanProfile(p){if(!p)return null;const o={age:pickv(p.age,AGES_),type:pickv(p.type,TYPES_),tone:Math.min(8,Math.max(1,parseInt(p.tone,10)||0))||null,sun:pickv(p.sun,SUNS_),budget:pickv(p.budget,BUDGETS_)||'any',concernsConsent:!!p.concernsConsent,concerns:[]};if(o.concernsConsent&&Array.isArray(p.concerns))o.concerns=[...new Set(p.concerns.filter(c=>CONC_.includes(c)))];return o.age&&o.type?o:null;}
function bump(n){DB.stats[n]=(DB.stats[n]||0)+1;}
let sampleFn=null;
async function getSample(){if(sampleFn!==null)return sampleFn;try{if(!window.claude||!window.claude.use){sampleFn=false;return false;}const s=await window.claude.use('sample');if(!s){sampleFn=false;return false;}const lim=await s.limits().catch(()=>null);s._images=!!(lim&&lim.images);sampleFn=s;return s;}catch(e){sampleFn=false;return false;}}
getSample();
async function aiChat(messages,profile,reviews){
 const last=(messages[messages.length-1]||{}).text||'';
 const cands=[...ENG.rank(reviews,profile,{cat:'sun'}).slice(0,12),...ENG.rank(reviews,profile,{cat:'moist'}).slice(0,12)];
 const s=await getSample(); let out=null,usedAI=false;
 if(s){
  const turns=[{role:'user',content:AIX.SYSTEM(profile,cands,true)+'\n\nThe conversation so far follows. Answer her last message.'}];
  messages.slice(-8).forEach(m=>{const role=m.role==='assistant'?'assistant':'user';const t=String(m.text||'').slice(0,1500)||'…';if(turns[turns.length-1].role===role)turns[turns.length-1].content+='\n\n'+t;else turns.push({role,content:t});});
  if(turns[turns.length-1].role!=='user')turns.push({role:'user',content:'(continue)'});
  try{out=await s.json(turns,{modelTier:'quick',cache:false});usedAI=!!out;}catch(e){if(e&&(e.code==='not_granted'||e.code==='sampling_disabled'))sampleFn=false;}
 }
 if(!out||typeof out.reply!=='string') out=AIX.fallback(last,profile,reviews);
 const all=Object.fromEntries(ENG.rank(reviews,profile,{}).map(c=>[c.id,c]));
 const ids=(Array.isArray(out.products)?out.products:[]).map(String).filter(id=>all[id]).slice(0,3);
 return {reply:String(out.reply).slice(0,1200),products:ids.map(id=>all[id]),chips:(Array.isArray(out.chips)?out.chips:[]).map(String).filter(Boolean).slice(0,3),topic:String(out.topic||'other'),medical:!!out.medical||(AIX.MEDICAL.test(last)&&out.topic==='medical'),ai:usedAI};
}
async function aiIdentify(image){
 const s=await getSample(); if(!s||!s._images) throw new ApiError('ai_not_configured',503);
 const blob=await (await fetch(image)).blob();
 const prompt=`You identify skincare products from a photo for a Dutch skincare app. Read the brand and product name from the packaging (Dutch or English). Then pick the matching id from this catalogue. Only match the same brand and product line; a different variant or SPF is not a match.\n\nCatalogue:\n${ENG.PRODUCTS.map(p=>p.id+': '+p.name).join('\n')}\n\nReply with only JSON: {"readable": true, "match": "id or null", "brand": "...", "product": "...", "category": "sunscreen|moisturiser|other", "confidence": "high|medium|low"}. readable is false when no label can be read.`;
 let j;try{j=await s.json(prompt,{images:[blob],modelTier:'quick',cache:false});}catch(e){if(e&&(e.code==='not_granted'||e.code==='images_unavailable'))throw new ApiError('ai_not_configured',503);throw new ApiError('error',500);}
 j=j||{};const match=j.match&&ENG.BY_ID[j.match]?j.match:null;
 return {readable:j.readable!==false,match,brand:String(j.brand||''),product:String(j.product||''),category:['sunscreen','moisturiser','other'].includes(j.category)?j.category:'other',confidence:['high','medium','low'].includes(j.confidence)?j.confidence:'low'};
}
const realReviews=()=>DB.reviews;
const reviewsAll=()=>ENG.allReviews(DB.reviews,true);
async function localApi(route,{method='GET',body={},query={}}={}){
 await new Promise(r=>setTimeout(r,120));
 const m=method; body=body||{};
 if(route==='auth/start'){const email=String(body.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email))throw new ApiError('invalid_email',400);const code=String(Math.floor(Math.random()*1e6)).padStart(6,'0');DB.codes[email]=code;dbSave();return {ok:true,sent:false,testCode:code};}
 if(route==='auth/verify'){const email=String(body.email||'').trim().toLowerCase();if(!DB.codes[email])throw new ApiError('code_expired',400);if(DB.codes[email]!==String(body.code))throw new ApiError('wrong_code',400);delete DB.codes[email];let uid=DB.emails[email],isNew=false;if(!uid){uid='u_'+rid();isNew=true;DB.users[uid]={id:uid,email,createdAt:new Date().toISOString(),profile:null,seenIntro:false,unlocked:false,reminders:true};DB.emails[email]=uid;DB.shelves[uid]=[];}const token='t_'+rid()+rid();DB.sessions[token]=uid;bump(isNew?'signup':'signin');dbSave();return {token,isNew};}
 const uid=DB.sessions[S.token]; const user=uid&&DB.users[uid];
 if(!user){signedOut();throw new ApiError('signed_out',401);}
 if(route==='auth/logout'){delete DB.sessions[S.token];dbSave();return {ok:true};}
 if(route==='me'&&m==='GET') return {user:{...user},shelf:(DB.shelves[uid]||[]).map(x=>({...x}))};
 if(route==='me'&&m==='PUT'){if('profile' in body){const p=cleanProfile(body.profile);if(!p)throw new ApiError('bad_profile',400);if(!user.profile)bump('onboard_done');user.profile=p;}if('seenIntro' in body)user.seenIntro=!!body.seenIntro;if('reminders' in body)user.reminders=!!body.reminders;if(body.deleteConcerns&&user.profile){user.profile.concerns=[];user.profile.concernsConsent=false;}dbSave();return {user:{...user}};}
 if(route==='me'&&m==='DELETE'){DB.reviews=DB.reviews.filter(r=>r.uid!==uid);delete DB.shelves[uid];delete DB.emails[user.email];delete DB.users[uid];Object.keys(DB.sessions).forEach(t=>{if(DB.sessions[t]===uid)delete DB.sessions[t];});dbSave();return {ok:true};}
 if(route==='me/export') return {exportedAt:new Date().toISOString(),account:user,shelf:DB.shelves[uid]||[],reviews:DB.reviews.filter(r=>r.uid===uid),note:'Chat messages are kept only on your device.'};
 if(route==='shelf'&&m==='PUT'){const prev=Object.fromEntries((DB.shelves[uid]||[]).map(x=>[x.pid,x.reviewed]));const seen=new Set();const next=[];for(const it of (body.shelf||[]).slice(0,100)){if(!it||!it.pid||seen.has(it.pid))continue;seen.add(it.pid);const custom=!ENG.BY_ID[it.pid];next.push({pid:it.pid,status:it.status==='stopped'?'stopped':'using',since:it.since||new Date().toISOString(),reason:it.reason||null,name:custom?String(it.name||it.pid).slice(0,120):undefined,cat:custom?(it.cat==='sun'?'sun':'moist'):undefined,reviewed:prev[it.pid]||{early:false,late:false}});if(!prev[it.pid])bump('shelf_add');}DB.shelves[uid]=next;dbSave();return {shelf:next.map(x=>({...x}))};}
 if(route==='products'){const q=query;const list=ENG.rank(reviewsAll(),user.profile,{cat:pickv(q.cat,['sun','moist']),max:q.max?Number(q.max):null,shop:q.shop||null,ff:q.ff==='1',spf:q.spf==='1',nobreak:q.nobreak==='1',q:q.q||null});return {products:list.slice(0,Number(q.limit)||60),count:list.length};}
 if(route==='product'){const d=ENG.detail(reviewsAll(),user.profile,String(query.id||''),user.unlocked);if(!d)throw new ApiError('not_found',404);bump('product_view');return d;}
 if(route==='review'){const pid=String(body.pid||'');if(!ENG.BY_ID[pid])throw new ApiError('unknown_product',400);const a=pickv(body.again,['y','m','n']);if(!a)throw new ApiError('bad_review',400);const s=body.stage==='late'?'l':'e';const p=user.profile;
  DB.reviews=DB.reviews.filter(x=>!(x.uid===uid&&x.p===pid&&x.s===s));
  DB.reviews.push({id:'r_'+rid(),p:pid,a,s,uid,at:new Date().toISOString(),f:[...new Set((body.feel||[]).concat(body.stopped==='broke me out'?['broke out']:[]))].filter(x=>FEEL_.includes(x)),x:(body.extra||[]).filter(x=>EXTRA_.includes(x)),n:String(body.note||'').replace(/\s+/g,' ').trim().slice(0,300),g:{type:p.type,age:p.age,tone:p.tone,sun:p.sun,c:p.concerns||[]}});
  const first=!user.unlocked;user.unlocked=true;const shelf=DB.shelves[uid]||(DB.shelves[uid]=[]);let item=shelf.find(x=>x.pid===pid);if(!item){item={pid,status:'using',since:new Date().toISOString(),reviewed:{early:false,late:false}};shelf.push(item);}item.reviewed={...item.reviewed,[s==='l'?'late':'early']:true};if(body.stopped){item.status='stopped';item.reason=String(body.stopped);}
  bump(s==='l'?'review_late':'review_early');if(first)bump('unlock');dbSave();
  const mine=ENG.features(p);const peers=new Set(DB.reviews.filter(x=>x.uid&&x.uid!==uid&&ENG.sim(mine,x.g)>=ENG.PEER_MIN).map(x=>x.uid)).size;
  return {ok:true,firstUnlock:first,helps:peers,shelf:shelf.map(x=>({...x}))};}
 if(route==='chat'){const msgs=(body.messages||[]).filter(x=>x&&typeof x.text==='string').slice(-8);if(!msgs.length)throw new ApiError('no_message',400);bump('chat');return aiChat(msgs,user.profile,reviewsAll());}
 if(route==='identify'){bump('identify');return aiIdentify(body.image);}
 if(route==='ean'&&m==='GET') return {pid:DB.ean[String(query.code||'')]||null};
 if(route==='ean'&&m==='POST'){if(ENG.BY_ID[body.pid])DB.ean[String(body.code)]=body.pid;dbSave();return {ok:true};}
 if(route==='event'){bump(String(body.name||''));dbSave();return {ok:true};}
 throw new ApiError('unknown_route',404);
}
