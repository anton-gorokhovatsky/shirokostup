import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(resolve(root, "index.html"), "utf8");
const css = await readFile(resolve(root, "styles.css"), "utf8");
const script = await readFile(resolve(root, "script.js"), "utf8");
const failures = [];

const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

const count = (source, pattern) => [...source.matchAll(pattern)].length;
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))?.[1];

assert(/<html\b[^>]*\blang="en"/i.test(html), "The document needs an English language declaration.");
assert(count(html, /<h1\b/gi) === 1, "The document must contain exactly one h1.");
assert(/<a\b[^>]*class="skip-link"[^>]*href="#main"/i.test(html), "The skip link must target #main.");
assert(/<main\b[^>]*id="main"[^>]*tabindex="-1"/i.test(html), "#main must remain programmatically focusable.");
assert(/<dialog\b[^>]*id="site-index"[^>]*aria-labelledby="index-title"/i.test(html), "The Index dialog needs its accessible label.");
assert(/<meta\b[^>]*name="color-scheme"[^>]*content="light dark"/i.test(html), "The page must advertise both colour schemes.");
assert(/<meta\b[^>]*name="theme-color"/i.test(html), "The page needs a browser theme colour.");
assert(/property="og:image"/i.test(html) && /name="twitter:card"/i.test(html), "Social sharing metadata is incomplete.");
assert(/type="application\/ld\+json"/i.test(html), "Structured Person metadata is missing.");

const ids = [...html.matchAll(/\bid="([^"]+)"/gi)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
assert(duplicateIds.length === 0, `Duplicate ids: ${[...new Set(duplicateIds)].join(", ")}`);

const idSet = new Set(ids);
const fragmentLinks = [...html.matchAll(/\bhref="#([^"]+)"/gi)].map((match) => match[1]);
for (const fragment of fragmentLinks) {
  assert(idSet.has(fragment), `Internal link #${fragment} has no matching target.`);
}

const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
assert(imageTags.length > 0, "The portfolio should contain project imagery.");
for (const tag of imageTags) {
  const src = attribute(tag, "src");
  const alt = attribute(tag, "alt");
  assert(Boolean(src), `Image is missing src: ${tag.slice(0, 100)}`);
  assert(alt !== undefined && alt.trim().length > 0, `Image needs meaningful alt text: ${src ?? "unknown"}`);
  assert(Boolean(attribute(tag, "width")) && Boolean(attribute(tag, "height")), `Image needs intrinsic dimensions: ${src}`);
}

