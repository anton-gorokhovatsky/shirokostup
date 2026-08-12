# Project instructions

## Accessibility is a release gate

Treat accessibility as a required metric for every interface, content, and visual change in this repository. Follow [`ACCESSIBILITY.md`](ACCESSIBILITY.md) and target WCAG 2.2 Level AA.

Do not call a visual change complete without one relevant real-browser render after the final edit. For affected UI, verify keyboard access, visible focus, semantic names/order, contrast, reflow, reduced motion, and System / Light / Dark theme modes. Preserve the skip link, meaningful image alternatives, operating-system colour-scheme support, and the manual theme control.

Keep checks proportional to the change: one focused change, one focused visual comparison, and the accessibility release gate.

## Consistency means predictability

Follow [`DESIGN_PRINCIPLES.md`](DESIGN_PRINCIPLES.md). Reuse established behaviour, state, language, tokens, and motion for equivalent elements across themes and breakpoints. Consistency does not mean visual sameness: prefer clarity and context when a deliberate divergence improves the experience, and never preserve a weak pattern merely because it already exists.

For agent-assisted interface work, use the representative scenarios in [`DESIGN_EVALS.md`](DESIGN_EVALS.md). Run the one relevant scenario for a focused change; run the complete suite only when shared design rules, interaction patterns, tokens, motion, or agent guidance change. Passing an eval narrows review but never replaces the accessibility gate, a relevant real-browser render, or human visual judgement.

## Editorial text is interface

Follow [`EDITORIAL_STYLE.md`](EDITORIAL_STYLE.md) for visible copy, metadata, captions, dates, statuses, and accessible names. Write and typeset for the language of the content rather than applying one locale's punctuation rules everywhere. Review copy in its final rendered context: do not use hard line breaks or non-breaking spaces merely to reproduce one screenshot, and never trade semantic clarity or reflow for a preferred line ending.

For a focused copy or typography change, run Scenario 5 in [`DESIGN_EVALS.md`](DESIGN_EVALS.md) together with the accessibility release gate. A change to the shared editorial rules themselves requires the complete design-evaluation suite.
