# Champion Debating website

Static marketing site for Champion Debating: plain HTML, CSS and JavaScript with no build step.

## Run locally

```bash
python -m http.server 5517
```

Then open http://localhost:5517.

## Hosting

- **Preview:** GitHub Pages, deployed by `.github/workflows/preview-pages.yml` on every push to `main`. The preview is marked `noindex` so search engines ignore it.
- **Production:** AWS. Before each production deploy, run `node tools/generate-sitemap.mjs` to write `sitemap.xml` and `robots.txt`.

## Motion of the week

The home page card rotates through the motions in `motions-of-the-week.js`, one per week, changing on Monday (Sydney time). To add or edit motions, follow the instructions at the top of that file. After editing, bump `motions-of-the-week.js?v=` in `index.html` so browsers fetch the new list.

## Changing the domain

The production domain lives in `site.config.json`. If it changes, update the canonical, Open Graph and JSON-LD URLs in each page to match. The sitemap script refuses to run while any page's canonical URL disagrees with the config.

## Files

| File | Purpose |
|---|---|
| `index.html`, `programs.html`, `competitions.html`, `contact.html` | The site's pages |
| `scene.js` | Hero animation (Canvas 2D, no library) |
| `motions-of-the-week.js` | The rotating list of motions for the home page card |
| `main.js` | Navigation, scroll reveals, card tilt, counters, enquiry form |
| `options.html`, `options.js` | Alternative hero animations kept for later; `noindex` and not linked from the site |
| `Logo.jpg` | Original logo artwork; `logo-mark.png`, `favicon.png`, `apple-touch-icon.png` and `og-image.png` are derived from it |

## Before launch

- Confirm the production domain.
- Replace placeholder content: contact details, statistics, prices and competition claims.
- Add the address, phone and opening hours to the page and the JSON-LD.
- Add a privacy policy page; the enquiry form collects parents' details.
- Connect the enquiry form to a backend. It currently only shows a confirmation message.
