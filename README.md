# Olga Shirokostup — portfolio

A static editorial portfolio for independent curator, researcher, and educator Olga Shirokostup.

## Run locally

```bash
corepack enable
pnpm install
pnpm run build
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

The site remains static and can be published directly with GitHub Pages. The build step only combines the authored CSS
modules into `styles.css` and updates content-derived cache keys in `index.html`.

## Checks

```bash
pnpm run check
pnpm exec playwright install chromium webkit
pnpm run test:browser
```

The fast gate verifies generated files, document landmarks, unique anchors, local assets, image alternatives and
dimensions, sharing metadata, consistent contact actions, theme and motion controls, JavaScript syntax, and performance
budgets. Playwright then checks rendered Chromium and Safari/WebKit layouts, both archive stacks, keyboard focus, themes,
reduced motion, and WCAG A/AA rules with axe. Both gates run for every pull request and push to `main`.

Automation supports rather than replaces the focused real-browser release gate in [`ACCESSIBILITY.md`](ACCESSIBILITY.md).

## Responsive images

Install the pinned image dependency and regenerate the existing AVIF, WebP, and JPEG variants when source imagery
changes:

```bash
python3 -m pip install -r requirements-images.txt
pnpm run images
```

## Structure

- `index.html` — content and document structure
- `styles/*.css` — authored visual-system modules
- `styles.css` — generated browser bundle; do not edit directly
- `script.js` — index dialog, scroll progress, and restrained reveal motion
- `scripts/build-assets.mjs` — deterministic CSS bundle and cache-key generator
- `tests/site.spec.mjs` — rendered desktop/mobile interaction and accessibility checks
- `assets/images` — locally stored project imagery

## Accessibility

Accessibility is a release metric for every change. The site targets WCAG 2.2 Level AA, provides an explicit System · Light · Dark theme control, keyboard navigation, visible focus, reduced motion, semantic reading order, and responsive text reflow. The permanent release checklist is in [`ACCESSIBILITY.md`](ACCESSIBILITY.md).

The companion interaction rule is consistency as predictability rather than sameness; see [`DESIGN_PRINCIPLES.md`](DESIGN_PRINCIPLES.md).

## Content sources

The first prototype is based on Olga’s supplied website materials and the public project pages linked from that document. Image provenance is recorded in [`assets/images/CREDITS.md`](assets/images/CREDITS.md).
