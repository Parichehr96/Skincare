# Product catalogue and evidence

Every face sunscreen and day cream sold online at Kruidvat, Etos, Douglas, HEMA and Albert Heijn is in the catalogue,
read from the shops' own product pages. Normal has no online catalogue (stock changes per store), so its products only
appear when another shop sells them too.

## Kinds and what each gets

The catalogue is growing to all face skincare from Dutch drugstores. Each product has a `kind` and a `cat`:

| `kind` | `cat` | Peer reviews, Matches, chat picks | Shelf, ingredient check, brand claims, shop ratings, similar formulas |
| --- | --- | --- | --- |
| sunscreen | `sun` | Yes | Yes |
| day cream (moisturiser) | `moist` | Yes | Yes |
| night cream, eye cream, serum, cleanser, toner, mask, exfoliant, other | `other` | Not yet | Yes |

**Only sunscreens and day creams get peer recommendations for now.** Ranking (`rank()`), the `products` route behind
Matches, the review-to-unlock flow and the chat's product suggestions only ever use `cat` `sun` and `moist`. Products
of other kinds can be scanned, found by name (the `find` route) and kept on a shelf; their page says
"Reviews for serums aren't open yet. You can keep it on your shelf." The review endpoint refuses them with
`reviews_not_open`, and the shelf shows them without check-in, unlock or run-out prompts.

Not in the catalogue at all: body, hair and lip products, kids and baby lines, men-only lines, gift sets, refills
and accessories.

The other kinds were read on 10 November 2026 from Kruidvat, Etos, HEMA and AH (`raw/skinpeers-all-*.json`). Douglas
blocked the reader after part of its pages, so its night creams, serums, cleansers, masks and eye creams are only in
the catalogue when Douglas listed them among its moisturisers earlier. In total: 2,974 products, of which 1,298 day
creams and 163 sunscreens (the 1,433 from before plus 21 day creams and 7 sunscreens that weren't in it yet), and
1,513 products of other kinds: 386 cleansers, 380 serums, 199 masks, 169 night creams, 139 eye creams, 95 toners,
70 exfoliants and 75 others. Kruidvat partner shops don't publish ingredient lists, so about half of Kruidvat's
products have none.

## What each product carries

| Field | Where it comes from |
| --- | --- |
| Name, brand, size, price per shop | The shop's product page, on the date in `checked` |
| `ingredients` | The full ingredient list (INCI) from the shop page with the longest list; `ingredientsSource` names it |
| `kind` | The product type, from the shop category and the name (Dutch and English words, Douglas name endings such as "Reinigingsgel", "Nachtcrème", "Oogcrème") |
| `flags` | Read from the ingredient list: filter type, fragrance, drying alcohol near the top, retinoids, tint, ingredients on common pore-clogging lists, and exfoliating acids (glycolic, lactic, mandelic, salicylic, PHAs), benzoyl peroxide, azelaic acid and vitamin C forms. Cleansers also list their cleansing agents (sulfates such as SLS as "strong", the rest as "milder") |
| `hints` | Short notes read from the same list for the product's kind, for example that acids and retinoids together can irritate. They are hints, not promises: amounts aren't on the label |
| `actives` | Notable ingredients found in the list (niacinamide, ceramides, salicylic acid, ...) |
| `claims` | Phrases from the product description, labelled in the app as the brand's claims |
| `external` | Each shop's own star rating and number of ratings, with source and date. Review texts are never copied |
| `similar` | Products of the same kind whose ingredient lists match closely (`same: true` when the first 12 ingredients are identical) |

## The evidence ladder

The app shows the strongest evidence it has for a product and says which it is:

1. Reviews from women like you (5 or more).
2. Reviews from everyone on Skin Peers (5 or more).
3. Reviews of near-identical formulas, from women like you or from everyone. Labelled "Similar formula".
4. Another shop's star rating, labelled with the shop's name and date. It is never turned into a "would buy again" number.
5. Only the ingredient list and the brand's claims.

Reviews of similar formulas set the starting point for a product's score and fade as its own reviews come in
(`judge()` in `api/_app/engine.js`). Another shop's rating nudges the order by at most 0.05, and only while a product
has few reviews here.

## Limits

- Ingredient similarity is a hint, not proof: concentrations aren't on the label, and the order of ingredients only
  roughly reflects them.
- Pore-clogging lists come mostly from old tests on single ingredients (Fulton 1989, J Soc Cosmet Chem 40:321-333).
  The app says "on common pore-clogging lists", never "will clog pores".
- Shop ratings cover all skin types and can't be checked.
- Acids and vitamin C only count in the top half of the ingredient list, because small amounts are also used to set
  the pH or keep a product fresh. That is a rule of thumb, not a measurement.
- Before launch, check each shop's terms on reusing prices, ratings and ingredient lists, and refresh the data on a
  schedule; prices and formulas change.

## Rebuilding

```
python3 scripts/build_catalog2.py data/products.json raw/*.json
```

**The products already in the catalogue stay exactly as they are** (names, shops, label facts and ids, which reviews
point at). The shop files only add products the catalogue doesn't have yet: a record whose shop page or EAN belongs to
an existing product is skipped, a new product that shares a shop page with an existing one is left out, and so is a
new day cream or sunscreen whose name nearly matches an existing one (same category, 80% of the name words). Only the
"similar formulas" lists are worked out again for everything. To rebuild existing products from the shop files as
well, run with `REFRESH_OLD=1` and check the differences by hand first: a few early products were merged with a
sibling (a refill, another variant) and change name or lose their ingredient list when rebuilt.

A product read from a menu other than the day cream and sunscreen menus (cleansers, acne care, Korean skincare ...)
only becomes a day cream, and so gets peer recommendations, when its name says it is a face cream ("dagcrème",
"moisturiser", "cream" ...). Spot treatments, purifying gels and lotions, jellies, refills and big tubs go on the shelf as
"other"; body products, brushes and devices are left out.

Raw records may come from any shop category (`cat` is the category they were read from: `sun`, `moist`, a kind such as
`serum`, or anything else). Sunscreens and day creams pass exactly the same filters as before, so adding other kinds
doesn't change that set. Existing product ids are kept when a shop URL or EAN matches, so reviews stay linked; the old
products are read from `data/products.json` (or `OLD_PRODUCTS=<path>`). Products of different kinds are never merged
and are never listed as each other's similar formulas.
