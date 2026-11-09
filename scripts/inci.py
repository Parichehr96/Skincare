"""Read an INCI ingredient list and derive the facts the app shows.

Everything here is a plain reading of the label. Nothing is a medical claim.
"""
import re

def split_inci(text):
    if not text:
        return []
    t = re.sub(r'(?i)<br\s*/?>|\s•\s|•|\n', ',', text.strip())
    m = re.search(r'(?i)(ingredients|ingrediënten|ingredienten|inci)\s*[:.]?\s*', t[:60])
    if m:
        t = t[m.end():]
    t = re.split(r'\(F\.I\.L|“|"Houd|Houd er rekening|\bMay contain\b|\bKan bevatten\b', t)[0]
    t = re.sub(r'\[\+/-.*?\]|\(\+/-.*?\)|\[may contain.*?\]', '', t, flags=re.I)
    t = t.split('*')[0] if t.count('*') == 1 and len(t.split('*')[0]) > 40 else t
    out, depth, cur = [], 0, ''
    for ch in t:
        if ch in '([': depth += 1
        if ch in ')]': depth = max(0, depth - 1)
        if ch in ',;' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    clean = []
    for x in out:
        x = re.sub(r'\s+', ' ', x).strip().strip('.').strip()
        if 1 < len(x) < 120:
            clean.append(x)
    return clean

def key(name):
    n = name.lower()
    n = re.sub(r'\(nano\)|\[nano\]', '', n)
    n = re.sub(r'[^a-z0-9]+', ' ', n).strip()
    if re.match(r'^(aqua|water|eau)( (aqua|water|eau))*$', n):
        return 'aqua'
    return n

MINERAL = ['titanium dioxide', 'zinc oxide']
CHEMICAL = ['ethylhexyl methoxycinnamate', 'octocrylene', 'homosalate', 'ethylhexyl salicylate', 'butyl methoxydibenzoylmethane',
            'bis ethylhexyloxyphenol methoxyphenyl triazine', 'ethylhexyl triazone', 'diethylamino hydroxybenzoyl hexyl benzoate',
            'methylene bis benzotriazolyl tetramethylbutylphenol', 'diethylhexyl butamido triazone', 'drometrizole trisiloxane',
            'terephthalylidene dicamphor sulfonic acid', 'phenylbenzimidazole sulfonic acid', 'disodium phenyl dibenzimidazole tetrasulfonate',
            'benzophenone 3', 'benzophenone 4', 'polysilicone 15', 'isoamyl p methoxycinnamate', '4 methylbenzylidene camphor',
            'tris biphenyl triazine', 'methoxypropylamino cyclohexenylidene ethoxyethylcyanoacetate']
FRAGRANCE = ['parfum', 'fragrance', 'aroma']
FRAG_ALLERGENS = ['linalool', 'limonene', 'citronellol', 'geraniol', 'coumarin', 'citral', 'hexyl cinnamal', 'eugenol', 'benzyl salicylate',
                  'benzyl benzoate', 'alpha isomethyl ionone', 'farnesol', 'isoeugenol', 'cinnamal', 'benzyl cinnamate', 'amyl cinnamal']
DRYING_ALCOHOL = ['alcohol', 'alcohol denat', 'sd alcohol', 'ethanol', 'isopropyl alcohol', 'sd alcohol 40']
RETINOIDS = ['retinol', 'retinyl palmitate', 'retinal', 'hydroxypinacolone retinoate', 'retinyl retinoate', 'retinyl acetate']
TINT = ['ci 77491', 'ci 77492', 'ci 77499', 'iron oxides']
# Ingredients that turn up on common "pore-clogging" lists. Those lists go back mostly to rabbit-ear tests
# (Fulton 1989, J Soc Cosmet Chem 40:321-333); how a full product behaves on a face varies, so the app says
# "on common pore-clogging lists", never "will clog pores".
PORE = ['isopropyl myristate', 'isopropyl palmitate', 'isopropyl isostearate', 'myristyl myristate', 'myristyl lactate', 'laureth 4',
        'oleth 3', 'isocetyl stearate', 'ethylhexyl stearate', 'ethylhexyl palmitate', 'decyl oleate', 'butyl stearate',
        'isostearyl isostearate', 'acetylated lanolin', 'acetylated lanolin alcohol', 'cocos nucifera oil', 'coconut oil',
        'theobroma cacao seed butter', 'cocoa butter', 'triticum vulgare germ oil', 'wheat germ oil', 'algae extract', 'carrageenan',
        'sodium lauryl sulfate', 'linum usitatissimum seed oil', 'glycine soja oil', 'ppg 2 myristyl ether propionate', 'myristyl alcohol',
        'cetyl acetate', 'isodecyl oleate', 'octyl palmitate', 'octyl stearate', 'lauric acid', 'myristic acid', 'glyceryl stearate se',
        'hexadecyl alcohol', 'stearyl heptanoate', 'polyglyceryl 3 diisostearate', 'sorbitan oleate', 'isocetyl alcohol']
