"""Build data/products.json from raw shop records.

Input: one or more JSON files with raw records from the shop readers (Kruidvat, Etos, Douglas, ...).
Each record: shop, url, name, brand, price, size, rating, ratingCount, ean, description/summary, ingredients, cat.
`cat` in a raw record is the shop category it was read from: "sun", "moist", one of the kinds below, or anything else
(then the name decides).

Every product gets a `kind` (sunscreen, day cream, night cream, eye cream, serum, cleanser, toner, mask, exfoliant,
other) and a `cat`: "sun" and "moist" for the two kinds that get peer recommendations (sunscreen, day cream), and
"other" for everything else. Sunscreens and day creams go through exactly the same filters as before, so that set
doesn't change when other kinds are added. Body, hair, lip, kids/baby and men-only lines, gift sets, refills and
accessories are left out.

Output keeps the old product ids where a shop URL matches, so existing (sample) reviews still link up. The old
products are read from data/products.json (or OLD_PRODUCTS=<path>).
"""
import json, re, sys, hashlib, unicodedata, datetime, os, html
from collections import Counter
sys.path.insert(0, os.path.dirname(__file__))
from inci import split_inci, analyse, formula_similarity, same_formula, key as ikey, kind_flags, notes as inci_notes

TODAY = datetime.date.today().isoformat()
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OLD_PATH = os.environ.get('OLD_PRODUCTS') or os.path.join(REPO, 'data', 'products.json')
OLD = json.load(open(OLD_PATH)) if os.path.exists(OLD_PATH) else []
OLD_BY_ID = {o['id']: o for o in OLD}
OLD_BY_URL = {}
for p in OLD:
    for s in p['shops']:
        if s.get('url'): OLD_BY_URL[s['url'].split('?')[0].rstrip('/')] = p

def is_fresh(rs):
    return all(r.get('fresh') for r in rs)

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
# Douglas ends its names with the product type. These suffixes name the other kinds.
DOUGLAS_OTHER = {'nachtcrème': 'night cream', 'nachtcreme': 'night cream', 'oogcrème': 'eye cream', 'oogcreme': 'eye cream',
                 'ooggel': 'eye cream', 'oogserum': 'eye cream', 'oogbalsem': 'eye cream', 'serum': 'serum', 'gezichtsserum': 'serum',
                 'essence': 'serum', 'ampullen': 'serum', 'reinigingsgel': 'cleanser', 'reinigingsschuim': 'cleanser',
                 'gezichtsreinigingsschuim': 'cleanser', 'reinigingsmelk': 'cleanser', 'reinigingsolie': 'cleanser',
                 'reinigingsbalsem': 'cleanser', 'reinigingscrème': 'cleanser', 'reinigingslotion': 'cleanser', 'gezichtsreiniger': 'cleanser',
                 'micellair water': 'cleanser', 'make-up remover': 'cleanser', 'toner': 'toner', 'gezichtstoner': 'toner',
                 'gezichtstonic': 'toner', 'gezichtswater': 'toner', 'gezichtsspray': 'toner', 'gezichtsmasker': 'mask', 'masker': 'mask',
                 'slaapmasker': 'mask', 'sheet mask': 'mask', 'oogmasker': 'mask', 'peeling': 'exfoliant', 'gezichtspeeling': 'exfoliant',
                 'gezichtsscrub': 'exfoliant', 'exfoliant': 'exfoliant', 'gezichtsolie': 'other'}

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
    for suf in sorted(DOUGLAS_OTHER, key=len, reverse=True):
        if n.lower().endswith(' ' + suf):
            r = dict(r)
            r['name'] = n[: -len(suf)].strip()
            r['kindHint'] = DOUGLAS_OTHER[suf]
            if r.get('cat') in ('sun', 'moist'):
                r['cat'] = 'other'
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

