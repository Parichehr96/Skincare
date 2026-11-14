"""Give every product its pack photo.

    python3 scripts/add_images.py <skinpeers-img-*.json ...>

Each input file is a list of {url, image, thumb} read from a shop's own pages (thumb = a 112px WebP data URL).
Writes:  data/products.json        image + imageSource per product (the shop's photo URL; the app loads it from the shop)
         raw/images-<shop>.json    url -> image, without the thumbnails
         tools/proto_thumbs.json   product id -> thumbnail, built into the prototype
A product takes the photo of the first of its shops that has one. Photos belong to the shops and brands: fine for
testing, check each shop's terms before launch (see docs/catalogue.md).
"""
import json, os, re, sys, datetime
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def key(u):
    u = (u or '').split('?')[0].rstrip('/')
    for pat in (r'kruidvat\.nl/.*?/p/([\w-]+)$', r'etos\.nl/.*?-(\d+)\.html$', r'hema\.nl/.*?-(\d+)\.html$', r'ah\.nl/producten/product/(wi\d+)', r'douglas\.nl/nl/p/(\d+)'):
        m = re.search(pat, u)
        if m: return pat[:4] + m.group(1)
    return u
imgs = {}
for f in sys.argv[1:]:
    recs = json.load(open(f))
    shop = re.search(r'img-(\w+)', os.path.basename(f)).group(1)
    json.dump({r['url']: r['image'] for r in recs if r.get('image')}, open(os.path.join(R, 'raw', f'images-{shop}.json'), 'w'), ensure_ascii=False, indent=0)
    for r in recs:
        if r.get('image'): imgs[key(r['url'])] = r
P = json.load(open(os.path.join(R, 'data', 'products.json')))
tp = os.path.join(R, 'tools', 'proto_thumbs.json')
thumbs = json.load(open(tp)) if os.path.exists(tp) else {}
today = datetime.date.today().isoformat(); n = 0
for p in P:
    hit = next(((s, imgs[key(s.get('url'))]) for s in p['shops'] if key(s.get('url')) in imgs), None)
    if not hit:
        continue
    s, r = hit
    img = r['image']
    # ask the shop's image server for a larger render where the size is in the URL, so cards and the product page are sharp
    img = re.sub(r'([?&]sw=)\d+', lambda m: m.group(1) + '600', img)
    img = re.sub(r'_\d+x\d+(?=[/?]|$)', '_600x600', img)
    p['image'] = img; p['imageSource'] = {'shop': s['shop'], 'date': today}
    if r.get('thumb'): thumbs[p['id']] = r['thumb']
    n += 1
json.dump(P, open(os.path.join(R, 'data', 'products.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(thumbs, open(tp, 'w'), separators=(',', ':'))
print(f'{n} of {len(P)} products have a photo; {len(thumbs)} thumbnails')
