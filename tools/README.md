# Build and test tools

- `app_src/` is the source of `app/app.js`. Rebuild it with:
  `python3 -c "A='tools/app_src/';parts=[open(A+'proto_icons.js').read()]+[open(A+f).read() for f in ['main.js','screens1.js','screens2.js','screens3.js']];open('app/app.js','w').write('(function(){\"use strict\";\n'+''.join(parts)+'\n})();\n')"`
- `build_proto.py` builds the single-file prototype (`app_src/mock.js` replaces the server). Paths inside still point at /home/claude; adjust `R` and `A` at the top.
- `apptest/server.js` runs the app locally with an in-memory Redis and a fake AI (ports 8890, 8898, 8899); `apptest/e2e.js` drives it with Playwright.
- `../scripts/build_catalog2.py` rebuilds `data/products.json` from the shop files in `../raw/`.
