# Editorial text and screen typography

Text is part of this site's interface and visual composition. These rules adapt the useful, medium-independent parts of Kontur's interface-writing and screen-typography guidance to an English-language curatorial portfolio. They are not a copy of a SaaS product voice and do not override the wording of artwork, exhibition, institution, or publication titles.

## Voice and purpose

- Write in a calm, precise, informed voice. Prefer concrete practices, places, collaborators, and outcomes to inflated claims or generic cultural language.
- Judge length against the job the text performs. A string may orient, identify, explain, invite, or establish editorial rhythm; shortness is not a goal by itself.
- Put the essential meaning first. A heading should remain useful when it is the only line someone reads, and adjacent headings should be distinguishable by their opening words.
- Default to third-person editorial copy about Olga. Use a neutral, direct voice for navigation, status, and actions. Do not invent a first-person quotation or institutional voice without a source.
- Prefer active constructions and name the actor whenever an action could otherwise be ambiguous. Compact statuses may remain deliberately impersonal and factual.
- Preserve official spelling, capitalisation, diacritics, and punctuation in names and supplied titles. Do not silently “correct” an artwork or organisation into the house style.
- Do not repeat the same information in a kicker, heading, description, and helper label. Each layer should add orientation or detail.

## Interface labels and actions

- Name links and buttons by the destination or outcome: `View the project`, `Visit the exhibition`, `Enter the archive`, `Event details`. Avoid `Click here`, vague `More`, and labels that only make sense after reading nearby text.
- Keep equivalent actions verbally consistent across sections and breakpoints. Change a label only when the destination or task genuinely differs.
- Use short, factual state labels such as `Upcoming`, `Past event`, and `Ongoing`. Do not use colour, position, or motion as the only explanation of state.
- A single heading, compact label, caption, button, or tooltip does not need a final full stop. Full sentences in prose retain normal punctuation.
- Accessible names must make sense out of context and may add destination, date, or format detail that would be redundant visually.
- If a future message reports a problem, lead with what happened and what the visitor can do next. Do not blame the visitor or hide the useful action behind an abstract title.

## Screen typography

- Use real Unicode characters instead of visual approximations. In original English copy use curly quotation marks (“…” and ‘…’) and the typographic apostrophe (’); use an en dash for closed numeric or year ranges (`2021–2023`) and the mathematical minus sign (`−`) for negative values.
- Use non-breaking spaces only to protect units that should remain meaningful together: a number and unit, initials and surname, a compact date, or another genuinely inseparable label. Do not bind ordinary prose just to force an attractive line ending.
- Do not insert `<br>` elements, hidden duplicate words, or non-breaking spaces solely to match one viewport. Prefer bounded fluid type, readable measures, text balancing, and component-aware layout. Intentional display-line spans are acceptable only when the full semantic text, narrow reflow, and 200% text size remain intact.
- Use lining tabular numerals where values are compared vertically or must stay on one axis, such as counters, timelines, and schedules. Keep proportional numerals where their editorial rhythm is more appropriate.
- Avoid all-caps body copy and display headings. Compact metadata and navigational kickers may use the established spaced-cap treatment; prefer natural-case source text with visual casing handled by CSS.
- Never convert meaningful text into an image. Preserve selectable text, semantic headings, useful reading order, and language metadata.
- Review line endings as part of layout, but do not “fix” every short final line. Intervene only when a break obscures meaning, separates a protected unit, creates false hierarchy, or noticeably damages the composition across the relevant width range.

## Dates, times, and ranges

- Use a stable, locale-aware format. The expanded English event form is `13 August 2026` and `18:00`; a compact ticket may use `13`, `Aug`, and `18:00` when the surrounding structure supplies the meaning.
- Mark machine-readable dates and times with `<time datetime="…">`. Keep the event time zone explicit in data even when it is not repeated visually.
- Treat the factual start and the interface lifecycle as different concepts: `startsAt` states when an event begins; `archivesAt` states when its invitation becomes a past-event record.
- Use an en dash for a closed range (`2021–2023`). Use the explicit `Ongoing` state for active work rather than an ambiguous open-ended dash.
- Keep dates, counters, venues, cities, and event states in the same order and format across desktop, mobile, accessible names, and generated fallback markup.

## Language-specific rules

The site's default editorial language is English. Apply punctuation and date conventions to the actual language of each passage rather than transliterating another locale's rules.

For future Russian copy:

- use «ёлочки» for first-level quotation marks and „лапки“ for quotations inside quotations;
- use `ё` where omission creates ambiguity and in a person's or organisation's official spelling;
- protect genuinely inseparable units with a normal non-breaking space;
- use the project's long dash for sentence punctuation and an en dash for closed numeric ranges;
- retain Russian date, number, and abbreviation conventions inside Russian passages only.

## Review before release

1. Read the changed copy in context and confirm that every heading, status, caption, and action performs a distinct job.
2. Check official names and titles against their source. Confirm locale, quotation marks, apostrophes, dashes, date formats, and protected units.
3. Inspect semantic heading order, accessible names, `<time>` values, and the reading order without relying on visual proximity.
4. Render the affected text at desktop, 390 px, 320 px, and 200% text size in System, Light, and Dark modes. Check natural wrapping, complete letterforms, readable measure, and clearance from rules and decoration.
5. Run Scenario 5 in [`DESIGN_EVALS.md`](DESIGN_EVALS.md) and the accessibility release gate. If a stable mistake can be detected mechanically without false positives, add it to the product checks.

## References

- [Kontur Guides — Screen typography](https://guides.kontur.ru/principles/text/typography/)
- [Kontur Guides — Interface text](https://guides.kontur.ru/principles/text/styleguide/)
