# MaaS360 Sales Guide · Cold Call Cockpit

The MaaS360 Cold Call page, built directly on the Select T (watsonx Orchestrate) cold call cockpit page, so it has the same layout and design. Live: https://evanjibm.github.io/Sales-Call-Assistant-/

## How it fits together

| Path | What it is |
|---|---|
| `cold-call.html` | The Select T cockpit page, adapted for MaaS360 by `tools/adapt-select-t.py` (generated; don't hand-edit) |
| `data/coldcall-maas360.json` | **All MaaS360 content.** Edit this. |
| `data/maas360-product.js` | Generated from the JSON: the MaaS360 entry in the Select T product format, plus the full data |
| `assets/maas360-extras.js` / `.css` | Adds the MaaS360 content the Select T format has no field for (opener styles, What Did They Say, When They Say No, asks, emails, voicemails, cadence, coaching) into the same sections |
| `tools/` | Build, adapt, and check scripts |
| `reference/` | Gitignored. The Select T page from the repo owner and the old MaaS360 cockpit |

## Common tasks

```bash
npm start          # serve locally, then open http://localhost:8000/cold-call.html
npm run build      # after editing data/coldcall-maas360.json
npm run check      # validate data, confirm every old sentence is present, confirm the build is current
npm run adapt      # after getting a newer Select T page: save it as reference/orchestrate-only.html first
```

Pushing to `main` updates the GitHub Pages site within a minute or two.

---|---|
| `cold-call.html` | Page shell: shared nav, setup panel, empty section containers |
| `assets/cold-call.js` | Renders everything from the data file; selectors, Live Mode (`L`), copy-on-double-click |
| `assets/cold-call.css` | Cockpit styles, built on the carbon.css tokens |
| `data/coldcall-maas360.json` | All content. Field guide: `data/README.md` |
| `carbon.css`, `carbon-theme.js` | **Stand-ins** for the Sales Guide's shared theme files. Replace with the real ones |
| `reference/` | Gitignored. The Orchestrate template and the old MaaS360 page |

## Editing content

Edit `data/coldcall-maas360.json`, then run `npm run check`. When an item has been reviewed, remove its `status`, `draft` or `todo` marker. The page shows the remaining count in its banner and in its **Review list** section. Set `meta.reviewed` to `true` once nothing is left.

---

## Sales-Call-Assistant- (repo notes)
Intern project w/ Rakann

### Git Commands

### Push changes
```bash
# 1. Stage all changed files
git add .

# 2. Commit with a message describing what changed
git commit -m "feat: add XYZ feature"

# 3. Push to GitHub
git push origin main
```

### Pull changes
```bash
# Pull latest from GitHub
git pull origin main
```

### Create a version tag
```bash
git tag v1.0.0
git push origin v1.0.0
```

### Create a feature branch
```bash
git checkout -b feature/my-new-thing
# ... make changes ...
git push origin feature/my-new-thing
```
