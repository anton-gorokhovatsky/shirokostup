# Project instructions

## Mandatory UX rules

Follow [`UX_RULES.md`](UX_RULES.md) for every design, content, interface, and implementation decision. Its 24 rules are project requirements, not optional inspiration. The primary-source evidence and its limits are in [`docs/nng-research.md`](docs/nng-research.md). Also consult the owner's [web-project principles](https://app.notion.com/p/gorokhovatsky/3a6777056402808bb79df09beedc4161) when relevant.

Before changing the interface, identify the visitor's task, applicable `UX-*` rules, and verification. Do not silently weaken a rule, remove a check, or preserve a poor pattern merely because it exists. A revision of the standard needs an explicit owner decision and a recorded rationale with evidence; an ordinary implementation request is not that decision.

Keep the main routes discoverable, link destinations predictable, content and attribution truthful, and the visitor in control. Review the entire affected composition after the final edit, including adjacent elements and responsive wrapping. Distinguish automated checks, browser/device evidence, expert judgement, and actual user research. Track inherited concerns honestly without expanding an unrelated task into a redesign.

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
