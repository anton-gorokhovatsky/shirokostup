# Design principles

## Consistency means predictability

Consistency is a project rule, but it does not mean making every section look the same. The goal is to help people recognise patterns, predict behaviour, and spend their attention on Olga's work rather than relearning the interface.

- Reuse the same behaviour, names, target sizes, focus treatment, and motion grammar for the same kind of control.
- Preserve component behaviour across light/dark themes, breakpoints, keyboard, touch, and reduced-motion settings.
- Use the established paper texture, serif/sans hierarchy, line system, colour roles, and restrained motion before introducing a new visual rule.
- Give motion a directional role: ease out when an element enters, ease in when it exits, and ease in–out when it moves between visible states. Keep feedback brief, preserve focus order, and remove decorative movement under reduced-motion preferences.
- Treat the Northern Lights palette as a quiet environmental reference: ice blue, aurora green, and dusk violet on archival paper or night-sky surfaces. Keep it muted and functional rather than neon or decorative, and preserve contrast first.
- Use the matte-ice material only for navigation, controls, and compact labels over imagery. Keep it as one restrained translucent family with readable contrast: no milky panels, lens distortion, or glass over long-form text and faces.
- Protect meaningful typographic units from awkward breaks, balance display lines, and keep prose wrapping natural. Completed date ranges use an en dash; active work uses an explicit Ongoing status rather than a dangling dash.
- Keep links, buttons, dialogs, labels, captions, and dates semantically and verbally consistent.
- Prefer clarity and the needs of the current content over rigid pattern reuse. Any divergence should be intentional, legible, and accessible.
- Do not reproduce a weak pattern just to remain consistent; improve the shared pattern instead.
- Add expressive moments sparingly, on top of a familiar and dependable foundation.

The release question is not “does everything look identical?” but “can a person correctly predict what this will do?”

Reference: [DOC — Consistency](https://www.doc.cc/syntax/consistency)

## Typography and layout are continuous

Treat typography and layout as bounded relationships rather than a small set of device snapshots.

- Define display size, line height, spacing, and measure with readable minimums and maximums. Prefer `rem`-inclusive `clamp()` functions so viewport width and the reader's chosen text size both remain inputs.
- Keep one semantic identity at one typographic scale. “Olga Shirokostup” may change line arrangement, but first name and surname must not imply a false hierarchy through different sizes.
- Let each component adapt when its own content no longer fits, rather than inheriting breakpoints named after devices. Use container-aware rules where they materially improve a component, while preserving the shared grid, type roles, and interaction language.
- Accessibility takes precedence over visual compression. Do not use scaling formulas that prevent text from reaching 200%, and verify critical display text at narrow reflow and enlarged-text conditions.
- Continuous behaviour should feel calm and legible: avoid abrupt jumps, accidental single-word lines, and controls whose visual weight changes merely because the viewport crossed an arbitrary threshold.

References: [Max Kohler — Continuous Typography](https://www.maxkohler.com/posts/continuous-typography/), [Matthias Ott — Compressed Fluid Typography](https://matthiasott.com/notes/compressed-fluid-typography), and [Aida Pacheva — Новый подход в дизайне адаптивности веб-сайтов](https://medium.com/@aidapacheva/%D0%BD%D0%BE%D0%B2%D1%8B%D0%B9-%D0%BF%D0%BE%D0%B4%D1%85%D0%BE%D0%B4-%D0%B2-%D0%B4%D0%B8%D0%B7%D0%B0%D0%B9%D0%BD%D0%B5-%D0%B0%D0%B4%D0%B0%D0%BF%D1%82%D0%B8%D0%B2%D0%BD%D0%BE%D1%81%D0%B8-%D0%B2%D0%B5%D0%B1-%D1%81%D0%B0%D0%B9%D1%82%D0%BE%D0%B2-c8532d409c80).
