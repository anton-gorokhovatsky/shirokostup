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

// Document and navigation contracts. Geometry and interaction are verified in Playwright.
assert(/<html\b[^>]*\blang="en"/i.test(html), "The document needs an English language declaration.");
assert(count(html, /<h1\b/gi) === 1, "The document must contain exactly one h1.");
assert(/<a\b[^>]*class="skip-link"[^>]*href="#main"/i.test(html), "The skip link must target #main.");
assert(/<main\b[^>]*id="main"[^>]*tabindex="-1"/i.test(html), "#main must remain programmatically focusable.");
assert(
  /<dialog\b[^>]*id="site-index"[^>]*aria-labelledby="index-title"/i.test(html),
  "The Index dialog needs its accessible label.",
);
assert(/<meta\b[^>]*name="color-scheme"[^>]*content="light dark"/i.test(html), "The page must advertise both colour schemes.");
assert(/<meta\b[^>]*name="theme-color"/i.test(html), "The page needs a browser theme colour.");
assert(
  /<link\b[^>]*rel="canonical"[^>]*href="https:\/\/shirokostup\.site\/"/i.test(html) &&
    /<meta\b[^>]*property="og:url"[^>]*content="https:\/\/shirokostup\.site\/"/i.test(html) &&
    !html.includes("anton-gorokhovatsky.github.io/shirokostup"),
  "Canonical and social metadata must consistently use the production domain.",
);
assert(
  /property="og:image"/i.test(html) &&
    /property="og:image:width" content="1200"/i.test(html) &&
    /property="og:image:height" content="630"/i.test(html) &&
    /name="twitter:card" content="summary_large_image"/i.test(html) &&
    /rel="apple-touch-icon" sizes="180x180"/i.test(html),
  "Social sharing and home-screen image metadata is incomplete.",
);
assert(
  /type="application\/ld\+json"/i.test(html) &&
    html.includes('"@type": "WebSite"') &&
    html.includes('"@type": "Person"') &&
    html.includes('"@id": "https://shirokostup.site/#website"'),
  "Structured WebSite and Person metadata is incomplete.",
);

const ids = [...html.matchAll(/\bid="([^"]+)"/gi)].map((match) => match[1]);
const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
assert(duplicateIds.length === 0, `Duplicate ids: ${[...new Set(duplicateIds)].join(", ")}`);

const idSet = new Set(ids);
const fragmentLinks = [...html.matchAll(/\bhref="#([^"]+)"/gi)].map((match) => match[1]);
for (const fragment of fragmentLinks) {
  assert(idSet.has(fragment), `Internal link #${fragment} has no matching target.`);
}

// Content and local-asset contracts.
const imageTags = html.match(/<img\b[^>]*>/gi) ?? [];
assert(imageTags.length > 0, "The portfolio should contain project imagery.");
for (const tag of imageTags) {
  const src = attribute(tag, "src");
  const alt = attribute(tag, "alt");
  assert(Boolean(src), `Image is missing src: ${tag.slice(0, 100)}`);
  assert(alt !== undefined && alt.trim().length > 0, `Image needs meaningful alt text: ${src ?? "unknown"}`);
  assert(Boolean(attribute(tag, "width")) && Boolean(attribute(tag, "height")), `Image needs intrinsic dimensions: ${src}`);
}

