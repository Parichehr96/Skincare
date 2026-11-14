"""Build the product list spreadsheet from data/products.json, in the colours of docs/design-colours.md.

    python3 reports/build_product_list.py [out.xlsx]     (default: reports/Skin_Peers_NL_product_list.xlsx)
Then recalculate the formulas (LibreOffice) before sharing, or Excel does it on open.
"""
import json, html, os, sys
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(R, 'reports', 'Skin_Peers_NL_product_list.xlsx')
HEAD_FILL, HEAD_INK = 'DCBA9F', '1E1A17'   # --sand, --ink
P = json.load(open(os.path.join(R, 'data', 'products.json')))
byid = {p['id']: p for p in P}
KL = {'sunscreen': 'Sunscreen', 'day cream': 'Day cream', 'night cream': 'Night cream', 'eye cream': 'Eye cream', 'serum': 'Serum',
      'cleanser': 'Cleanser', 'toner': 'Toner', 'mask': 'Mask', 'exfoliant': 'Exfoliant', 'other': 'Other'}
ORDER = list(KL)
SHOPS = ['Kruidvat', 'Etos', 'Douglas', 'HEMA', 'AH']
heads = ['Kind', 'Peer recommendations', 'Brand', 'Product', 'Size', 'SPF', 'Lowest price (€)', 'Sold at'] + [s + ' (€)' for s in SHOPS] + [
    'UV filters', 'Fragrance', 'Drying alcohol', 'Retinoid', 'On pore-clogging lists', 'Notable ingredients', 'Brand claims',
    'Shop ratings (out of 5)', 'Similar formulas', 'Full ingredient list', 'Ingredient list from', 'Checked on', 'Link']
widths = [12, 14, 18, 46, 9, 6, 11, 22, 11, 11, 11, 11, 11, 16, 10, 10, 10, 28, 30, 30, 24, 40, 60, 14, 12, 40]
wb = openpyxl.Workbook()
s = wb.active; s.title = 'Summary'
ws = wb.create_sheet('Products')
hf = Font(name='Arial', bold=True, size=10, color=HEAD_INK); fill = PatternFill('solid', fgColor=HEAD_FILL)
for i, h in enumerate(heads, 1):
    c = ws.cell(1, i, h); c.font = hf; c.fill = fill; c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.column_dimensions[get_column_letter(i)].width = widths[i - 1]
yn = lambda v: None if v is None else ('Yes' if v else 'No')
P.sort(key=lambda p: (ORDER.index(p['kind']), (p['brand'] or '').lower(), p['name'].lower()))
f = Font(name='Arial', size=10)
for r, p in enumerate(P, 2):
    fl = p.get('flags') or {}
    sp = {x['shop']: x.get('price') for x in p['shops']}
    pore = fl.get('poreClogging')
    sims = [html.unescape(byid[x['id']]['name']) + (' (same formula)' if x.get('same') else '') for x in p.get('similar') or [] if x['id'] in byid]
    row = [KL[p['kind']], 'Yes' if p['cat'] in ('sun', 'moist') else 'Not yet', p['brand'], html.unescape(p['name']), p.get('size'), p.get('spf'),
           p.get('price'), ', '.join(x['shop'] for x in p['shops'])] + [sp.get(x) for x in SHOPS] + [
        {'mineral': 'Mineral', 'chemical': 'Chemical', 'hybrid': 'Mineral + chemical'}.get(fl.get('filters')) if p['kind'] == 'sunscreen' else None,
        yn(fl.get('fragrance')), yn(fl.get('dryingAlcohol')), yn(fl.get('retinol')),
        'Not checked' if pore is None else (', '.join(pore) if pore else 'None found'),
        ', '.join(p.get('actives') or []) or None, ', '.join(p.get('claims') or []) or None,
        '; '.join(f"{e['source']} {e['rating']:.1f} ({e['n']})" for e in p.get('external') or []) or None,
        '; '.join(sims) or None, ', '.join(p['ingredients']) if p.get('ingredients') else None,
        (p.get('ingredientsSource') or {}).get('shop'), p.get('checked'), p['shops'][0]['url'] if p['shops'] else None]
    for i, v in enumerate(row, 1):
        c = ws.cell(r, i, v); c.font = f
        if i in (7, 9, 10, 11, 12, 13) and isinstance(v, (int, float)): c.number_format = '€#,##0.00'
