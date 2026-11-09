"""Build data/products.json from raw shop records.

Input: one or more JSON files with raw records from the shop readers (Kruidvat, Etos, Douglas, ...).
Each record: shop, url, name, brand, price, size, rating, ratingCount, ean, description/summary, ingredients, cat.

Output keeps the old product ids where a shop URL matches, so existing (sample) reviews still link up.
"""
import json, re, sys, hashlib, unicodedata, datetime, os
sys.path.insert(0, os.path.dirname(__file__))
from inci import split_inci, analyse, formula_similarity, same_formula, key as ikey

TODAY = datetime.date.today().isoformat()
OLD = json.load(open('/home/claude/sk2/data/products.json'))
OLD_BY_URL = {}
for p in OLD:
    for s in p['shops']:
        if s.get('url'): OLD_BY_URL[s['url'].split('?')[0].rstrip('/')] = p

def norm(t):
    t = unicodedata.normalize('NFD', str(t or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', t).strip()

SIZE_RE = re.compile(r'(\d+(?:[.,]\d+)?)\s?(ml|g|gr|gram)\b', re.I)

def parse_size(*texts):
    for t in texts:
        m = SIZE_RE.search(str(t or ''))
        if m:
            return m.group(1).replace(',', '.') + ' ' + ('ml' if m.group(2).lower() == 'ml' else 'g')
    return None

def parse_spf(name, text=''):
    m = re.search(r'(?:spf|lsf|fps|ip)\s?(\d{2})', name or '', re.I) or re.search(r'(?:spf|lsf)\s?(\d{2})', text or '', re.I)
    return int(m.group(1)) if m else None

EXCLUDE = re.compile(r'\b(men|mannen|for men|homme|kids?|kinder|baby|junior|oog|eye|nacht|night|sleeping|lip|lippen|aftersun|after sun|'
                     r'zelfbruin|self.?tan|bronz|body|lichaam|hand|voet|foot|gift ?set|giftset|cadeau|set|duo|trio|navulling|refill|sample|mini kit|'
                     r'serum|toner|masker|mask|reinig|cleans|peeling|scrub|olie(?! control)|oil(?! control| free|-free)|spray|mist|stick)\b', re.I)
FACE = re.compile(r'gezicht|face|facial|fluid|flu[iï]de|gelaat|visage|sun (cream|aqua|serum|essence)|airy|uv (defen|essence|expert|aqua)|'
                  r'anthelios|photoderm|capital soleil|uvmune|sun relief|relief sun', re.I)

DOUGLAS_KEEP = {'gezichtscrème': 'moist', 'gezichtsgel': 'moist', 'gezichtslotion': 'moist', 'gezichtsemulsie': 'moist', 'dagcrème': 'moist',
                'gezichtsbalsem': 'moist', 'gezichtsfluide': 'moist', 'getinte dagcrème': 'moist', 'bb cream': 'moist',
                'zonnebrandcrème voor het gezicht': 'sun'}
def douglas_fix(r):
    if r['shop'] != 'Douglas':
        return r
    n = r['name'].strip()
    for suf in sorted(DOUGLAS_KEEP, key=len, reverse=True):
        if n.lower().endswith(' ' + suf):
            r = dict(r)
            r['name'] = n[: -len(suf)].strip()
            if DOUGLAS_KEEP[suf] == 'sun' or r['cat'] == 'sun':
                r['cat'] = 'sun' if DOUGLAS_KEEP[suf] == 'sun' or re.search(r'spf|lsf', n, re.I) else r['cat']
            return r
    return None

NIGHT_EYE = re.compile(r'\b(nacht|night|nuit|notte|noche|sleep|slaap|oog|eye|yeux|augen|men\b|mannen|homme|for men|kids?\b|kinder|baby|lip)', re.I)

CLEAN = re.compile(r'\b(reinig|cleans|toner|tonic|micellai|peeling|scrub|masker|mask|exfoli|serum|ampoule|essence|primer|concealer|foundation|adventskal|kussen|set\b|kit\b)', re.I)
def keep(r):
    if CLEAN.search(r.get('name') or '') and not re.search(r'sun|spf|zon', r.get('name') or '', re.I):
        return False
    if NIGHT_EYE.search(r.get('name') or '') and not re.search(r'dag ?(en|&) ?nacht|day ?(and|&) ?night', r.get('name') or '', re.I):
        return False
    n = r.get('name') or ''
    if r['cat'] == 'sun':
        if re.search(r'\b(kids?|kinder|baby|aftersun|after sun|lip|zelfbruin|bronz)\b', n, re.I):
            return False
        if r['shop'] == 'Etos' and not FACE.search(n):
            return False
        if re.search(r'\b(body|lichaam|200 ?ml|250 ?ml|300 ?ml|400 ?ml)\b', n, re.I) and not re.search(r'gezicht|face', n, re.I):
            return False
        return True
    # moisturisers: face day creams, gels, fluids, emulsions
    bad = EXCLUDE.search(n)
    if bad and not re.search(r'dag|day', n, re.I):
        return False
    if re.search(r'\b(oog|eye|nacht|night|men|mannen|homme|kids?|baby|lip)\b', n, re.I):
        return False
    return True

CLAIMS = [
    (r'parfumvrij|zonder parfum|fragrance[- ]free|parfum[- ]free|ongeparfumeerd|sans parfum', 'Fragrance-free'),
    (r'niet[- ]comedogeen|non[- ]comedogen|verstopt de poriën niet|verstopt geen poriën|does not clog', 'Non-comedogenic'),
    (r'hypoallergeen|hypoallergenic', 'Hypoallergenic'),
    (r'dermatologisch getest|dermatologically tested', 'Dermatologically tested'),
    (r'gevoelige huid|sensitive skin|gevoelige en|voor de gevoelige', 'For sensitive skin'),
    (r'onzuiver|blemish|acne|puistjes|imperfect', 'For blemish-prone skin'),
    (r'(zeer )?waterbestendig|water ?resistent|waterproof|water resistant|waterproef', 'Water resistant'),
    (r'niet (vet|plakkerig)|non[- ]greasy|niet-vet|geen vette|not greasy|zonder vet', 'Not greasy'),
    (r'geen witte (waas|laag|sporen)|no white cast|onzichtbaar|invisible', 'No white cast'),
    (r'24 ?(uur|h|hours)|48 ?(uur|h)|72 ?(uur|h)', 'Long-lasting hydration'),
    (r'\bvegan\b|veganistisch', 'Vegan'),
    (r'droge huid|dry skin|zeer droge', 'For dry skin'),
    (r'vette huid|oily skin|gecombineerde|combination skin|glimmende', 'For oily or combination skin'),
    (r'mat(terend|te finish|tifying)|mattifying|matte finish', 'Matte finish'),
]

def claims_of(text):
    t = text or ''
    return [label for rx, label in CLAIMS if re.search(rx, t, re.I)]

def traits_of(name, claims, an):
    n = name.lower()
    light = bool(re.search(r'fluid|flu[iï]de|gel|lotion|aqua|water|light|licht|airy|emuls|matt|serum|fresh|milk', n)) or 'Matte finish' in claims
    rich = bool(re.search(r'rijk|rich|riche|balm|balsem|intens|voedend|nourish|nutri|butter|extra droge|zeer droge|cica', n))
    if an and an.get('oilsEarly', 0) >= 2:
        rich = rich or not light
    return {
        'light': light and not rich, 'rich': rich,
        'sensitive': 'For sensitive skin' in claims or bool(re.search(r'sensitiv|gevoelig|toleriane|cicaplast|sensibio', n)),
        'blemish': 'For blemish-prone skin' in claims or bool(re.search(r'effaclar|normaderm|blemish|onzuiver|acne|pure|clear|dermopure|cleanance', n)),
        'korean': False,
    }

KOREAN = ['beauty of joseon', 'cosrx', 'skin1004', 'round lab', 'isntree', 'anua', 'missha', 'purito', 'dear, klairs', 'klairs', 'haruharu',
          'thank you farmer', 'dr. althea', 'dr.althea', 'by wishtrend', 'some by mi', 'torriden', 'numbuzin', 'medicube', 'illiyoon', 'innisfree',
          'laneige', 'etude', 'heimish', 'mixsoon', 'axis-y', 'abib', 'skin79', 'tocobo', 'goodal', 'aestura', 'banila co', 'biore', 'skin aqua',
          'rohto', 'hada labo', 'canmake', 'ma:nyo', 'manyo', 'iunik', 'benton', 'pyunkang yul', 'dr.jart+', 'dr. jart+', 'centellian24', 'madeca']

def slug(t):
    return re.sub(r'-+', '-', norm(t).replace(' ', '-')).strip('-')[:80]

PALETTE = [('#EEF5EF', '#2F6B4F'), ('#F6F1E8', '#8A6A3B'), ('#EEF1F6', '#4E6A8E'), ('#F7EEF0', '#9A4E5E'), ('#F2F0F7', '#5E548E'),
           ('#EEF6F6', '#2F7A7A'), ('#FBF4E6', '#A2742A'), ('#F1F1EE', '#55574E')]

def colours(brand):
    h = int(hashlib.md5(norm(brand).encode()).hexdigest(), 16)
    return list(PALETTE[h % len(PALETTE)])

def shape_of(name, cat):
    n = name.lower()
    if re.search(r'stick', n): return 'stick'
    if re.search(r'fluid|flu[iï]de|lotion|emuls|serum|milk|melk|aqua|water', n): return 'bottle'
    if re.search(r'pot|jar|creme|crème|cream|balm|balsem|gel', n) and cat == 'moist': return 'jar'
    return 'tube'

def group_key(r):
    if r.get('ean'):
        return 'ean:' + r['ean']
    n = norm((r.get('brand') or '') + ' ' + (r.get('name') or ''))
    n = re.sub(r'\b\d+(?:[.,]\d+)?\s?(ml|g|gr)\b', '', n)
    n = re.sub(r'\b(zonnebrandcreme|zonnecreme|zonnebrand|dagcreme|gezichtscreme|creme|cream|voor het gezicht|voor je gezicht)\b', '', n)
    return 'nm:' + re.sub(r'\s+', ' ', n).strip()

def main(paths):
    raw = []
    for p in paths:
        raw += json.load(open(p))
    raw = [r for r in raw if r.get('name') and r.get('cat') in ('sun', 'moist') and 'access denied' not in r['name'].lower()]
    raw = [x for x in (douglas_fix(r) for r in raw) if x]
    kept = [r for r in raw if keep(r)]
    groups = {}
    for r in kept:
        o = OLD_BY_URL.get((r.get('url') or '').split('?')[0].rstrip('/'))
        groups.setdefault('old:' + o['id'] if o else group_key(r), []).append(r)
    # join groups that share any EAN (one product can carry several)
    owner = {}
    for k in list(groups):
        if k not in groups: continue
        eans = {e.strip() for r in groups[k] for e in str(r.get('ean') or '').split(',') if e.strip()}
        target = next((owner[e] for e in eans if e in owner and owner[e] in groups and owner[e] != k), None)
        if target:
            keep_k, drop_k = (k, target) if k.startswith('old:') and not target.startswith('old:') else (target, k)
            groups[keep_k] += groups.pop(drop_k)
            for e2 in eans | {e.strip() for r in groups[keep_k] for e in str(r.get('ean') or '').split(',') if e.strip()}:
                owner[e2] = keep_k
        else:
            for e in eans: owner[e] = k
    # a second pass joins groups that share a normalised name across shops (EANs differ per shop sometimes)
    byname = {}
    for k, rs in list(groups.items()):
        nk = group_key({**rs[0], 'ean': None})
        if nk in byname and nk != k:
            groups[byname[nk]] += rs
            del groups[k]
        else:
            byname.setdefault(nk, k)
    # fuzzy pass: same brand, same SPF, near-identical name words or identical start of the ingredient list
    def toks(r):
        n = norm(r.get('name'))
        n = re.sub(r'\b\d+(?:[.,]\d+)?\s?(ml|g|gr)\b', ' ', n)
        drop = {'zonnebrandcreme', 'zonnecreme', 'zonnebrand', 'dagcreme', 'gezichtscreme', 'creme', 'cream', 'voor', 'het', 'je', 'gezicht',
                'face', 'de', 'en', 'the', 'and', 'ml', 'spf', 'lsf', 'paris', 'zonnefluide', 'fluide', 'fluid'}
        return {t for t in n.split() if t not in drop and not t.isdigit()}
    def bkey(r):
        b = norm(r.get('brand') or (r.get('name') or '').split(' ')[0])
        return re.sub(r'\b(sun|paris|men expert|skin|care|skincare)\b', '', b).strip().split(' ')[0] if b else ''
    keys = list(groups)
    info = {}
    for k in keys:
        r0 = groups[k][0]
        allt = set().union(*[toks(r) for r in groups[k]])
        inci = next((split_inci(r.get('ingredients'))[:15] for r in groups[k] if r.get('ingredients')), [])
        info[k] = (bkey(r0), parse_spf(r0.get('name') or ''), allt, [ikey(x) for x in inci])
    byb = {}
    for k in keys:
        byb.setdefault(info[k][0], []).append(k)
    merged = {}
    def root(k):
        while k in merged: k = merged[k]
        return k
    for b_, ks in byb.items():
        if not b_: continue
        for i in range(len(ks)):
            for j in range(i + 1, len(ks)):
                a1, a2 = root(ks[i]), root(ks[j])
                if a1 == a2: continue
                _, s1, t1, c1 = info[ks[i]]; _, s2, t2, c2 = info[ks[j]]
                if s1 != s2: continue
                jac = len(t1 & t2) / max(1, len(t1 | t2))
                same_inci = len(c1) >= 12 and c1 == c2
                if jac >= 0.75 or (same_inci and jac >= 0.4):
                    keep_k, drop_k = (a1, a2) if a1.startswith('old:') or not a2.startswith('old:') else (a2, a1)
                    groups[keep_k] += groups.pop(drop_k)
                    merged[drop_k] = keep_k
    prods = []
    used_ids = set()
    for k, rs in groups.items():
        rs.sort(key=lambda r: (-(len(r.get('ingredients') or '')), r['shop']))
        best = rs[0]
        cat = 'sun' if any(r['cat'] == 'sun' for r in rs) else 'moist'
        name = re.sub(r'\s+', ' ', best['name']).strip()
        if cat == 'sun' and re.search(r'dagcr|day cream|gezichtscr', name, re.I):
            cat = 'moist'
        inci_text = best.get('ingredients')
        inci = split_inci(inci_text)
        an = analyse(inci) if len(inci) >= 5 else None
        text = ' '.join(filter(None, [r.get('summary') for r in rs] + [r.get('description') for r in rs] + [name]))
        cl = claims_of(text)
        spf = parse_spf(name, text if cat == 'sun' else '')
        if cat == 'sun' and not spf:
            spf = parse_spf(text)
        brand = (best.get('brand') or name.split(' ')[0]).strip()
        brand = brand.title() if brand.isupper() and len(brand) > 4 else brand
        old = None
        for r in rs:
            old = OLD_BY_URL.get((r.get('url') or '').split('?')[0].rstrip('/'))
            if old: break
        pid = old['id'] if old else slug(brand + ' ' + re.sub(r'(?i)^' + re.escape(brand), '', name))
        while pid in used_ids:
            pid += '-2'
        used_ids.add(pid)
        shops = []
        for r in sorted(rs, key=lambda r: (r.get('price') is None, r.get('price') or 0)):
            if any(s['shop'] == r['shop'] for s in shops):
                continue
            shops.append({'shop': r['shop'], 'price': r.get('price'), 'url': r['url'], 'online': True, **({'partner': True} if r.get('partner') else {})})
        external = [{'source': r['shop'], 'rating': round(float(r['rating']), 1), 'n': int(r['ratingCount']), 'scale': 5, 'date': TODAY, 'url': r['url']}
                    for r in rs if r.get('rating') and r.get('ratingCount')]
        external = list({e['source']: e for e in external}.values())
        flags = {
            'filters': (an or {}).get('filters') if cat == 'sun' else None,
            'tinted': (an or {}).get('tinted') if an else bool(re.search(r'tint|getint|teinte', name, re.I)),
            'fragrance': an['fragrance'] if an else (False if 'Fragrance-free' in cl else None),
            'dryingAlcohol': an['dryingAlcohol'] if an else None,
            'retinol': an['retinol'] if an else None,
            'poreClogging': [x['name'] for x in an['poreClogging']] if an else None,
        }
        if old:
            # keep the hand-checked values where the label gives nothing
            for f in ('filters', 'tinted', 'fragrance', 'dryingAlcohol', 'retinol'):
                if flags.get(f) is None and old['flags'].get(f) is not None:
                    flags[f] = old['flags'][f]
        tr = traits_of(name, cl, an)
        tr['korean'] = any(norm(brand).startswith(norm(k)) for k in KOREAN)
        if old:
            tr = {**tr, **{k: v for k, v in old['traits'].items() if v}}
        prices = [s['price'] for s in shops if s['price'] is not None]
        prods.append({
            'id': pid, 'name': name, 'brand': brand, 'cat': cat,
            'size': parse_size(best.get('size'), name) or (old or {}).get('size'),
            'price': min(prices) if prices else None,
            'shops': shops, 'spf': spf, 'flags': flags, 'traits': tr,
            'note': (old or {}).get('note', ''), 'shape': (old or {}).get('shape') or shape_of(name, cat), 'c': (old or {}).get('c') or colours(brand),
            'checked': TODAY,
            'ingredients': inci or None,
            'ingredientsSource': {'shop': best['shop'], 'url': best['url'], 'date': TODAY} if inci else None,
            'actives': [a['label'] for a in (an or {}).get('actives', [])][:6],
            'claims': cl,
            'external': external,
            'ean': next((str(r['ean']).split(',')[0] for r in rs if r.get('ean')), None),
        })
    # carry over old products the shops no longer list, so nothing breaks
    have = {p['id'] for p in prods}
    for o in OLD:
        if o['id'] not in have:
            prods.append({**o, 'ingredients': None, 'ingredientsSource': None, 'actives': [], 'claims': [], 'external': [], 'ean': None,
                          'flags': {**o['flags'], 'poreClogging': None}})
    # similar formulas, within the same category
    for cat in ('sun', 'moist'):
        ps = [p for p in prods if p['cat'] == cat and p['ingredients']]
        for p in ps:
            sims = []
            for q in ps:
                if q is p: continue
                s = formula_similarity(p['ingredients'], q['ingredients'])
                if s >= 0.5:
                    same = same_formula(p['ingredients'], q['ingredients'])
                    sims.append({'id': q['id'], 's': round(s, 2), 'same': same})
            sims.sort(key=lambda x: (-x['same'], -x['s']))
            p['similar'] = sims[:6]
    for p in prods:
        p.setdefault('similar', [])
    prods.sort(key=lambda p: (p['cat'], p['brand'].lower(), p['name'].lower()))
    return prods

if __name__ == '__main__':
    out = sys.argv[1]
    prods = main(sys.argv[2:])
    json.dump(json.loads(json.dumps(prods, ensure_ascii=False).replace('\ufffd', '')), open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
    from collections import Counter
    print(len(prods), Counter(p['cat'] for p in prods), 'with INCI', sum(1 for p in prods if p['ingredients']),
          'with similar', sum(1 for p in prods if p['similar']), 'multi-shop', sum(1 for p in prods if len(p['shops']) > 1))
