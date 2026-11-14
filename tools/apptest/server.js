// Local test harness: in-memory Redis (REST), fake Anthropic, static files and the API function.
const http=require('http'),fs=require('fs'),path=require('path'),url=require('url');
const ROOT=path.resolve(__dirname,'../..');
const kv=new Map(), exp=new Map();
const alive=k=>{if(exp.has(k)&&exp.get(k)<Date.now()){kv.delete(k);exp.delete(k);}return kv.has(k);};
function run(c){const [op,...a]=c;const k=a[0];alive(k);
 switch(op.toUpperCase()){
  case 'GET':return kv.has(k)?kv.get(k):null;
  case 'SET':{kv.set(k,String(a[1]));const i=a.indexOf('EX');if(i>0)exp.set(k,Date.now()+a[i+1]*1000);else if(!a.includes('KEEPTTL'))exp.delete(k);return 'OK';}
  case 'DEL':{let n=0;for(const x of a){if(kv.delete(x))n++;}return n;}
  case 'MGET':return a.map(x=>alive(x)?kv.get(x):null);
  case 'INCR':{const v=(parseInt(kv.get(k)||'0'))+1;kv.set(k,String(v));return v;}
  case 'EXPIRE':{if(a[2]==='NX'&&exp.has(k))return 0;exp.set(k,Date.now()+a[1]*1000);return 1;}
  case 'SADD':{const s=kv.get(k)||new Set();a.slice(1).forEach(x=>s.add(x));kv.set(k,s);return 1;}
  case 'SREM':{const s=kv.get(k);if(s)a.slice(1).forEach(x=>s.delete(x));return 1;}
  case 'SMEMBERS':return kv.has(k)?[...kv.get(k)]:[];
  case 'HINCRBY':{const h=kv.get(k)||{};h[a[1]]=(h[a[1]]||0)+Number(a[2]);kv.set(k,h);return h[a[1]];}
  case 'HGETALL':{const h=kv.get(k)||{};return Object.entries(h).flat().map(String);}
  case 'HGET':return (kv.get(k)||{})[a[1]]||null;
  case 'HSET':{const h=kv.get(k)||{};h[a[1]]=a[2];kv.set(k,h);return 1;}
  case 'ZINCRBY':{const z=kv.get(k)||{};z[a[2]]=(z[a[2]]||0)+Number(a[1]);kv.set(k,z);return z[a[2]];}
  case 'ZREVRANGE':{const z=kv.get(k)||{};return Object.entries(z).sort((x,y)=>y[1]-x[1]).slice(0,Number(a[2])+1).flatMap(([m,s])=>[m,String(s)]);}
  case 'RPUSH':{const l=kv.get(k)||[];l.push(...a.slice(1));kv.set(k,l);return l.length;}
  case 'LRANGE':return (kv.get(k)||[]).slice();
  case 'LREM':{const l=kv.get(k)||[];const i=l.indexOf(a[2]);if(i>=0){l.splice(i,1);return 1;}return 0;}
 } throw new Error('unsupported '+op);}
http.createServer((req,res)=>{let b='';req.on('data',d=>b+=d);req.on('end',()=>{const body=b?JSON.parse(b):null;
 const out=req.url==='/pipeline'?body.map(c=>({result:run(c)})):{result:run(body)};res.setHeader('Content-Type','application/json');res.end(JSON.stringify(out));});}).listen(8899);
// fake Anthropic
global.AI_CALLS=[];
http.createServer((req,res)=>{let b='';req.on('data',d=>b+=d);req.on('end',()=>{const j=JSON.parse(b);AI_CALLS.push(j);
 const isImg=JSON.stringify(j.messages).includes('"type":"image"');
 let text;
 if(isImg) text=JSON.stringify({readable:true,match:'cerave-hydrating-face-cream-spf50',brand:'CeraVe',product:'Hydrating Face Cream SPF50',category:'moisturiser',confidence:'high'});
 else { const sys=j.system; const ids=[...sys.matchAll(/"id":"([^"]+)"/g)].map(m=>m[1]); const last=j.messages[j.messages.length-1].content;
   text=/rash|itch/i.test(last)?JSON.stringify({reply:'I can\'t tell what it is. Please show it to your huisarts.',products:[],chips:['Something else'],topic:'medical',medical:true})
   :'Here you go:\n```json\n'+JSON.stringify({reply:'Women with skin like yours rate these highly.',products:ids.slice(0,2),chips:['Cheaper?','Fragrance-free'],topic:'find_sunscreen',medical:false})+'\n```'; }
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify({content:[{type:'text',text}]}));});}).listen(8898);
Object.assign(process.env,{KV_REST_API_URL:'http://127.0.0.1:8899',KV_REST_API_TOKEN:'t',AUTH_TEST_MODE:'1',EXPORT_KEY:'admin-key-1234567890abc',ANTHROPIC_API_KEY:process.env.NOAI?'':'test',ANTHROPIC_BASE_URL:'http://127.0.0.1:8898'});
const handler=require(ROOT+'/api/app.js');
// Tests only: a synthetic shelf-only product (cat "other"), never in data/products.json.
require(ROOT+'/api/_app/engine.js')._addTestProducts(require('./fixture-other.json'));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
http.createServer((req,res)=>{const u=url.parse(req.url,true);
 if(u.pathname==='/api/app'){let b='';req.on('data',d=>b+=d);req.on('end',()=>{req.query=u.query;try{req.body=b?JSON.parse(b):undefined;}catch(e){req.body=b;}handler(req,res);});return;}
 let p=u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname; const f=path.join(ROOT,p);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)){res.statusCode=404;return res.end('nf');}
 res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}).listen(8890,()=>console.log('ready'));
