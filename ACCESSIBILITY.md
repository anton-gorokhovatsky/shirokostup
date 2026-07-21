# Accessibility standard

Accessibility is a release metric for this site, not a later polish pass. The target is WCAG 2.2 Level AA, supported by manual checks in the rendered interface.

The product rationale is reinforced by Yandex's accessibility-settings research: 51% of smartphone users in the study used at least one accessibility setting; text-size changes (35%) and dark mode (27%) were especially common. These settings also help people with temporary and situational limitations, not only permanent disabilities.

## Release gate

Every interface change must preserve or improve all of the following:

- semantic landmarks, a logical heading order, and the correct document language;
- complete keyboard operation, a working skip link, visible focus, and no keyboard trap;
- text contrast of at least 4.5:1, large-text and UI contrast of at least 3:1, including text placed over images;
- readable reflow at 320 CSS px and at 200% text zoom, without clipped or overlapping content;
- useful alternative text for meaningful images and empty alternative text for decoration;
- an accessible three-mode System / Light / Dark control, with System continuing to follow operating-system changes;
- support for `prefers-reduced-motion`; no essential information communicated by motion, hover, or colour alone;
- meaningful link and button names, with comfortable targets (44 × 44 CSS px is the project goal);
- captions or transcripts for any future time-based media.

## Verification

Before a release that changes the interface:

1. Inspect the accessibility tree and run the project's automated accessibility check when available.
2. Navigate the changed flow using only the keyboard, including the index dialog and theme control.
3. Inspect System, Light, and Dark modes at desktop and 390 px mobile widths.
4. Check 200% zoom/reflow, reduced motion, and browser console errors.
5. Read the changed copy in its final layout and review image alternatives in context.

## References

- [Yandex: Accessibility settings research](https://inclusion.yandex.ru/settingsresearch)
- [W3C: Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- [W3C: How to Meet WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)