KINDS = ['sunscreen', 'day cream', 'night cream', 'eye cream', 'serum', 'cleanser', 'toner', 'mask', 'exfoliant', 'other']
REC_KIND = {'sun': 'sunscreen', 'moist': 'day cream'}
# Raw shop categories that already say the kind (Dutch and English shop menu names).
CAT_HINT = {'sun': 'sunscreen', 'moist': 'day cream', 'sunscreen': 'sunscreen', 'day cream': 'day cream', 'dagcreme': 'day cream',
            'night cream': 'night cream', 'night': 'night cream', 'nachtcreme': 'night cream', 'eye cream': 'eye cream', 'eye': 'eye cream',
            'oogcreme': 'eye cream', 'oogverzorging': 'eye cream', 'serum': 'serum', 'serums': 'serum', 'cleanser': 'cleanser',
            'cleansers': 'cleanser', 'reiniging': 'cleanser', 'gezichtsreiniging': 'cleanser', 'toner': 'toner', 'toners': 'toner',
            'mask': 'mask', 'masks': 'mask', 'masker': 'mask', 'maskers': 'mask', 'gezichtsmaskers': 'mask', 'exfoliant': 'exfoliant',
            'exfoliants': 'exfoliant', 'peeling': 'exfoliant', 'scrub': 'exfoliant'}
# Never in the catalogue, whatever the shop category: not for the face, not for her, or not a product on its own.
EXCLUDE_ALWAYS = re.compile(
    r'\b(body|lichaam\w*|bodylotion|douche\w*|shower|hair|haar\w*|hoofdhuid\w*|scalp|shampoo|conditioner|lip|lips|lippen|lipbalm|'
    r'lippenbalsem|kids?|kinder\w*|baby|babies|junior|men|mannen|man|for men|homme|baard\w*|beard|scheer\w*|shave|shaving|aftershave|'
    r'gift ?set|giftset|cadeau\w*|geschenk\w*|set|kit|duo|trio|coffret|verzorgingsset|reisset|adventskal\w*|navulling|navul\w*|refill|'
    r'sample|proefje|mini kit|accessoire\w*|borstel|brush|kwast|spons|sponge|wattenschijf\w*|cotton|katoen|applicator|device|apparaat|'
    r'roller|gua sha|haarband|headband|kussensloop|pillow\w*|handzeep|hand|handcreme|voet\w*|foot|feet|nagel\w*|deodorant|tandpasta|'
    r'foundation|concealer|primer|mascara|bronzer|blush|poeder|powder|highlighter|setting spray|lipstick|aftersun|after sun|zelfbruin\w*|'
    r'self.?tan|parfum|eau de toilette|eau de parfum|zijden|silk pillow|elektrisch\w*|gezichtsborstel|all over spray|body mist|vaseline|'
    r'oplaadbaar|dermaroller|dermarolling|\w*borstel|tan remover)\b', re.I)

def kind_of(name, hint=None):
    """The kind of face product, from its name (Dutch, English and French words); the shop category is the fallback."""
    n = unicodedata.normalize('NFD', html.unescape(name or '')).encode('ascii', 'ignore').decode().lower()
    has = lambda rx: re.search(rx, n)
    if has(r'make.?up ?(remover|verwijder)|remover|afschmink|demaquill|oogreinig|reinigingslotion|cleansing'):
        return 'cleanser'
    if has(r'\b(oog|ogen|eye|eyes|yeux|augen)|oogcr|ooggel|oogserum|oogcontour|oogbalsem|eye ?contour'):
        return 'mask' if has(r'mask|masker|patch|pads?\b') else 'eye cream'
    if has(r'reinig|cleans|\bwash|wasgel|wasemuls|waslotion|zeepvrij|face ?wash|micell|make.?up ?(remover|verwijder)|afschmink|demaquill|reinigingsschuim|\bfoam\b'):
        return 'cleanser'
    if has(r'peeling|scrub|exfoli|gommage|\b(aha|bha|pha)\b|resurfac'):
        return 'exfoliant'
    if has(r'masker|\bmasks?\b|sheet ?mask|slaapmasker|sleeping ?mask|overnight ?mask'):
        return 'mask'
    if has(r'\btoner|\btonic|tonique|gezichtswater|toning|face ?mist|gezichtsspray|\bmist\b'):
        return 'toner'
    if has(r'serum|\bampoule|\bampul|booster|concentra|\bessence|druppels|\bdrops\b'):
        return 'serum'
    if has(r'dag ?(en|&) ?nacht|day ?(and|&) ?night'):
        return 'day cream'
    if has(r'nacht|night|\bnuit|sleep|slaap'):
        return 'night cream'
    if has(r'zonnebrand|zonnecr|zonnefluid|zonnebalsem|sunscreen|sun ?(cream|fluid|aqua|serum|essence|gel|milk|lotion)|\buv\b') and not has(r'dagcr|day ?cream'):
        return 'sunscreen'
    if has(r'\b(spf|lsf)\s?\d') and hint == 'sunscreen':
        return 'sunscreen'
    if has(r'gezichtsolie|face ?oil|facial ?oil|\b(olie|oil)\b') and not has(r'oil.?(free|control)|olievrij'):
        return 'other'
    if has(r'dagcr|day ?cream|gezichtscr|moistur|hydrat|\bcreme|\bcream|gel|fluid|lotion|emuls|balm|balsem|\b(bb|cc)\b'):
        return hint if hint in ('night cream', 'eye cream') else 'day cream'
    return hint if hint in KINDS else 'other'