N = len(P) + 1
ws.freeze_panes = 'E2'; ws.auto_filter.ref = f'A1:{get_column_letter(len(heads))}{N}'
bold = Font(name='Arial', bold=True, size=10); norm = Font(name='Arial', size=10)
s.column_dimensions['A'].width = 46
for L in 'BCDEFG': s.column_dimensions[L].width = 15
s['A1'] = 'Skin Peers product list: face skincare sold online in the Netherlands'; s['A1'].font = Font(name='Arial', bold=True, size=12)
s['A2'] = "Read from the shops' own product pages (sunscreens and day creams on 9 November 2026, all other kinds on 10 November 2026). Prices and formulas change; check the pack."; s['A2'].font = norm
cols = ['Kind', 'Products', 'With full ingredient list', 'Fragrance-free (from ingredient list)', 'Sold at 2 or more shops', 'Average lowest price (€)', 'Peer recommendations']
for i, h in enumerate(cols, 1):
    c = s.cell(4, i, h); c.font = hf; c.fill = fill; c.alignment = Alignment(wrap_text=True, vertical='top')
RK = f'Products!$A$2:$A${N}'
for j, k in enumerate(ORDER):
    r = 5 + j
    s.cell(r, 1, KL[k])
    s.cell(r, 2, f'=COUNTIF({RK},A{r})')
    s.cell(r, 3, f'=COUNTIFS({RK},A{r},Products!$W$2:$W${N},"<>")')
    s.cell(r, 4, f'=COUNTIFS({RK},A{r},Products!$O$2:$O${N},"No")')
    s.cell(r, 5, f'=COUNTIFS({RK},A{r},Products!$H$2:$H${N},"*,*")')
    s.cell(r, 6, f'=IFERROR(AVERAGEIFS(Products!$G$2:$G${N},{RK},A{r}),"")'); s.cell(r, 6).number_format = '€#,##0.00'
    s.cell(r, 7, 'Yes' if k in ('sunscreen', 'day cream') else 'Not yet')
    for i in range(1, 8): s.cell(r, i).font = norm
t = 5 + len(ORDER)
s.cell(t, 1, 'All').font = bold
for i, L in zip(range(2, 6), 'BCDE'): s.cell(t, i, f'=SUM({L}5:{L}{t - 1})').font = bold
s.cell(t, 6, f'=AVERAGE(Products!$G$2:$G${N})'); s.cell(t, 6).number_format = '€#,##0.00'; s.cell(t, 6).font = bold
notes = ['Lowest price: the cheapest of the shop prices on the day it was checked; offers included.',
         'Peer recommendations: only sunscreens and day creams get matches and reviews for now. Other kinds can be kept on a shelf and get the ingredient check.',
         'Fragrance, drying alcohol and retinoid are read from the ingredient list; UV filters only for sunscreens. Drying alcohol = alcohol among the first 12 ingredients.',
         'On pore-clogging lists: ingredients that appear on common lists, which come mostly from old single-ingredient tests (Fulton 1989). Not a promise either way.',
         'Brand claims come from the product description and are not checked.',
         "Shop ratings are each shop's own star rating and number of ratings, all skin types.",
         'Similar formulas: same kind, ingredient lists that match closely; "same formula" when the first 12 ingredients are identical.',
         'Douglas blocked the reader for the new kinds, so Douglas products other than sunscreens and day creams are mostly missing. Kruidvat partner shops publish no ingredient lists.',
         'Normal has no online catalogue, so its products appear only when another shop sells them too. AH blocked many product pages, so AH covers fewer products.']
s.cell(t + 2, 1, 'How to read it').font = bold
for i, n in enumerate(notes): s.cell(t + 3 + i, 1, n).font = norm
wb.save(OUT); print(OUT, len(P))
