# Wayfarer

A travel companion web app in the style of iOS: track the countries, cities and islands you've been to, lived in and want to see.

- Pure static frontend (HTML, CSS, JS). No backend, no build step, no external requests.
- Works offline once loaded (service worker).
- Installable: on iPhone, open it in Safari → Share → **Add to Home Screen**.
- Data is stored in the browser (localStorage) on each device. Use **Settings → Export backup** to save or move it.

## Deploy to GitHub Pages

1. Create a repository and put the contents of this folder at its root.
2. Repository → **Settings → Pages** → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Open `https://<user>.github.io/<repo>/`.

All paths are relative, so it works from a sub-path.

## Updating

App code (`index.html`, `app.js`, `styles.css`) is loaded network-first, so changes show up on the next launch while online. Only if you replace files in `data/`, `vendor/` or `icons/`, change `CACHE` in `sw.js` to any new value. An installed app picks up the update on the next launch after it has been online.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

(The service worker needs http(s); opening `index.html` as a file still works, just without offline caching.)

## Data sources

- Country shapes: [world-atlas](https://github.com/topojson/world-atlas) (Natural Earth, public domain)
- Cities: [all-the-cities](https://github.com/zeke/all-the-cities) (GeoNames, CC BY 4.0), towns ≥ 5,000 people plus capitals
- Country names: [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries)
- Libraries: [d3](https://d3js.org) (ISC), [topojson-client](https://github.com/topojson/topojson-client) (ISC)
