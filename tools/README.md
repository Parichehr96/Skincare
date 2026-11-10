# Build and test tools

- `app_src/` is the source of `app/app.js`. Rebuild it with:
  `python3 -c "A='tools/app_src/';parts=[open(A+'proto_icons.js').read()]+[open(A+f).read() for f in ['main.js','screens1.js','screens2.js','screens3.js']];open('app/app.js','w').write('(function(){\"use strict\";\n'+''.join(parts)+'\n})();\n')"`
- `build_proto.py` builds the single-file prototype (`app_src/mock.js` replaces the server) into `tools/proto/`: `python3 tools/build_proto.py [out_dir]`.
- `apptest/server.js` runs the app locally with an in-memory Redis and a fake AI (ports 8890, 8898, 8899); `apptest/e2e.js` drives it with Playwright and exits non-zero when a check fails. Stop the server by port (for example `kill $(lsof -t -i :8890 -i :8898 -i :8899)`).
- `apptest/smoke.js` checks the engine: rank and detail for a sunscreen, a day cream and a shelf-only product.
- `apptest/fixture-other.json` holds synthetic shelf-only products (a serum pair and a cleanser) for tests only. They are added at runtime with `engine._addTestProducts()` and never belong in `data/products.json`.
- `../scripts/add_kind.py` was a one-off that added `kind`, the new label facts and hints to the existing products.
- `../scripts/build_catalog2.py` rebuilds `data/products.json` from the shop files in `../raw/`.
