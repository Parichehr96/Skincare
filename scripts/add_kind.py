"""One-off: add `kind`, the new label facts and the hints to the products already in data/products.json.

The catalogue was built before kinds existed. Sunscreens (cat "sun") become kind "sunscreen" and day creams
(cat "moist") kind "day cream"; cat and ids stay as they are. The new label facts (acids, retinoids, benzoyl
peroxide, azelaic acid, vitamin C) and the hints are read from the stored ingredient list with scripts/inci.py.
Running it twice gives the same file.

    python3 scripts/add_kind.py data/products.json
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from inci import analyse, kind_flags, notes

REC_KIND = {'sun': 'sunscreen', 'moist': 'day cream'}

def migrate(prods):
    out = []
    for p in prods:
        kind = p.get('kind') or REC_KIND.get(p['cat'], 'other')
        an = analyse(p['ingredients']) if p.get('ingredients') and len(p['ingredients']) >= 5 else None
        q = {}
        for k, v in p.items():
            q[k] = v
            if k == 'cat':
                q['kind'] = kind
        q['flags'] = {**p['flags'], **kind_flags(an, kind)}
        q['hints'] = notes(an, kind)
        out.append(q)
    return out

if __name__ == '__main__':
    path = sys.argv[1]
    prods = json.load(open(path))
    new = migrate(prods)
    json.dump(new, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
    from collections import Counter
    print(len(new), Counter(p['kind'] for p in new), 'with hints', sum(1 for p in new if p['hints']))