const localReferences = [...html.matchAll(/\b(?:href|src)="([^"]+)"/gi)]
  .map((match) => match[1])
  .filter((value) => !/^(?:https?:|mailto:|tel:|#|data:)/i.test(value))
  .map((value) => value.split(/[?#]/)[0])
  .filter(Boolean);

for (const reference of new Set(localReferences)) {
  try {
    await access(resolve(root, reference));
  } catch {
    failures.push(`Missing local asset: ${reference}`);
  }
}

const externalLinks = [...html.matchAll(/\bhref="(https?:\/\/[^"]+)"/gi)].map((match) => match[1]);
assert(externalLinks.every((link) => link.startsWith("https://")), "External links must use HTTPS.");
assert(
  count(html, /href="https:[/][/]kinmuseum[.]se[/]en[/]events[/]samtal-med-olga-shirokostup-och-tanja-muravskaja"/gi) === 2,
  "The fixed invitation and full event card must share one destination.",
);

const professionalContacts = count(html, /class="professional-contact(?:\s[^"]*)?"/gi);
assert(professionalContacts === 2, "Professional contact must be available in both Index and footer.");
const mailLinks = [...html.matchAll(/href="(mailto:[^"]+)"/gi)].map((match) => match[1]);
assert(mailLinks.length >= 3 && new Set(mailLinks).size === 1, "All contact actions must use the same email address.");
assert(
  count(html, /href="assets\/olga-shirokostup-cv\.pdf"/gi) === 2,
  "The original CV must be linked from both Index and footer.",
);
const cvFile = await readFile(resolve(root, "assets/olga-shirokostup-cv.pdf"));
assert(cvFile.subarray(0, 4).toString() === "%PDF", "The linked CV must remain a valid PDF file.");

for (const mode of ["system", "light", "dark"]) {
  assert(html.includes(`data-theme-choice="${mode}"`), `Missing ${mode} theme control.`);
}
for (const mode of ["system", "reduced"]) {
  assert(html.includes(`data-motion-choice="${mode}"`), `Missing ${mode} motion control.`);
}

assert(css.includes("@media (prefers-reduced-motion: reduce)"), "CSS must respect the operating-system motion preference.");
assert(css.includes(':root[data-motion="reduced"]'), "CSS must support the manual reduced-motion mode.");
assert(css.includes(":focus-visible"), "Visible keyboard focus styles are required.");
assert(css.includes("@media (max-width: 700px)"), "The mobile reflow breakpoint is missing.");
assert(
  css.includes("var(--event-ticket-radius) - var(--event-ticket-inset) - var(--event-ticket-border-width)") &&
    css.includes("--event-ticket-corner-shape: superellipse(1.55)") &&
    css.includes("--event-ticket-tile-size: 3.15rem") &&
    css.includes("corner-shape: var(--event-ticket-corner-shape)"),
  "The event ticket must retain its continuous, concentric corner system.",
);
assert(!html.includes(" · "), "Middle-dot separators must stay attached to the preceding phrase.");
assert(
  !html.includes("data-comet-cursor") &&
    !script.includes("cometCursor") &&
    !css.includes("has-custom-cursor") &&
    css.includes("--site-cursor-default: url") &&
    css.includes("--site-cursor-action: url") &&
    css.includes("@media (hover: hover) and (pointer: fine)"),
  "The custom pointer must use the browser cursor layer so a second DOM pointer cannot appear.",
);
assert(!css.includes("cursor: none !important"), "The native cursor must remain visible and predictable.");
assert(
  !html.includes("event-ticket__arrow") &&
    css.includes("width: min(28.5rem") &&
    css.includes("width: min(18rem") &&
    css.includes("position: absolute") &&
    css.includes("top: var(--event-ticket-inset)") &&
    css.includes("width: 44px"),
  "The compact event ticket must prioritise its calendar and copy while keeping a 44px top-corner dismiss target.",
);
assert(
  css.includes("background-color: var(--glass-background-dense)") &&
    css.includes("border: var(--event-ticket-border-width) solid var(--glass-border)") &&
    css.includes("box-shadow: var(--glass-shadow)") &&
    css.includes("backdrop-filter: blur(24px) saturate(116%)"),
  "The event ticket and Index must retain the same material system.",
);
assert(
  css.includes(":root:not(.is-pointer-navigation) .index-button:focus-visible::before") &&
    css.includes(":root.is-pointer-navigation :focus-visible"),
  "Focus styling must stay keyboard-visible without persisting after pointer input.",
);
assert(script.includes("showModal"), "The Index must retain modal-dialog behaviour.");
assert(script.includes("focus"), "Interactive scripts must retain focus management.");
assert(
  /<aside\b[^>]*data-event-ticket[^>]*data-event-until="2026-08-14T00:00:00\+02:00"/i.test(html),
  "The upcoming-event ticket needs an automatic expiry date.",
);
assert(
  /<time\b[^>]*datetime="2026-08-13T18:00:00\+02:00"/i.test(html),
  "The upcoming-event ticket needs a machine-readable date and time.",
);
assert(
  script.includes("olga-event-ticket-dismissed") && script.includes("updateEventTicketVisibility"),
  "The upcoming-event ticket must remain dismissible and viewport-aware.",
);
assert(
  !script.includes("compactEventTicket") && script.includes("upcomingBounds.top > window.innerHeight * 0.9"),
  "The event ticket must remain visible at every width until the full event card approaches.",
);
assert(
  script.includes("heroSection.getBoundingClientRect().bottom > headerHeight") &&
    !script.includes('classList.toggle("is-scrolled", window.scrollY > 24)'),
  "The header identity must remain visible throughout the hero instead of collapsing after a tiny restored scroll.",
);
assert(
  /<section\b[^>]*class="about"[^>]*data-header-ink="theme"/i.test(html) &&
    css.includes(".about {") &&
    css.includes("background: var(--paper)"),
  "The About section must follow the active colour theme.",
);
assert(
  script.includes("moveCursorTrail(menu)") && script.includes("moveCursorTrail(document.body)"),
  "The decorative cursor trail must move into the Index top layer and return to the page.",
);
assert(
  count(html, /data-archive-stack\b/gi) === 2 &&
    count(html, /data-archive-card\b/gi) === 8 &&
    script.includes('document.querySelectorAll("[data-archive-stack]")') &&
    script.includes('archiveStack.closest("figure")'),
  "Both project image stacks must retain independent drag, keyboard, counter, and live-region behaviour.",
);
assert(
  html.includes('class="women-route"') &&
    css.includes(".archive-stack--women .women-route") &&
    css.includes("pointer-events: none"),
  "The Women in the North route must remain visible without intercepting photo dragging.",
);
assert(!/[←↑→↓↗↘↙↖]/u.test(html), "Directional actions must use the shared vector-arrow system.");

if (failures.length) {
  console.error(`Site quality check failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Site quality check passed: ${ids.length} ids, ${fragmentLinks.length} internal links, ${imageTags.length} images.`);
}
