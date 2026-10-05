# MaaS360 Sales Guide · Cold Call Cockpit

The Cold Call page redesigned on the Select T cockpit layout (Prep → Engage → Discover → Explore → Secure → Voicemail, Live Mode), with every line of content coming from `data/coldcall-maas360.json`.

## Run it

```bash
npm start
```

Then open http://localhost:8000/cold-call.html. Any static server works. Opening the HTML file directly (`file://`) won't work, because browsers block `fetch()` of the data file there.

## Check it

```bash
npm run check
```

- `tools/check-coldcall.mjs`: validates the data (openers, sectors, objection format, proof sources, TODO marks, no hardcoded rep name) and prints every **DRAFT** and **TODO** item.
- `tools/check-coverage.mjs`: proves every sentence of the old cockpit is still in the data file, verbatim. It needs `reference/maas360-old-cockpit.html`, which is gitignored, and skips if that's absent.

## Files

| Path | What it is |
|---|---|
| `cold-call.html` | Page shell: shared nav, setup panel, empty section containers |
| `assets/cold-call.js` | Renders everything from the data file; selectors, Live Mode (`L`), copy-on-double-click |
| `assets/cold-call.css` | Cockpit styles, built on the carbon.css tokens |
| `data/coldcall-maas360.json` | All content. Field guide: `data/README.md` |
| `carbon.css`, `carbon-theme.js` | **Stand-ins** for the Sales Guide's shared theme files. Replace with the real ones |
| `reference/` | Gitignored. The Orchestrate template and the old MaaS360 page |

## Editing content

Edit `data/coldcall-maas360.json`, then run `npm run check`. When an item has been reviewed, remove its `status`, `draft` or `todo` marker. The page shows the remaining count in its banner and in its **Review list** section. Set `meta.reviewed` to `true` once nothing is left.
