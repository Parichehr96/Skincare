/* ---------- Chat ---------- */
const STARTERS=['A moisturiser under €20','A sunscreen with no white cast','My cheeks feel tight lately','Is my sunscreen good for me?'];
SCREENS.chat={tab:'chat',label:'Chat',render(){
 return `${hdr('Chat',{sub:'Assistant, not a doctor',right:`<button class="grp" data-a="tab" data-t="me">${esc(groupLabel())}</button>`})}
 <div class="body" id="chatbody"><div class="thread" id="thread">${S.chat.map(m=>msgHTML(m,false)).join('')}</div></div>
 <form class="composer" id="composer"><label for="msg" style="position:absolute;left:-9999px">Message</label><input id="msg" autocomplete="off" maxlength="800" placeholder="Ask anything about skincare"><button class="send" aria-label="Send">${IC.send}</button></form>`;
},mount(el,params){
 if(!S.chat.length){S.chat.push({who:'bot',type:'text',text:`Hi! You're matched with women with ${(TYPE_NAME[prof().type]||'').toLowerCase()} skin, aged ${ageLabel(prof().age)}. What are you looking for?`},{who:'bot',type:'chips',chips:STARTERS},{who:'bot',type:'scan'});saveChat();$('#thread').innerHTML=S.chat.map(m=>msgHTML(m,false)).join('');}
 const b=$('#chatbody'); requestAnimationFrame(()=>b.scrollTop=b.scrollHeight);
 $('#composer').addEventListener('submit',e=>{e.preventDefault();const i=$('#msg');const v=i.value.trim();if(!v)return;i.value='';userSays(v);});
 if(pendingSay){const v=pendingSay;pendingSay=null;setTimeout(()=>userSays(v),350);}
 if(pendingRunout){const id=pendingRunout;pendingRunout=null;setTimeout(()=>runoutMsgs(id),350);}
}};
let pendingSay=null,pendingRunout=null,chatBusy=false;
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
function convo(){return S.chat.filter(m=>m.type==='text'&&!m.local).map(m=>({role:m.who==='me'?'user':'assistant',text:m.text})).slice(-8);}
async function userSays(text){
 if(chatBusy) return; chatBusy=true;
 consumeChips(); appendMsgs([{who:'me',type:'text',text}]);
 const th=$('#thread'); th&&th.insertAdjacentHTML('beforeend',`<div class="msg anim" id="typing"><span class="typing"><i></i><i></i><i></i></span></div>`);
 const b=$('#chatbody');b&&(b.scrollTop=b.scrollHeight);
 try{
  const j=await api('chat',{method:'POST',body:{messages:convo()}});
  const t=$('#typing');t&&t.remove();
  const out=[{who:'bot',type:'text',text:j.reply}];
  if(j.medical) out.push({who:'bot',type:'safety'});
  if(j.products&&j.products.length){out.push({who:'bot',type:'products',items:j.products});S.lastCat=j.products[0].cat;}
  const chips=(j.chips||[]).filter(c=>!/^see all/i.test(c)).slice(0,3); if(j.products&&j.products.length) chips.push('See all matches');
  if(chips.length) out.push({who:'bot',type:'chips',chips});
  for(const m of out){appendMsgs([m]);await new Promise(r=>setTimeout(r,RM?0:220));}
 }catch(e){const t=$('#typing');t&&t.remove();appendMsgs([{who:'bot',type:'error',local:true,text:e.code==='slow_down'?'That\'s a lot of questions in a short time. Wait a few minutes and ask again.':e.code==='daily_limit'?'The assistant has reached today\'s limit. Try again tomorrow, or browse Matches.':'I couldn\'t answer that just now. Check your connection and try again.'}]);}
 chatBusy=false;
}
function chipAction(v){
 if(v==='See all matches'){consumeChips();S.m.cat=S.lastCat||S.m.cat;go('matches',{},'tab');return;}
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
function productTop(p){return `<div class="pstage" style="${artBg(p)}">${art(p)}</div><div style="display:flex;flex-direction:column;gap:6px"><h2 class="ptitle">${esc(p.name)}</h2><span class="pmeta">${esc([p.size,p.cat==='sun'?'sunscreen':'moisturiser',p.spf?('SPF'+p.spf):''].filter(Boolean).join(', '))}</span></div>`;}
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
function productHTML(d,v){
 const p=d.product, st=d.stats; const s=v==='peer'?st.peer:st.all; const f=p.flags||{};
 const small=v==='peer'&&st.peer.n<10; const own=st.all.n>=1;
 const pore=f.poreClogging; const ext=(p.external||[]).filter(e=>!p.outside||e.source!==p.outside.source||p.basis!=='outside');
 return `${productTop(p)}
  ${p.reasons.length||p.cautions.length?`<div style="display:flex;flex-direction:column;gap:6px">${p.reasons.map(r=>`<span class="reason">${IC.check}${esc(r)}</span>`).join('')}${p.cautions.map(r=>`<span class="reason warn">${IC.info}${esc(r)}</span>`).join('')}</div>`:''}
  ${own?`<div class="seg ${v==='all'?'right':''}" role="tablist"><span class="knob"></span><button role="tab" aria-selected="${v==='peer'}" class="${v==='peer'?'on':''}" data-a="pview" data-v="peer">Women like you</button><button role="tab" aria-selected="${v==='all'}" class="${v==='all'?'on':''}" data-a="pview" data-v="all">Everyone</button></div>
  <div class="stat">
   ${s.n?`${small?`<div class="note mint" style="padding:12px">${IC.info}<span>${st.peer.n?`Only ${st.peer.n} women like you reviewed this so far.`:'No women like you reviewed this yet.'} Switch to Everyone for a fuller picture.</span></div>`:''}
   <div class="big">${s.yes} <small>of ${s.n} would buy again</small></div>${dots(s.yes,s.n,{size:s.n>24?11:13,play:true})}
   ${v==='peer'?`<div class="kv" style="border-top:1px solid var(--line);padding-top:10px"><span>Everyone, all skin types</span><b>${st.all.yes} of ${st.all.n} would buy again</b></div>`:''}
   ${brkLine(st.breakouts)}
   <span class="pmeta">${v==='peer'?`Women with ${esc(groupLabel().toLowerCase())} skin and a similar skin tone. ${st.late} used it for 3 weeks or more.`:`All skin types and ages, from ${st.all.n} reviews on Skin Peers.`}</span>
   ${st.samples?'<span class="samplebadge" style="align-self:flex-start">Includes sample reviews for testing</span>':''}`
   :`<div class="empty" style="padding:8px"><h3>No women like you yet</h3><span>Switch to Everyone to see all reviews.</span></div>`}
  </div>`:evidenceCard(p,st)}
  ${st.tags.length?`<div style="display:flex;flex-direction:column;gap:8px"><span class="label">What they mention</span><div class="chips">${st.tags.map(([t,c,good])=>`<span class="tag ${good?'':'grey'}">${esc(t)} ${c}</span>`).join('')}</div></div>`:''}
  ${d.totalNotes?`<button class="btn line" data-a="reviews" data-id="${esc(p.id)}">Read what they wrote (${d.totalNotes})</button>`:''}
  <div class="stat" style="gap:0;padding:6px 18px"><span class="label" style="padding-top:10px">From the ingredient list</span>
   ${p.cat==='sun'?`<div class="kv"><span>Filters</span><b>${f.filters?esc(f.filters[0].toUpperCase()+f.filters.slice(1)):'Not listed'}</b></div>`:''}
   ${flagRow('Fragrance',f.fragrance,false)}${flagRow('Drying alcohol',f.dryingAlcohol,false)}${p.cat==='moist'?flagRow('Retinol',f.retinol,null):flagRow('Tinted',f.tinted,null)}
   <div class="kv"><span>On pore-clogging lists</span>${pore==null?'<b style="font-weight:500;color:var(--muted)">Not checked yet</b>':pore.length?`<b style="color:var(--butter-ink);text-align:right">${pore.map(title1).join(', ')}</b>`:'<b style="color:var(--forest)">None found</b>'}</div>
   ${p.actives&&p.actives.length?`<div class="kv"><span>Notable ingredients</span><b style="font-weight:500;text-align:right">${p.actives.map(esc).join(', ')}</b></div>`:''}
   ${pore&&pore.length?`<p class="pmeta" style="margin:8px 0 0">These ingredients show up on common pore-clogging lists, which come mostly from old lab tests on single ingredients. How a whole product behaves on your skin varies, so check what women like you report too.</p>`:''}
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
