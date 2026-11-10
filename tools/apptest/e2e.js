// Ignores two console errors the test causes itself: blocked font requests (ERR_FAILED) and the serum review it sends to check the 400 refusal.
// Drives the app at http://localhost:8890 (start tools/apptest/server.js first). Screenshots land next to this file.
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const PHOTO=process.env.PHOTO||path.join(__dirname,'photo.png');
const fails=[];const check=(ok,msg)=>{console.log((ok?'ok   ':'FAIL ')+msg);if(!ok)fails.push(msg);};
(async()=>{
const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,acceptDownloads:true});
const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push('PE '+e.message));p.on('console',m=>{if(m.type()==='error')errs.push('C '+m.text())});
await p.route('**/fonts.g*/**',r=>r.abort());
const shot=async n=>{await p.waitForTimeout(500);await p.screenshot({path:__dirname+'/'+n+'.png'});};
const c=async(sel,w=600)=>{await p.click(sel);await p.waitForTimeout(w);};
await p.goto('http://localhost:8890/app/');await p.waitForTimeout(1200);await shot('01-welcome');
await c('[data-a=signin]');await p.fill('#email','pari.test@example.com');await c('#go',1000);
const code=(await p.textContent('.note.butter b')).trim();await shot('02-code');
await p.fill('#code',code);await p.waitForTimeout(1500);await shot('03-intro1');
for(let i=0;i<4;i++){await c('[data-a=intronext]',450);} await shot('04-intro5'); await c('[data-a=intronext]',1200);
await c('[data-a=obpick][data-v="25-34"]',900);await c('[data-a=obpick][data-v="combination"]',900);await shot('05-tone');
await c('[data-a=obtone][data-v="3"]',900);await c('[data-a=obpick][data-v="burns-tans"]',900);await c('[data-a=obpick][data-v="10-20"]',900);
await c('[data-a=obpick][data-v="yes"]',600);await c('[data-a=obconcern][data-v="sensitivity"]',300);await c('[data-a=obconcernsdone]',900);await shot('06-summary');
await c('[data-a=obfinish]',1500);await shot('07-chat');
await c('[data-a=chip][data-v="A sunscreen with no white cast"]',2500);await shot('08-chat-answer');
await p.fill('#msg','I have a red itchy rash on my cheek');await p.press('#msg','Enter');await p.waitForTimeout(2500);await shot('09-medical');
await c('.pcard',1800);await shot('10-product');
await p.evaluate(()=>document.querySelector('#pbody').scrollTop=600);await shot('11-product-lower');
const hasReviews=await p.$('[data-a=reviews]'); if(hasReviews){await hasReviews.click();await p.waitForTimeout(800);await shot('12-reviews-locked');await c('.sheet [data-a=closesheet]',500);}
await c('[data-a=have]',1000);
await c('#tab-shelf',1800);await shot('13-shelf');
await c('.note [data-a=checkin]',900);await c('[data-a=ck1][data-v=y]',300);await c('[data-a=ckm][data-v=hydrated]',300);await p.fill('#cknote','Light and no stinging.');await c('#cksave',1800);await shot('14-celebrate');
await c('[data-a=celebratedone]',1200);
await c('#tab-matches',1800);await shot('15-matches');await c('[data-a=mcat][data-v=sun]',1500);await c('[data-a=mf][data-k=ff]',1500);await shot('16-matches-sun');
await c('.pcard',1800);if(await p.$('[data-a=reviews]')){await c('[data-a=reviews]',800);await shot('17-reviews-unlocked');await c('.sheet [data-a=closesheet]',500);}
await c('[data-a=back]',800);
await c('#tab-shelf',1200);await c('[data-a=startscan]',1500);await shot('18-scan');
if(!fs.existsSync(PHOTO))await p.screenshot({path:PHOTO});// any image: the fake AI ignores the pixels
await p.setInputFiles('#vfphoto',PHOTO);await p.waitForTimeout(2500);await shot('19-scan-found');
await c('[data-a=back]',800);
// A shelf-only kind (synthetic fixture): search finds it, the shelf keeps it, its page has no reviews.
await c('#tab-shelf',1200);await c('[data-a=startscan]',1500);await c('[data-a=searchname]',900);
await p.fill('#uq','Testmerk');await p.waitForTimeout(1200);await shot('19b-search-other');
check(await p.$('[data-a=pickfound][data-id="test-other-glow-serum"]')!==null,'search by name finds a serum');
await c('[data-a=pickfound][data-id="test-other-glow-serum"]',1200);await c('[data-a=back]',1200);
await shot('19c-shelf-other');
check(!(await p.textContent('#shelfbody')).includes('Review Testmerk'),'no review prompt for the serum on the shelf');
await c('.srow[data-id="test-other-glow-serum"]',900);
check((await p.textContent('.sheet')).includes("Reviews for serums aren't open yet"),'shelf sheet says reviews are not open');
check(await p.$('.sheet [data-a=checkin]')===null,'no check-in button for the serum');
await c('.sheet [data-a=product][data-id="test-other-glow-serum"]',1800);await shot('19d-product-other');
const ptxt=await p.textContent('#pbody');
check(ptxt.includes("Reviews for serums aren't open yet. You can keep it on your shelf."),'product page: reviews not open line');
check(ptxt.includes('Exfoliating acids')&&ptxt.includes('Glycolic acid'),'product page: acids row');
check(ptxt.includes('can irritate'),'product page: acids and retinoid caution');
check(ptxt.includes('What the brand says')&&ptxt.includes('Ratings on other sites')&&ptxt.includes('Similar formulas'),'product page: claims, shop ratings, similar formulas');
check(!ptxt.includes('women like you')&&await p.$('[data-a=reviews]')===null&&await p.$('[data-a=pview]')===null,'product page: no peer block, no reviews');
await p.evaluate(()=>document.querySelector('#pbody').scrollTop=900);await shot('19e-product-other-lower');
const apiRes=await p.evaluate(async()=>{const t=JSON.parse(localStorage.getItem('sp-token'));const h={'Content-Type':'application/json',Authorization:'Bearer '+t};
 const rv=await fetch('/api/app?r=review',{method:'POST',headers:h,body:JSON.stringify({pid:'test-other-glow-serum',again:'y',feel:['hydrated']})});
 const pr=await (await fetch('/api/app?r=products&limit=2000',{headers:h})).json();
 const pq=await (await fetch('/api/app?r=products&q=Testmerk',{headers:h})).json();
 const fd=await (await fetch('/api/app?r=find&q=Testmerk',{headers:h})).json();
 return {status:rv.status,body:await rv.json(),other:pr.products.filter(x=>x.cat==='other').length,pq:pq.count,fd:fd.products.map(x=>x.kind)};});
