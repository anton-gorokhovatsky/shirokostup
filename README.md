# Olga Shirokostup — portfolio

A static editorial portfolio for independent curator, researcher, and educator Olga Shirokostup.

## Run locally

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173`.

There is no build step or runtime dependency. The repository can be published directly with GitHub Pages.

## Checks

```bash
npm run check
```

The automated gate verifies document landmarks, unique anchors, local assets, image alternatives and dimensions, sharing
metadata, consistent contact actions, theme and motion controls, reduced-motion support, responsive CSS, and JavaScript
syntax. It runs for every pull request and every push to `main`.

Automation supports rather than replaces the focused real-browser release gate in [`ACCESSIBILITY.md`](ACCESSIBILITY.md).

## Structure

- `index.html` — content and document structure
- `styles.css` — responsive visual system
- `script.js` — index dialog, scroll progress, and restrained reveal motion
- `assets/images` — locally stored project imagery

## Accessibility

Accessibility is a release metric for every change. The site targets WCAG 2.2 Level AA, provides an explicit System · Light · Dark theme control, keyboard navigation, visible focus, reduced motion, semantic reading order, and responsive text reflow. The permanent release checklist is in [`ACCESSIBILITY.md`](ACCESSIBILITY.md).

The companion interaction rule is consistency as predictability rather than sameness; see [`DESIGN_PRINCIPLES.md`](DESIGN_PRINCIPLES.md).

## Content sources

The first prototype is based on Olga’s supplied website materials and the public project pages linked from that document. Image provenance is recorded in [`assets/images/CREDITS.md`](assets/images/CREDITS.md).
