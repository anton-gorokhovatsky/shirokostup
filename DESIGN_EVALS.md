# Design evaluation scenarios

These scenarios test whether agent-assisted work follows the site's design system when the request describes an intent rather than naming an implementation. They complement product regression tests; they do not replace them.

The suite evaluates predictability, not pixel sameness. Equivalent controls and objects should retain shared behaviour, language, focus, motion, and accessibility across themes and breakpoints. Deliberate visual differences are welcome when they clarify the content and remain legible and operable.

## When to run the suite

- Run one relevant scenario for a focused interface change.
- Run all five scenarios when changing `AGENTS.md`, `UX_RULES.md`, `DESIGN_PRINCIPLES.md`, shared editorial rules, interaction behaviour, colour or spacing roles, motion grammar, agent skills, or model integration.
- Do not expand an unrelated micro-fix into the full suite. Keep the project's normal sequence: focused edit, focused visual comparison, accessibility release gate.
- Run generation scenarios against a disposable branch or worktree based on the accepted baseline. Record the base commit, agent/model, instructions, patch, checks, and render evidence so later runs are comparable.
- Phrase test prompts naturally. Do not name selectors, classes, components, CSS properties, or the expected implementation.

## Evaluation layers

Every run is reviewed in three separate layers. An aggregate score must not conceal a failure in any one layer.

1. **Mechanical contracts** — the implementation reuses established structures and roles, introduces no arbitrary parallel pattern, passes the relevant static and browser checks, and preserves WCAG 2.2 AA requirements.
2. **Rendered behaviour** — the affected flow is exercised in a real browser at the relevant widths, themes, input modes, zoom, and motion preference. Touch changes require a real mobile-browser gesture check; Playwright emulation alone is not acceptance.
3. **Human visual judgement** — the result is calm, intentional, legible, and appropriately expressive; hierarchy serves Olga's work; motion and decoration add meaning without competing with content.

Record each layer as **Accept**, **Concern**, or **Fail**, with one sentence of evidence. A run passes only when all three layers are **Accept**. Convert any stable, mechanically testable regression discovered by an eval into a product regression test.

For a documentation-only rules change, review all five intent prompts and their contracts against the accepted implementation; record explicitly that no new interface patch was generated. This is a baseline and instruction-consistency review, not a claim that a new design or model passed a generation experiment. Keep inherited concerns visible; accepting a better documented standard does not turn those concerns into an accepted interface outcome. Use disposable branches/worktrees when actually generating alternative implementations.

## Mandatory UX coverage

Apply [`UX_RULES.md`](UX_RULES.md) and consult the [source register](docs/nng-research.md) for context. Every run names the visitor's task, applicable rules, and evidence type. A browser action by an agent is expert inspection, not a user-research participant.

| Scenario | Required UX coverage |
| --- | --- |
| 1 — first screen | UX-01–04, UX-12–15, UX-17–18: identity, purpose, a discoverable path to work, event priority, reflow |
| 2 — archive stacks | UX-06–08, UX-11–12, UX-16: explicit control, image/caption/count agreement, focus, truthful imagery |
| 3 — routes and motion | UX-07, UX-12–15, UX-17–18: content remains available, native scrolling, stable layers, static alternative |
| 4 — CTA and links | UX-03–08, UX-12–15, UX-19–21: destination, semantics, full hit area, coherent footer, recovery and choice |
| 5 — editorial typography | UX-05, UX-09–15, UX-20: scanning and depth, authorship, labels, real context, full composition |

UX-22–23 govern evidence in every scenario. UX-24 applies when a request adds a new function. Review the whole affected block and its neighbours after the final edit, not only a cropped control. A legacy pattern that conflicts with new evidence is recorded as a concern and gets a scoped follow-up; it is never silently promoted into a universal convention.

## Scenario 1 — responsive first screen

**Intent-level prompt**

> Приведи первый экран окончательно в порядок: он должен быть аккуратным и красивым на любом устройстве, в том числе когда показано ближайшее событие.

**The result must preserve**

- an immediately understandable identity and practice, with a discoverable direct path to selected work;
- the event ticket as a layout participant rather than an overlay over the statement;
- a coherent composition in both active-ticket and dismissed/no-ticket states;
- complete title letterforms, intentional line breaks, and one typographic hierarchy;
- readable reflow at desktop, 390 px, 320 px, and 200% text size without clipping or horizontal scroll;
- keyboard access, visible focus, comfortable targets, reduced motion, and System / Light / Dark modes.

**Mechanical evidence**

```sh
pnpm check
pnpm exec playwright test --grep "hero reserves|content reflows|index keeps"
```

**Rendered evidence**

- Compare the active and dismissed/no-ticket states at desktop, 390 px, and 320 px.
- Inspect the narrow composition at 200% text size and in all three theme modes.
- Confirm that the title and ticket read as one composition rather than two competing panels.
- Traverse introduction → work → contact. Assess whether the available paths are apparent before opening the Index; do not equate a successful scripted click with discoverability for a newcomer.

## Scenario 2 — shared archive stacks

**Intent-level prompt**

> Сделай просмотр фотографий красивым и приятным на мобильном и компьютере; стопка должна разбираться естественно в любую сторону.

**The result must preserve**

- one shared interaction model for both archive stacks;
- either swipe/drag direction and either arrow key advancing the stack, rather than reversing history;
- only the active card leaving while the remaining cards retain believable depth;
- focus moving predictably to the new active card and the counter updating on the same axis;
- captions close enough to describe their image without creating oversized empty fields;
- the Women in the North route above its intended imagery while remaining pointer-safe.

The symmetric cycling behaviour above is the current stack's specific contract, not a general rule for carousels. If the task changes that model, evaluate whether visitors can predict direction and return to a chosen image; record uncertainty without inventing participant evidence. Do not silently reverse one stack while keeping the other unchanged.