check(apiRes.status===400&&apiRes.body.error==='reviews_not_open','review of a serum is refused with reviews_not_open');
check(apiRes.other===0&&apiRes.pq===0,'products route never returns other kinds');
check(apiRes.fd.includes('serum')&&apiRes.fd.includes('cleanser'),'find returns every kind');
await c('[data-a=back]',800);
await c('#tab-me',1200);await shot('20-me');
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}).catch(()=>null),p.click('[data-a=mydata]')]);console.log('download',dl?await dl.suggestedFilename():'none');
await p.waitForTimeout(600);
const ap=await ctx.newPage();ap.on('pageerror',e=>errs.push('ADMIN '+e.message));await ap.route('**/fonts.g*/**',r=>r.abort());
await ap.goto('http://localhost:8890/app/admin.html');await ap.fill('#k','admin-key-1234567890abc');await ap.click('.gate button');await ap.waitForTimeout(1200);await ap.screenshot({path:__dirname+'/21-admin.png',fullPage:true});
await c('[data-a=delacct]',600);await c('[data-a=delconfirm]',1500);await shot('22-after-delete');
const EXPECTED=[/net::ERR_FAILED/,/status of 400/];const real=errs.filter(e=>!EXPECTED.some(r=>r.test(e)));console.log('ERRORS',JSON.stringify(real,null,1));console.log(fails.length?fails.length+' checks failed':'all checks passed');await b.close();process.exit(fails.length||real.length?1:0);})();
