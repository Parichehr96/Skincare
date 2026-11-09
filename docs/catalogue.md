# Product catalogue and evidence

Every face sunscreen and day cream sold online at Kruidvat, Etos, Douglas, HEMA and Albert Heijn is in the catalogue,
read from the shops' own product pages. Normal has no online catalogue (stock changes per store), so its products only
appear when another shop sells them too.

## What each product carries

| Field | Where it comes from |
| --- | --- |
| Name, brand, size, price per shop | The shop's product page, on the date in `checked` |
| `ingredients` | The full ingredient list (INCI) from the shop page with the longest list; `ingredientsSource` names it |
| `flags` | Read from the ingredient list: filter type, fragrance, drying alcohol near the top, retinoids, tint, and ingredients on common pore-clogging lists |
| `actives` | Notable ingredients found in the list (niacinamide, ceramides, salicylic acid, ...) |
| `claims` | Phrases from the product description, labelled in the app as the brand's claims |
| `external` | Each shop's own star rating and number of ratings, with source and date. Review texts are never copied |
| `similar` | Products in the same category whose ingredient lists match closely (`same: true` when the first 12 ingredients are identical) |

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
- Before launch, check each shop's terms on reusing prices, ratings and ingredient lists, and refresh the data on a
  schedule; prices and formulas change.

## Rebuilding

```
python3 scripts/build_catalog2.py data/products.json raw/kruidvat.json raw/etos.json raw/douglas.json raw/hema.json raw/ah.json
```

Existing product ids are kept when a shop URL or EAN matches, so reviews stay linked.