def classify(r):
    """Return the record with its `kind` and `cat` set, or None to leave it out."""
    if r.get('cat') in ('sun', 'moist') and keep(r):
        return {**r, 'kind': REC_KIND[r['cat']]}
    n = r.get('name') or ''
    if EXCLUDE_ALWAYS.search(n):
        return None
    if r.get('kindHint'):
        # a Douglas name suffix names the kind exactly ("... Reinigingsgel"), even when the rest sounds like a cream
        return {**r, 'cat': 'other', 'kind': r['kindHint']}
    hint = CAT_HINT.get(norm(r.get('cat')))
    k = kind_of(n, hint)
    if k in ('sunscreen', 'day cream'):
        # sunscreens and day creams only come in through the old filters, so that set stays the same
        if r.get('cat') in ('sun', 'moist'):
            return None
        if k == 'day cream' and not new_day_cream_ok(n):
            # read from another shop menu (cleansers, acne care, korean skincare ...) and not clearly a face day cream:
            # it goes on the shelf, but not into peer recommendations; body products are left out
            return None if NOT_FACE.search(n) else {**r, 'cat': 'other', 'kind': 'other'}
        r2 = {**r, 'cat': 'sun' if k == 'sunscreen' else 'moist'}
        return {**r2, 'kind': k} if keep(r2) else None
    return {**r, 'cat': 'other', 'kind': k}

DAY_OK = re.compile(r'dag ?cr[eè]me|dagcreme|day ?cream|daycream|moisturi[sz]|gezichtscr[eè]me|face ?cream|facial ?cream|'
                    r'gel ?cr[eè]me|water ?cr[eè]me|\bcr[eè]me\b|\bcream\b|emulsi', re.I)
DAY_NO = re.compile(r'zuiver|aanstip|drying lotion|\burea\b|\bspot\b|puistje|jeugdpuist|benzac|jelly|vaseline|refill|navul|'
                    r'\bmelk\b|\bmilk\b|\b(1[5-9]\d|[2-9]\d\d|\d{4}) ?(ml|gr|g|gram)\b', re.I)
NOT_FACE = re.compile(r'\b(body|lichaam|hand|voet|1[5-9]\d ?gr|[2-9]\d\d ?(ml|gr|g|gram))\b|vaseline', re.I)

def new_day_cream_ok(name):
    return bool(DAY_OK.search(name)) and not DAY_NO.search(name)

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

def family(r):
    """Sunscreens and day creams may merge with each other (as before); every other kind stays apart."""
    return 'rec' if r.get('kind') in ('sunscreen', 'day cream') else r.get('kind') or 'other'

def group_key(r):
    if r.get('ean'):
        return 'ean:' + r['ean']
    n = norm((r.get('brand') or '') + ' ' + (r.get('name') or ''))
    n = re.sub(r'\b\d+(?:[.,]\d+)?\s?(ml|g|gr)\b', '', n)
    n = re.sub(r'\b(zonnebrandcreme|zonnecreme|zonnebrand|dagcreme|gezichtscreme|creme|cream|voor het gezicht|voor je gezicht)\b', '', n)
    return 'nm:' + re.sub(r'\s+', ' ', n).strip()

def num(v):
    """Shops give prices and ratings as numbers, strings ("13.99", "13,99") or "None"."""
    if v is None or isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return v
    try:
        x = float(str(v).strip().replace(',', '.'))
    except ValueError:
        return None
    return int(x) if x.is_integer() else x

