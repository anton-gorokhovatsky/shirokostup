# Project instructions

## Accessibility is a release gate

Treat accessibility as a required metric for every interface, content, and visual change in this repository. Follow [`ACCESSIBILITY.md`](ACCESSIBILITY.md) and target WCAG 2.2 Level AA.

Do not call a visual change complete without one relevant real-browser render after the final edit. For affected UI, verify keyboard access, visible focus, semantic names/order, contrast, reflow, reduced motion, and System / Light / Dark theme modes. Preserve the skip link, meaningful image alternatives, operating-system colour-scheme support, and the manual theme control.

Keep checks proportional to the change: one focused change, one focused visual comparison, and the accessibility release gate.

## Consistency means predictability

Follow [`DESIGN_PRINCIPLES.md`](DESIGN_PRINCIPLES.md). Reuse established behaviour, state, language, tokens, and motion for equivalent elements across themes and breakpoints. Consistency does not mean visual sameness: prefer clarity and context when a deliberate divergence improves the experience, and never preserve a weak pattern merely because it already exists.