**Mechanical evidence**

```sh
pnpm check
pnpm exec playwright test --grep "archive stacks share"
```

**Rendered evidence**

- Exercise both stacks with keyboard and pointer on desktop.
- Exercise both swipe directions in real iOS Safari when touch handling changes.
- Compare counter alignment, caption spacing, card margins, and the resting stack after several advances.

## Scenario 3 — decorative routes and motion

**Intent-level prompt**

> Почини декоративные линии и удели анимациям время: они должны отрисовываться цельно, красиво и находиться на правильном слое.

**The result must preserve**

- continuous strokes without fragmented dashes, flashing joins, or accidental path-length normalisation;
- the intended foreground/background relationship for each route, including the Women, climate, and ARCA illustrations;
- `pointer-events: none` for non-interactive decoration and no obstruction of controls or selection;
- one restrained draw grammar with meaningful timing and no perpetual decorative movement;
- an immediately complete, legible static state for reduced motion;
- essential content that remains available when scrolling back, moving quickly, or losing the interaction script;
- sufficient contrast without the routes overwhelming faces, captions, or primary text in any theme.

**Mechanical evidence**

```sh
pnpm check
pnpm exec playwright test --grep "decorative routes draw"
```

**Rendered evidence**

- Observe each animation from its initial state through completion in a real browser.
- Inspect the same locations with reduced motion and in System / Light / Dark modes.
- Judge line continuity, layer order, reveal rhythm, and whether decoration supports rather than masks the work.

## Scenario 4 — expressive CTA and link feedback

**Intent-level prompt**

> Сделай большой призыв к действию заметно отзывчивее при наведении, но сохрани общий спокойный и дорогой характер сайта.

**The result must preserve**

- a native, stable pointer and the complete semantic link as the hit area;
- the established arrow grammar and a one-to-one relationship between action and symbol, without an icon added merely to decorate every action;
- icons that remain recognisable at rendered size, never rely on tiny visual differences for meaning, and retain visible text or accurate accessible names where the metaphor is not sufficient;
- an equally clear `:focus-visible` response, without relying on hover, colour, or motion alone;
- readable contrast and an understandable destination before activation;
- correct link/button semantics and a deliberate, communicated new-tab decision when applicable;
- rules and underlines optically clear of descenders, with native underlines skipping ink;
- no sticky hover state or essential lost feedback on touch devices;
- reduced-motion behaviour that remains expressive without animated displacement.

**Mechanical evidence**

```sh
pnpm check
pnpm exec playwright test --grep "index keeps|WCAG"
```

**Rendered evidence**

- Compare rest, pointer hover, keyboard focus, and reduced-motion states in Light and Dark modes.
- Move across the full link box to confirm stable feedback and cursor behaviour.
- Temporarily ignore the labels and confirm that repeated symbols retain one familiar meaning; then ignore the symbols and confirm that labels and accessible names still explain each action.
- Judge whether the response is unmistakable yet consistent with the site's restrained motion and material language.
- If a footer utility link changes, inspect the complete footer row, wrapping, image-credit disclosure, and adjacent boundary at desktop and narrow enlarged text. Compare all equivalent utility links, including rest and focus.

## Scenario 5 — continuous editorial typography

**Intent-level prompt**

> Улучши редакционную типографику и переносы: текст должен выглядеть собранно на любом разрешении и не терять характер.

**The result must preserve**

- copy whose length and tone serve a clear editorial or interface purpose, with meaning front-loaded in headings and predictable action labels;
- official names and supplied titles, a calm third-person editorial voice, and explicit actors wherever an action would otherwise be ambiguous;
- a factual distinction between Olga's work and collaborators' contributions, with no invented results or quotations;
- one semantic identity at one typographic scale, even when a heading changes line arrangement;
- fluid, bounded typography that still reaches 200% and does not depend on a few device snapshots;
- correct locale-specific characters, dates, and range punctuation; protected meaningful units without layout-only non-breaking spaces or hard breaks;
- natural prose wrapping and no accidental orphan, repetition, or false hierarchy created by the change;
- sufficient clearance between letterforms and custom rules or underlines;
- readable measures and hierarchy at desktop, 390 px, and 320 px in every theme;
- semantic heading order, useful out-of-context accessible names, machine-readable dates, and no text converted into inaccessible imagery.

**Mechanical evidence**

```sh
pnpm check
pnpm exec playwright test --grep "content reflows|WCAG"
```

**Rendered evidence**

- Read the affected copy in its final desktop, 390 px, 320 px, and 200% layouts.
- Inspect line endings, protected units, punctuation, dates, descenders, rules, heading balance, and the transition between adjacent sections.
- Read headings and action names without their surrounding paragraphs and confirm that the intended meaning and destination remain clear.
- Judge continuity across widths rather than matching a single reference screenshot.

## Run record

Use this compact record for a full-suite run or any comparison across agent/model changes:

```md
### EVAL-YYYY-MM-DD-NN — Scenario N

- Base commit:
- Agent/model and relevant instructions:
- Visitor task and applicable UX rule IDs:
- Resulting patch or commit:
- Mechanical contracts: Accept | Concern | Fail — evidence
- Rendered behaviour: Accept | Concern | Fail — evidence and render paths
- Human visual judgement: Accept | Concern | Fail — evidence
- Regression test added, if any:
- Inherited concerns and evidence still missing:
- Decision: accept | revise | reject
```

The final question remains: can a visitor correctly predict what the interface will do while keeping their attention on Olga's work?

Reference: [Murphy Trueman — Design systems need evals](https://blog.murphytrueman.com/design-systems-need-evals/)
