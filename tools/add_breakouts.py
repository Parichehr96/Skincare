"""Add 'broke out' answers to the existing sample reviews without changing anything else in them."""
import json, random
P = {p['id']: p for p in json.load(open('/home/claude/sk2/data/products.json'))}
F = '/home/claude/sk2/data/sample-reviews.json'
R = json.load(open(F))
rb = random.Random(20261108)
for r in R:
    r['f'] = [x for x in r['f'] if x != 'broke out']
    p = P.get(r['p']);
    if not p: continue
    t = p['traits']; g = r['g']; pb = .035
    if g['type'] in ('oily', 'combination'):
        if t['rich']: pb += .14
        if p['cat'] == 'sun' and not t['light']: pb += .07
        if t['light']: pb -= .015
    if t['blemish']: pb -= .025
    if 'breakouts' in g['c']: pb *= 1.8
    if r['a'] == 'n': pb *= 2.2
    if rb.random() < max(.005, pb): r['f'] = sorted(set(r['f'] + ['broke out']))
json.dump(R, open(F, 'w'), separators=(',', ':'))
print(len(R), sum('broke out' in r['f'] for r in R))
