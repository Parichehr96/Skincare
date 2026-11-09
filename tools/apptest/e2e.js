const {chromium}=require('playwright');
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
await p.setInputFiles('#vfphoto','/tmp/claude-0/-home-claude/bcd12c47-bf47-5978-99fe-e31bd0328e2f/scratchpad/proto/c1.png');await p.waitForTimeout(2500);await shot('19-scan-found');
await c('[data-a=back]',800);
await c('#tab-me',1200);await shot('20-me');
const [dl]=await Promise.all([p.waitForEvent('download',{timeout:5000}).catch(()=>null),p.click('[data-a=mydata]')]);console.log('download',dl?await dl.suggestedFilename():'none');
await p.waitForTimeout(600);
const ap=await ctx.newPage();ap.on('pageerror',e=>errs.push('ADMIN '+e.message));await ap.route('**/fonts.g*/**',r=>r.abort());
await ap.goto('http://localhost:8890/app/admin.html');await ap.fill('#k','admin-key-1234567890abc');await ap.click('.gate button');await ap.waitForTimeout(1200);await ap.screenshot({path:__dirname+'/21-admin.png',fullPage:true});
await c('[data-a=delacct]',600);await c('[data-a=delconfirm]',1500);await shot('22-after-delete');
console.log('ERRORS',JSON.stringify(errs,null,1));await b.close();})();
