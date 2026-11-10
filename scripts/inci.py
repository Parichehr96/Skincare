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
RETINOIDS = ['retinol', 'retinyl palmitate', 'retinal', 'retinaldehyde', 'hydroxypinacolone retinoate', 'retinyl retinoate', 'retinyl acetate',
             'retinyl propionate', 'retinyl linoleate']
RETINOID_LABEL = {'retinol': 'Retinol', 'retinal': 'Retinal', 'retinaldehyde': 'Retinal', 'hydroxypinacolone retinoate': 'Retinoate (HPR)'}
# Exfoliating acids. Lactic and citric acid also appear in tiny amounts to set the pH, so lactic acid only counts in the
# top half of the list, and citric acid never counts.
ACIDS = [('glycolic acid', 'Glycolic acid'), ('lactic acid', 'Lactic acid'), ('mandelic acid', 'Mandelic acid'),
         ('salicylic acid', 'Salicylic acid'), ('capryloyl salicylic acid', 'Capryloyl salicylic acid'), ('betaine salicylate', 'Betaine salicylate'),
         ('gluconolactone', 'Gluconolactone (PHA)'), ('lactobionic acid', 'Lactobionic acid (PHA)'), ('malic acid', 'Malic acid'),
         ('tartaric acid', 'Tartaric acid')]
PH_ONLY = {'lactic acid', 'malic acid', 'tartaric acid'}
AZELAIC = [('azelaic acid', 'Azelaic acid'), ('potassium azeloyl diglycinate', 'Azelaic acid derivative')]
VITAMIN_C = [('ascorbic acid', 'Ascorbic acid'), ('3 o ethyl ascorbic acid', 'Ethyl ascorbic acid'), ('ethyl ascorbic acid', 'Ethyl ascorbic acid'),
             ('ascorbyl glucoside', 'Ascorbyl glucoside'), ('sodium ascorbyl phosphate', 'Sodium ascorbyl phosphate'),
             ('magnesium ascorbyl phosphate', 'Magnesium ascorbyl phosphate'), ('ascorbyl tetraisopalmitate', 'Ascorbyl tetraisopalmitate'),
             ('tetrahexyldecyl ascorbate', 'Tetrahexyldecyl ascorbate'), ('ascorbyl palmitate', 'Ascorbyl palmitate')]
# Cleansing agents. Sulfates such as SLS clean strongly and can feel drying; the others are usually milder.
SURF_STRONG = [('sodium lauryl sulfate', 'Sodium lauryl sulfate'), ('ammonium lauryl sulfate', 'Ammonium lauryl sulfate'),
               ('sodium laureth sulfate', 'Sodium laureth sulfate'), ('ammonium laureth sulfate', 'Ammonium laureth sulfate'),
               ('sodium coco sulfate', 'Sodium coco-sulfate'), ('sodium myreth sulfate', 'Sodium myreth sulfate')]
