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

Shop data for the new kinds hasn't been collected yet (the current raw files are mostly sunscreens and day creams,
plus the serums and night creams Douglas lists among its moisturisers). `data/products.json` therefore still holds the
1,433 sunscreens and day creams; their `kind` was added by `scripts/add_kind.py`.

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

Raw records may come from any shop category (`cat` is the category they were read from: `sun`, `moist`, a kind such as
`serum`, or anything else). Sunscreens and day creams pass exactly the same filters as before, so adding other kinds
doesn't change that set. Existing product ids are kept when a shop URL or EAN matches, so reviews stay linked; the old
products are read from `data/products.json` (or `OLD_PRODUCTS=<path>`). Products of different kinds are never merged
and are never listed as each other's similar formulas.
