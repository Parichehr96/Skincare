"""Build the product photo tracker from data/products.json.

    python3 reports/build_photo_list.py [out.xlsx]     (default: reports/Skin_Peers_product_photos.xlsx)
Recalculate the formulas (LibreOffice) before sharing, or Excel does it on open.
"""
import json, html, os, sys
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(R, 'reports', 'Skin_Peers_product_photos.xlsx')
P = json.load(open(os.path.join(R, 'data', 'products.json')))
KL = {'sunscreen': 'Sunscreen', 'day cream': 'Day cream', 'night cream': 'Night cream', 'eye cream': 'Eye cream', 'serum': 'Serum',
      'cleanser': 'Cleanser', 'toner': 'Toner', 'mask': 'Mask', 'exfoliant': 'Exfoliant', 'other': 'Other'}
ORDER = list(KL)
def why(p):
    shops = {s['shop'] for s in p['shops']}
    if shops <= {'Douglas'}: return 'Only sold at Douglas, which blocks automated reading'
    if shops <= {'Action'} or not shops: return 'Early sample product, no shop page'
    return 'Not on the shop pages any more (may be sold out or removed)'
hf = Font(name='Arial', bold=True, size=10, color='1E1A17'); fill = PatternFill('solid', fgColor='DCBA9F')
norm = Font(name='Arial', size=10); bold = Font(name='Arial', bold=True, size=10); link = Font(name='Arial', size=10, color='7A5A40', underline='single')
wb = openpyxl.Workbook(); s = wb.active; s.title = 'Summary'; ws = wb.create_sheet('Photos')
heads = ['Kind', 'Peer recommendations', 'Brand', 'Product', 'Has photo', 'Photo from', 'Sold at', 'Why no photo', 'Photo link', 'Product page', 'Photo read on', 'Product id']
widths = [12, 14, 20, 52, 10, 12, 22, 44, 50, 50, 12, 40]
for i, h in enumerate(heads, 1):
    c = ws.cell(1, i, h); c.font = hf; c.fill = fill; c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.column_dimensions[get_column_letter(i)].width = widths[i - 1]
P.sort(key=lambda p: (ORDER.index(p['kind']), (p['brand'] or '').lower(), p['name'].lower()))
for r, p in enumerate(P, 2):
    has = bool(p.get('image')); src = (p.get('imageSource') or {})
    row = [KL[p['kind']], 'Yes' if p['cat'] in ('sun', 'moist') else 'Not yet', p['brand'], html.unescape(p['name']), 'Yes' if has else 'No', src.get('shop'),
           ', '.join(x['shop'] for x in p['shops']), None if has else why(p), p.get('image'), p['shops'][0]['url'] if p['shops'] else None, src.get('date'), p['id']]
    for i, v in enumerate(row, 1):
        c = ws.cell(r, i, v); c.font = norm
        if i in (9, 10) and v: c.hyperlink = v; c.font = link
N = len(P) + 1
ws.freeze_panes = 'E2'; ws.auto_filter.ref = f'A1:{get_column_letter(len(heads))}{N}'
s.column_dimensions['A'].width = 34
for L in 'BCDE': s.column_dimensions[L].width = 16
s['A1'] = 'Skin Peers product photos'; s['A1'].font = Font(name='Arial', bold=True, size=12)
s['A2'] = "Pack photos read from the shops' own product pages. The app shows the shop's photo; on her own shelf a user can use her own photo, which only she sees."; s['A2'].font = norm
def table(top, title, labels, col, ref):
    for i, h in enumerate([title, 'Products', 'With photo', 'Without photo', 'Share with photo'], 1):
        c = s.cell(top, i, h); c.font = hf; c.fill = fill; c.alignment = Alignment(wrap_text=True, vertical='top')
    for j, lab in enumerate(labels):
        r = top + 1 + j; s.cell(r, 1, lab).font = norm
        crit = f'Photos!${col}$2:${col}${N},{ref(r)}'
        s.cell(r, 2, f'=COUNTIFS({crit})'); s.cell(r, 3, f'=COUNTIFS({crit},Photos!$E$2:$E${N},"Yes")'); s.cell(r, 4, f'=B{r}-C{r}')
        s.cell(r, 5, f'=IF(B{r}=0,"",C{r}/B{r})'); s.cell(r, 5).number_format = '0%'
        for i in range(2, 6): s.cell(r, i).font = norm
    return top + 1 + len(labels)
t = table(4, 'By kind', [KL[k] for k in ORDER], 'A', lambda r: f'A{r}')
s.cell(t, 1, 'All').font = bold
for i, L in zip(range(2, 5), 'BCD'): s.cell(t, i, f'=SUM({L}5:{L}{t - 1})').font = bold
s.cell(t, 5, f'=IF(B{t}=0,"",C{t}/B{t})'); s.cell(t, 5).number_format = '0%'; s.cell(t, 5).font = bold
t2 = table(t + 2, 'By shop (a product can be at several)', ['Kruidvat', 'Etos', 'Douglas', 'HEMA', 'AH'], 'G', lambda r: f'"*"&A{r}&"*"')
t3 = table(t2 + 1, 'By peer recommendations', ['Yes', 'Not yet'], 'B', lambda r: f'A{r}')
notes = ['Has photo: a pack photo was found on a shop page for this product. Without one, the app shows a drawn icon.',
         'Photo from: the shop whose photo is used. The photo link opens that photo.',
         "The photos belong to the shops and brands. Fine for testing; check each shop's terms or ask permission before launch.",
         'Douglas refuses automated reading (tried on 10 and 14 November 2026), so products sold only there have no photo.',
         "A user's own photo of a product on her shelf is stored on her phone only. It is not in this list and nobody else sees it."]
s.cell(t3 + 1, 1, 'How to read it').font = bold
for i, n in enumerate(notes): s.cell(t3 + 2 + i, 1, n).font = norm
wb.save(OUT); print(OUT, len(P))