ACTIVES = {
    'niacinamide': 'Niacinamide', 'ceramide': 'Ceramides', 'sodium hyaluronate': 'Hyaluronic acid', 'hyaluronic acid': 'Hyaluronic acid',
    'salicylic acid': 'Salicylic acid (BHA)', 'glycolic acid': 'Glycolic acid (AHA)', 'lactic acid': 'Lactic acid (AHA)',
    'centella asiatica': 'Centella', 'madecassoside': 'Centella', 'panthenol': 'Panthenol', 'squalane': 'Squalane',
    'ascorbic acid': 'Vitamin C', 'ascorbyl glucoside': 'Vitamin C', 'tocopherol': 'Vitamin E', 'bakuchiol': 'Bakuchiol',
    'zinc pca': 'Zinc PCA', 'azelaic acid': 'Azelaic acid', 'urea': 'Urea', 'allantoin': 'Allantoin', 'glycerin': 'Glycerin',
}

def has(keys, word):
    return any(k == word or k.startswith(word + ' ') for k in keys)

def analyse(inci_list):
    keys = [key(x) for x in inci_list]
    if not keys:
        return None
    min_ = [m for m in MINERAL if has(keys, m)]
    chem = [c for c in CHEMICAL if has(keys, c)]
    filters = 'mineral' if min_ and not chem else 'hybrid' if min_ and chem else 'chemical' if chem else None
    frag = any(has(keys, w) for w in FRAGRANCE)
    allergens = [k for k in FRAG_ALLERGENS if has(keys, k)]
    da = [i for i, k in enumerate(keys) if k in DRYING_ALCOHOL]
    pore = []
    for i, k in enumerate(keys):
        for p in PORE:
            if k == p or k.startswith(p + ' '):
                pore.append({'name': inci_list[i], 'pos': i + 1})
                break
    acts = []
    for i, k in enumerate(keys):
        for a, label in ACTIVES.items():
            if a in k and label not in [x['label'] for x in acts]:
                acts.append({'label': label, 'pos': i + 1})
    oils_early = sum(1 for k in keys[:8] if re.search(r'\b(oil|butter|wax|petrolatum|paraffinum)\b', k))
    return {
        'filters': filters, 'mineralFilters': min_, 'chemicalFilters': len(chem),
        'fragrance': frag, 'fragranceAllergens': allergens,
        'dryingAlcohol': bool(da and da[0] < 12), 'dryingAlcoholPos': (da[0] + 1) if da else None,
        'retinol': any(has(keys, r) for r in RETINOIDS),
        'tinted': any(has(keys, t) for t in TINT),
        'poreClogging': pore,
        'actives': acts[:8],
        'oilsEarly': oils_early,
        'count': len(keys),
    }

def weights(n):
    return [1.0 / (1 + i / 6.0) for i in range(n)]

def formula_similarity(a, b):
    """0..1. Shared ingredients count more when they sit high on both lists."""
    ka, kb = [key(x) for x in a], [key(x) for x in b]
    if not ka or not kb:
        return 0.0
    wa, wb = weights(len(ka)), weights(len(kb))
    pa = {k: wa[i] for i, k in reversed(list(enumerate(ka)))}
    pb = {k: wb[i] for i, k in reversed(list(enumerate(kb)))}
    shared = sum(min(pa[k], pb[k]) for k in pa if k in pb)
    total = sum(pa.values()) + sum(pb.values()) - shared
    return shared / total if total else 0.0

def same_formula(a, b, n=12):
    ka, kb = [key(x) for x in a][:n], [key(x) for x in b][:n]
    return len(ka) >= 8 and ka == kb