def clean_raw(r):
    """Give every raw record the same field types, whichever reader or shop it came from."""
    r = dict(r)
    for f in ('price', 'rating'):
        r[f] = num(r.get(f))
    rc = num(r.get('ratingCount'))
    r['ratingCount'] = int(rc) if rc is not None else None
    for f in ('name', 'brand', 'size', 'ingredients', 'description', 'summary', 'ean'):
        v = r.get(f)
        r[f] = None if v in (None, 'None', '') else str(v).strip()
    r['partner'] = r.get('partner') in (True, 'True', 'true')
    return r

def main(paths):
    raw = []
    old_eans = {e.strip() for o in OLD for e in str(o.get('ean') or '').split(',') if e.strip()}
    base_urls, base_eans = set(), set()
    for p in sorted(paths, key=lambda p: 'skinpeers-all-' in os.path.basename(p)):
        recs = [clean_raw(r) for r in json.load(open(p))]
        if 'skinpeers-all-' in os.path.basename(p):
            # the all-skincare read adds products; it never changes ones built from the earlier sunscreen and day cream
            # reads, so their names, shops and reviews stay exactly as they are
            keep_recs = []
            for r in recs:
                u = (r.get('url') or '').split('?')[0].rstrip('/')
                eans = {e.strip() for e in str(r.get('ean') or '').split(',') if e.strip()}
                if u in OLD_BY_URL or u in base_urls or eans & (old_eans | base_eans):
                    continue
                keep_recs.append({**r, 'fresh': True})
            recs = keep_recs
        else:
            for r in recs:
                base_urls.add((r.get('url') or '').split('?')[0].rstrip('/'))
                base_eans.update(e.strip() for e in str(r.get('ean') or '').split(',') if e.strip())
        raw += recs
    raw = [r for r in raw if r.get('name') and 'access denied' not in r['name'].lower()]
    raw = [x for x in (douglas_fix(r) for r in raw) if x]
    kept = [x for x in (classify(r) for r in raw) if x]
    groups = {}
    for r in kept:
        o = OLD_BY_URL.get((r.get('url') or '').split('?')[0].rstrip('/'))
        groups.setdefault('old:' + o['id'] if o else family(r) + '|' + group_key(r), []).append(r)
    # join groups that share any EAN (one product can carry several)
    owner = {}
    for k in list(groups):
        if k not in groups: continue
        fam = family(groups[k][0])
        eans = {fam + ':' + e.strip() for r in groups[k] for e in str(r.get('ean') or '').split(',') if e.strip()}
        target = next((owner[e] for e in eans if e in owner and owner[e] in groups and owner[e] != k), None)
        if target:
            keep_k, drop_k = (k, target) if k.startswith('old:') and not target.startswith('old:') else (target, k)
            groups[keep_k] += groups.pop(drop_k)
            for e2 in eans | {fam + ':' + e.strip() for r in groups[keep_k] for e in str(r.get('ean') or '').split(',') if e.strip()}:
                owner[e2] = keep_k
        else:
            for e in eans: owner[e] = k
    # a second pass joins groups that share a normalised name across shops (EANs differ per shop sometimes)
    byname = {}
    for k, rs in list(groups.items()):
        nk = family(rs[0]) + '|' + group_key({**rs[0], 'ean': None})
        if nk in byname and nk != k and is_fresh(groups[byname[nk]]) == is_fresh(rs):
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
        info[k] = (bkey(r0) + '|' + family(r0), parse_spf(r0.get('name') or ''), allt, [ikey(x) for x in inci])
    byb = {}
    for k in keys:
        byb.setdefault(info[k][0], []).append(k)
    merged = {}
    def root(k):
        while k in merged: k = merged[k]
        return k
    for b_, ks in byb.items():
        if not b_ or b_.startswith('|'): continue
        for i in range(len(ks)):
            for j in range(i + 1, len(ks)):
                a1, a2 = root(ks[i]), root(ks[j])
                if a1 == a2: continue
                _, s1, t1, c1 = info[ks[i]]; _, s2, t2, c2 = info[ks[j]]
                if s1 != s2: continue
                if is_fresh(groups[a1]) != is_fresh(groups[a2]): continue
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
        name = re.sub(r'\s+', ' ', best['name']).strip()
        if family(rs[0]) == 'rec':
            cat = 'sun' if any(r['cat'] == 'sun' for r in rs) else 'moist'
            if cat == 'sun' and re.search(r'dagcr|day cream|gezichtscr', name, re.I):
                cat = 'moist'
            kind = REC_KIND[cat]
        else:
            cat = 'other'
            kind = Counter(r['kind'] for r in rs).most_common(1)[0][0]
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
        # an id of a product already in the catalogue belongs to that product only (its reviews point at it)
        while pid in used_ids or (not old and pid in OLD_BY_ID):
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
        flags.update(kind_flags(an, kind))
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
            'id': pid, 'name': name, 'brand': brand, 'cat': cat, 'kind': kind,
            'size': parse_size(best.get('size'), name) or (old or {}).get('size'),
            'price': min(prices) if prices else None,
            'shops': shops, 'spf': spf, 'flags': flags, 'traits': tr,
            'note': (old or {}).get('note', ''), 'shape': (old or {}).get('shape') or shape_of(name, cat), 'c': (old or {}).get('c') or colours(brand),
            'checked': TODAY,
            'ingredients': inci or None,
            'ingredientsSource': {'shop': best['shop'], 'url': best['url'], 'date': TODAY} if inci else None,
            'actives': [a['label'] for a in (an or {}).get('actives', [])][:6],
            'claims': cl,
            'hints': inci_notes(an, kind),
            'external': external,
            'ean': next((str(r['ean']).split(',')[0] for r in rs if r.get('ean')), None),
        })
    if os.environ.get('REFRESH_OLD'):
        # full refresh: products already in the catalogue are rebuilt from the shop files (check the diff by hand first; a few
        # early products were merged wrongly and change name or lose their ingredient list when rebuilt)
        have = {p['id'] for p in prods}
        for o in OLD:
            if o['id'] not in have:
                prods.append({**o, 'kind': o.get('kind') or REC_KIND.get(o['cat'], 'other'), 'ingredients': None, 'ingredientsSource': None,
                              'actives': [], 'claims': [], 'hints': [], 'external': [], 'ean': None, 'flags': {**o['flags'], 'poreClogging': None}})
    else:
        # default: products already in the catalogue stay exactly as they are (their reviews, names and shops); the shop files
        # only add products the catalogue doesn't have yet. A new product that shares a shop page with an existing one is
        # left out, so one shop page never shows up as two products.
        old_urls = {s['url'].split('?')[0].rstrip('/') for o in OLD for s in o['shops'] if s.get('url')}
        prods = [p for p in prods if p['id'] not in OLD_BY_ID
                 and not any((s.get('url') or '').split('?')[0].rstrip('/') in old_urls for s in p['shops'])]
        def words(t):
            t = unicodedata.normalize('NFD', html.unescape(str(t or ''))).encode('ascii', 'ignore').decode().lower()
            return {w for w in re.findall(r'[a-z0-9+]+', t) if w not in ('ml', 'gr', 'g', 'gram', 'spf', 'lsf', 'en', 'de', 'het', 'voor')}
        old_names = [(o['cat'], words(o['name'])) for o in OLD]
        def known(p):
            w = words(p['name'])
            return any(c == p['cat'] and len(w & ow) / max(1, len(w | ow)) >= 0.8 for c, ow in old_names)
        prods = [p for p in prods if p['cat'] == 'other' or not known(p)]
        prods += [{**o, 'kind': o.get('kind') or REC_KIND.get(o['cat'], 'other')} for o in OLD]
    # similar formulas, only between products of the same kind
    for kind in KINDS:
        ps = [p for p in prods if p['kind'] == kind and p['ingredients']]
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
    prods.sort(key=lambda p: ({'moist': 0, 'other': 1, 'sun': 2}[p['cat']], p['brand'].lower(), p['name'].lower()))
    return prods

if __name__ == '__main__':
    out = sys.argv[1]
    prods = main(sys.argv[2:])
    json.dump(json.loads(json.dumps(prods, ensure_ascii=False).replace('\ufffd', '')), open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(len(prods), Counter(p['cat'] for p in prods), Counter(p['kind'] for p in prods), 'with INCI', sum(1 for p in prods if p['ingredients']),
          'with similar', sum(1 for p in prods if p['similar']), 'multi-shop', sum(1 for p in prods if len(p['shops']) > 1))
