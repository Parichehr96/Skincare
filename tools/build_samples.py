import json, random
P = json.load(open('/home/claude/sk2/data/products.json'))
rnd = random.Random(20261103)
TYPES = ['dry','oily','combination','normal','unsure']; TW=[.15,.1,.4,.3,.05]
AGES = ['18-24','25-34','35-44','45-54','55+']; AW=[.2,.35,.25,.12,.08]
TONEW=[.15,.2,.2,.15,.1,.08,.07,.05]
CONC=['breakouts','redness','dark spots','dryness','sensitivity','fine lines']
NOTES = {
 'moist':{'y':["My cheeks stopped feeling tight after about a week.","Absorbs quickly, no shine by lunch.","Works well under my SPF every morning.","Bought it again when it was on offer.","Gentle, no stinging at all.","A small amount is enough, it lasts long."],
          'm':["Nice texture, a bit greasy on my nose by the afternoon.","Fine, but nothing special for the price.","Good in winter, too heavy in summer."],
          'n':["Pilled under my foundation.","Stung a bit around my eyes.","Broke me out after a week, so I stopped.","Too rich for my skin."]},
 'sun':{'y':["No white cast on my skin, which is rare.","Feels like a light moisturiser.","I wear it daily, also when cycling.","Sits fine under makeup.","Didn't break me out."],
        'm':["Works, but stings when it gets near my eyes.","A bit shiny by midday.","Slight cast at first, it settles after a few minutes."],
        'n':["Left a white cast on my skin.","Too greasy on my T-zone.","Made my eyes water.","Pilled when I put makeup on top."]}}
def pick(seq,w): return rnd.choices(seq,weights=w)[0]
out=[]; i=0
for p in P:
    f=p['flags']; t=p['traits']
    pop = 1.6 if p['brand'] in ('La Roche-Posay','CeraVe','Nivea','Garnier','Neutrogena','Clinique','Beauty of Joseon','Biodermal','Eucerin') else 1.0
    n = int(rnd.randint(30,85)*pop)
    base = 0.55 + rnd.uniform(-0.12,0.15)
    for _ in range(n):
        tp=pick(TYPES,TW); age=pick(AGES,AW); tone=pick(list(range(1,9)),TONEW)
        sun = 'burns' if tone<=2 else ('tans' if tone>=6 else 'burns-tans')
        conc=[c for c in CONC if rnd.random()<.15]
        pr=base
        if f.get('fragrance') and ('sensitivity' in conc or 'redness' in conc): pr-=.25
        if f.get('dryingAlcohol') and tp=='dry': pr-=.18
        if t['rich'] and tp in ('oily','combination'): pr-=.18
        if t['light'] and tp=='dry': pr-=.1
        if t['blemish'] and tp in ('oily','combination'): pr+=.15
        if t['sensitive'] and 'sensitivity' in conc: pr+=.12
        if p['cat']=='sun' and f.get('filters')=='hybrid' and tone>=6: pr-=.3
        if f.get('tinted') and (tone<=2 or tone>=7): pr-=.15
        if t['korean'] and p['cat']=='sun': pr+=.08
        if f.get('retinol') and 'sensitivity' in conc: pr-=.12
        pr=max(.05,min(.95,pr))
        r=rnd.random()
        a='y' if r<pr else ('m' if r<pr+(1-pr)*.4 else 'n')
        feel=[]
        if p['cat']=='moist':
            if a=='y': feel.append(pick(['hydrated','hydrated','no change'],[3,3,1]))
            if t['rich'] and tp in ('oily','combination') and rnd.random()<.6: feel.append('greasy')
            if t['light'] and tp=='dry' and rnd.random()<.5: feel.append('still tight')
        else:
            if p['cat']=='sun' and f.get('filters')=='hybrid' and tone>=5 and rnd.random()<.6: feel.append('white cast')
            if a=='y' and rnd.random()<.6: feel.append('no white cast' if not ('white cast' in feel) else 'hydrated')
            if tp in ('oily','combination') and not t['light'] and rnd.random()<.4: feel.append('greasy')
        if f.get('fragrance') and 'sensitivity' in conc and rnd.random()<.5: feel.append('stings')
        if a=='n' and not feel: feel.append(pick(['stings','greasy','no change'],[1,2,2]))
        extra=[]
        if rnd.random()<.3: extra.append('good under makeup' if a!='n' else 'pills')
        if (p['price'] or 0)>25 and rnd.random()<.3: extra.append('too expensive')
        if a=='y' and rnd.random()<.25: extra.append('lasts long')
        note = rnd.choice(NOTES[p['cat']][a]) if rnd.random()<.45 else ''
        i+=1
        out.append({"id":"s%05d"%i,"p":p['id'],"a":a,"f":sorted(set(feel)),"x":sorted(set(extra)),"n":note,"s":'l' if rnd.random()<.6 else 'e',
                    "g":{"type":tp,"age":age,"tone":tone,"sun":sun,"c":conc}})
json.dump(out,open('/home/claude/sk2/data/sample-reviews.json','w'),separators=(',',':'))
import os; print(len(out), os.path.getsize('/home/claude/sk2/data/sample-reviews.json'))