const directLocalReferences = [...html.matchAll(/\b(?:href|src)="([^"]+)"/gi)]
  .map((match) => match[1])
  .filter((value) => !/^(?:https?:|mailto:|tel:|#|data:)/i.test(value));
const srcsetReferences = [...html.matchAll(/\bsrcset="([^"]+)"/gi)].flatMap((match) =>
  match[1]
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean),
);
const localReferences = [...directLocalReferences, ...srcsetReferences]
  .map((value) => value.split(/[?#]/)[0])
  .map((value) => value.replace(/^\/+/, ""))
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
assert(!html.includes(" · "), "Middle-dot separators must stay attached to the preceding phrase.");
assert(!/[←↑→↓↗↘↙↖]/u.test(html), "Directional actions must use the shared vector-arrow system.");

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

// Theme, motion and native-interaction contracts.
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
  !html.includes("data-comet-cursor") &&
    !script.includes("cometCursor") &&
    !css.includes("has-custom-cursor") &&
    !css.includes("--site-cursor-") &&
    !css.includes("cursor: url(") &&
    !css.includes("cursor: none !important") &&
    !css.includes("cursor: revert !important"),
  "The site must retain predictable native cursors.",
);
assert(
  html.includes("data-cursor-trail") &&
    script.includes("drawTrail") &&
    css.includes(".cursor-trail") &&
    css.includes("pointer-events: none"),
  "The non-interactive decorative trail must remain present and pointer-safe.",
);
assert(script.includes("showModal") && script.includes("focus"), "The Index must retain modal focus management.");

// Event, hero and Index structure.
assert(
  /<aside\b[^>]*data-event-ticket[^>]*data-event-until="2026-08-14T00:00:00\+02:00"/i.test(html) &&
    /<time\b[^>]*datetime="2026-08-13T18:00:00\+02:00"/i.test(html),
  "The upcoming-event ticket needs machine-readable date and expiry data.",
);
assert(
  /<a\b[^>]*class="event-ticket__link"[\s\S]*?<strong\b[^>]*class="event-ticket__title"[^>]*id="event-ticket-title"/i.test(
    html,
  ) &&
    count(html, /href="https:[/][/]kinmuseum[.]se[/]en[/]events[/]samtal-med-olga-shirokostup-och-tanja-muravskaja"/gi) === 2,
  "The fixed invitation and full event card must retain one linked event title and destination.",
);
assert(
  script.includes("olga-event-ticket-dismissed") &&
    script.includes("updateEventTicketVisibility") &&
    !script.includes("event-ticket--reminder"),
  "The event ticket must remain dismissible without the retired reminder state.",
);

const heroMark = html.match(/<svg\b[^>]*class="hero__mark"[\s\S]*?<\/svg>/i)?.[0] ?? "";
const heroInk = heroMark.match(/<g\b[^>]*class="hero__mark-ink"[\s\S]*?<\/g>/i)?.[0] ?? "";
const heroAurora = heroMark.match(/<g\b[^>]*class="hero__mark-aurora"[\s\S]*?<\/g>/i)?.[0] ?? "";
assert(
  /aria-hidden="true"/i.test(heroMark) &&
    /focusable="false"/i.test(heroMark) &&
    count(heroInk, /<path\b/gi) === 3 &&
    count(heroInk, /<circle\b/gi) === 1 &&
    count(heroAurora, /<path\b/gi) === 3,
  "The hero identity mark structure is incomplete.",
);
assert(
  /<h2\b[^>]*id="work-title"[^>]*data-reveal[^>]*>\s*<span>Long-term<\/span>\s+<span>projects<\/span>\s*<\/h2>/i.test(
    html,
  ),
  "The long-term projects heading must preserve its two-line reveal structure.",
);
assert(
  html.includes('<a href="#practice"><span>01</span>Practice</a>') &&
    html.includes('<a href="#contact"><span>05</span>Contact</a>') &&
    script.includes('link.setAttribute("aria-current", "location")'),
  "The Index must expose all five numbered sections and identify the current one.",
);

// Responsive images and both archive implementations.
assert(
  count(html, /<picture\b/gi) === 13 &&
    count(html, /<source\b[^>]*type="image\/avif"/gi) === 13 &&
    count(html, /<source\b[^>]*type="image\/webp"/gi) === 13 &&
    count(html, /\bsrcset=/gi) === 39 &&
    count(html, /decoding="async"/gi) === 13,
  "All editorial images must provide AVIF and WebP sources with responsive fallbacks.",
);
assert(
  count(html, /data-archive-stack\b/gi) === 2 &&
    count(html, /data-archive-card\b/gi) === 12 &&
    count(html, /archive-stack__instruction--desktop/g) === 2 &&
    count(html, /archive-stack__instruction--touch/g) === 2 &&
    script.includes('document.querySelectorAll("[data-archive-stack]")') &&
    script.includes('archiveStack.closest("figure")'),
  "Both project image stacks must retain shared drag, keyboard, counter and instruction behaviour.",
);
assert(
  html.includes('aria-label="Eight archival records from the Archive of Artistic Life in Zapolyarye"') &&
    html.includes('data-archive-item-name="archive record"') &&
    html.includes("data-archive-register") &&
    count(html, /data-archive-kind=/gi) === 8 &&
    count(html, /data-archive-year=/gi) === 8,
  "The Apatity archive must retain its eight-record catalogue metadata.",
);
assert(
  html.includes('class="women-route"') &&
    count(html, /women-route__branch/gi) === 2 &&
    count(html, /women-route__cluster--/gi) === 6 &&
    html.includes("women-route__cluster--waypoints") &&
    html.includes("women-route__cluster--junction"),
  "The Women in the North route must retain its branches and waypoint clusters.",
);

// Project content semantics.
assert(
  count(html, /class="timeline__date"/gi) === 6 &&
    count(html, /class="timeline__role"/gi) === 6 &&
    /timeline__date[\s\S]*?<time datetime="2023">2023<\/time>[\s\S]*?ongoing-status/i.test(html) &&
    /timeline__date[\s\S]*?<time datetime="2022">2022<\/time>[\s\S]*?ongoing-status/i.test(html),
  "Selected roles and ongoing project years must retain their semantic grouping.",
);
assert(
  /<figcaption\b[^>]*class="forum-caption__semantic"/i.test(html) &&
    /<p\b[^>]*class="forum-caption"[^>]*aria-hidden="true"/i.test(html) &&
    !css.includes(".project__visual--forum:hover .project__image") &&
    !css.includes(".project--forum:hover .climate-field__trace--baseline"),
  "The Arctic Art Forum must retain a semantic caption without false hover affordances.",
);

if (failures.length) {
  console.error(`Site quality check failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Site quality check passed: ${ids.length} ids, ${fragmentLinks.length} internal links, ${imageTags.length} images.`,
  );
}
