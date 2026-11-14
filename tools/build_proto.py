"""Build the single-file prototype: the real app with tools/app_src/mock.js as its backend, run inside the page.

    python3 tools/build_proto.py [out_dir]     (default: tools/proto/, which git ignores)
"""
import json,re,os,sys
HERE=os.path.dirname(os.path.abspath(__file__))
R=os.path.dirname(HERE); A=os.path.join(HERE,'app_src')
OUT=os.path.abspath(sys.argv[1]) if len(sys.argv)>1 else os.path.join(HERE,'proto')
os.makedirs(OUT,exist_ok=True)
eng=open(R+'/api/_app/engine.js').read()
eng=eng.replace('const PRODUCTS = require("../../data/products.json");','const PRODUCTS = PRODUCTS0;')
eng=eng.replace('const SAMPLES = require("../../data/sample-reviews.json").map((r) => ({ ...r, sample: true }));','const SAMPLES = SAMPLES0.map((r) => ({ ...r, sample: true }));')
assert 'require(' not in eng
eng=eng.replace('module.exports = {','return {')
ai=open(R+'/api/_app/ai.js').read()
ai=ai.replace('const engine = require("./engine");','')
ai=ai.replace('module.exports = { chat, identify, hasKey, MEDICAL, fallback, mentioned };','return { SYSTEM, fallback, MEDICAL, extras };')
assert 'require(' not in ai
main=open(A+'/main.js').read()
i=main.index('async function api(route'); j=main.index('function track(name)')
main=main[:i]+"async function api(route,opts={}){return localApi(route,opts);}\n"+main[j:]
s1=open(A+'/screens1.js').read().replace("Test mode: email isn't set up yet, so here is your code:","Prototype: no email is sent. Your code is")
s1=s1.replace("We sent a 6-digit code to","In the real app we'd email a 6-digit code to")
s3=open(A+'/screens3.js').read()
old='<p class="fine">Early version. Some review numbers include sample reviews for testing; they\'re marked where they appear.</p>'
assert old in s3
s3=s3.replace(old,'<span class="label">Prototype tools</span><div class="group"><button class="item" data-a="protoreset">${IC.restart}<span class="grow">Start over<small>Clears every account, shelf and review in this prototype</small></span></button></div><p class="fine">Prototype. It runs inside Claude with the real app\'s product list and matching. Review numbers include marked sample reviews.</p>')
s3=s3.replace("Photo recognition isn\\'t switched on yet. Pick the product instead.","Photo recognition needs your OK to use Claude. Pick the product instead.")
extra=r'''
A.mydata=async()=>{try{const j=await api('me/export');const txt=JSON.stringify(j,null,2);openSheet('Your data',`<p style="margin:0">In the real app this downloads as a file. Here it is as text.</p><pre style="white-space:pre-wrap;word-break:break-word;background:#fff;border-radius:16px;padding:12px;font-size:12px;max-height:50vh;overflow:auto" id="datatxt">${esc(txt)}</pre><button class="btn primary" id="copydata">Copy</button>`,{onMount(sh){sh.querySelector('#copydata').onclick=async e=>{try{await navigator.clipboard.writeText(txt);e.target.textContent='Copied';}catch(x){const r=document.createRange();r.selectNodeContents(sh.querySelector('#datatxt'));const s=getSelection();s.removeAllRanges();s.addRange(r);e.target.textContent='Selected';}};}});}catch(e){toast('Couldn\'t get your data.');}};
A.protoreset=()=>openSheet('Start over?',`<p style="margin:0">This clears every account, shelf, review and chat in this prototype, so you can test from the very start.</p><button class="btn primary" data-a="protoresetgo">Start over</button><button class="btn line" data-a="closesheet">Cancel</button>`);
A.protoresetgo=()=>{try{Object.keys(localStorage).filter(k=>k.startsWith('sp-')).forEach(k=>localStorage.removeItem(k));}catch(e){}location.reload();};
'''
icons=open(A+'/proto_icons.js').read()
mock=open(A+'/mock.js').read()
P=open(R+'/data/products.json').read(); SM=open(R+'/data/sample-reviews.json').read()
js='(function(){"use strict";\n'+icons+main+'\nconst PRODUCTS_DATA='+P+';\nconst SAMPLES_DATA='+SM+';\nconst ENG=(function(PRODUCTS0,SAMPLES0){'+eng+'})(PRODUCTS_DATA,SAMPLES_DATA);\nconst AIX=(function(engine){'+ai+'})(ENG);\n'+mock+'\n'+s1+'\n'+open(A+'/screens2.js').read()+'\n'+s3+'\n'+extra+'\n})();'
open(os.path.join(OUT,'bundle.js'),'w').write(js)
html=open(R+'/app/index.html').read()
body=html[html.index('<div class="desk">'):html.index('<script src="app.js">')]
body=body.replace('<b>Skin Peers</b>','<b>Skin Peers prototype</b>').replace('<span>Open this page on your phone to use the camera.</span>','<span>Runs inside Claude with the real product list and matching. Sample reviews are marked. Me → Start over resets it.</span>')
css=open(R+'/app/app.css').read()
out='<title>Skin Peers Prototype</title>\n<meta name="description" content="Clickable prototype of the Skin Peers app.">\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=Figtree:wght@400;500;600;700&display=swap">\n<style>\n'+css+'\n</style>\n'+body+'<script>\n'+js.replace('</script','<\\/script')+'\n</script>\n'
open(os.path.join(OUT,'prototype.html'),'w').write(out)
print(len(out))