SURF_MILD = [('cocamidopropyl betaine', 'Cocamidopropyl betaine'), ('coco glucoside', 'Coco-glucoside'), ('decyl glucoside', 'Decyl glucoside'),
             ('lauryl glucoside', 'Lauryl glucoside'), ('caprylyl capryl glucoside', 'Caprylyl/capryl glucoside'),
             ('sodium cocoyl isethionate', 'Sodium cocoyl isethionate'), ('sodium lauroyl methyl isethionate', 'Sodium lauroyl methyl isethionate'),
             ('sodium lauroyl sarcosinate', 'Sodium lauroyl sarcosinate'), ('sodium cocoyl glutamate', 'Sodium cocoyl glutamate'),
             ('disodium cocoyl glutamate', 'Disodium cocoyl glutamate'), ('sodium lauroyl glutamate', 'Sodium lauroyl glutamate'),
             ('sodium methyl cocoyl taurate', 'Sodium methyl cocoyl taurate'), ('sodium cocoamphoacetate', 'Sodium cocoamphoacetate'),
             ('disodium laureth sulfosuccinate', 'Disodium laureth sulfosuccinate'), ('potassium cocoyl glycinate', 'Potassium cocoyl glycinate'),
             ('sodium cocoyl glycinate', 'Sodium cocoyl glycinate'), ('sodium c14 16 olefin sulfonate', 'Sodium C14-16 olefin sulfonate')]
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
    def found(table, limit=None):
        out = []
        for word, label in table:
            for i, k in enumerate(keys):
                if (k == word or k.startswith(word + ' ')) and (limit is None or word not in PH_ONLY or i < limit):
                    if label not in out:
                        out.append(label)
                    break
        return out
    acids = found(ACIDS, limit=max(8, len(keys) // 2))
    vitc = found(VITAMIN_C)
    retinoids = []
    for r in RETINOIDS:
        if has(keys, r):
            lab = RETINOID_LABEL.get(r) or ('Retinyl ester (' + r.capitalize() + ')' if r.startswith('retinyl') else r.capitalize())
            if lab not in retinoids:
                retinoids.append(lab)
    oils_early = sum(1 for k in keys[:8] if re.search(r'\b(oil|butter|wax|petrolatum|paraffinum)\b', k))
    return {
        'filters': filters, 'mineralFilters': min_, 'chemicalFilters': len(chem),
        'fragrance': frag, 'fragranceAllergens': allergens,
        'dryingAlcohol': bool(da and da[0] < 12), 'dryingAlcoholPos': (da[0] + 1) if da else None,
        'retinol': any(has(keys, r) for r in RETINOIDS),
        'retinoids': retinoids,
        'acids': acids,
        'benzoylPeroxide': has(keys, 'benzoyl peroxide'),
        'azelaic': found(AZELAIC),
        'vitaminC': vitc,
        'surfactants': {'strong': found(SURF_STRONG), 'mild': found(SURF_MILD)},
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


def kind_flags(an, kind):
    """The extra label facts stored on a product, by kind. Cleansing agents only matter for cleansers."""
    if not an:
        return {}
    out = {'acids': an['acids'], 'retinoids': an['retinoids'], 'benzoylPeroxide': an['benzoylPeroxide'],
           'azelaic': an['azelaic'], 'vitaminC': an['vitaminC']}
    if kind == 'cleanser':
        out['surfactants'] = an['surfactants']
    return out

def notes(an, kind):
    """Short, plain hints read from the ingredient list, aware of the product kind.

    These are hints, never promises: amounts are not on the label, so an ingredient on the list says nothing
    about how strong a product is. No medical claims; for anything that worries her, the app points to the huisarts.
    """
    if not an:
        return []
    out = []
    acids, ret = an.get('acids') or [], an.get('retinoids') or []
    leave_on = kind not in ('cleanser', 'mask')
    if acids and ret:
        out.append('Has exfoliating acids and a retinoid. Together they can irritate, so start slowly.')
    elif acids:
        out.append('Has exfoliating acids. With a retinoid in the same routine they can irritate.'
                   + (' Use sunscreen by day.' if leave_on else ''))
    elif ret:
        out.append('Has a retinoid, which can irritate at first. Use sunscreen by day. Pregnant or breastfeeding? Ask your huisarts or pharmacist first.')
    if an.get('benzoylPeroxide'):
        out.append('Has benzoyl peroxide, which can dry the skin and bleach towels and pillowcases.')
    if an.get('azelaic'):
        out.append('Has azelaic acid, which can tingle at first.')
    if 'Ascorbic acid' in (an.get('vitaminC') or []):
        out.append('Has pure vitamin C (ascorbic acid), which can sting on sensitive skin.')
    if kind == 'cleanser':
        s = an.get('surfactants') or {}
        if s.get('strong'):
            out.append('Has a strong cleansing agent (' + s['strong'][0] + '), which can feel drying.')
        elif s.get('mild'):
            out.append('Its cleansing agents are of the milder kind.')
    return out
