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
assert(
  /<link\b[^>]*rel="canonical"[^>]*href="https:\/\/shirokostup\.site\/"/i.test(html) &&
    /<meta\b[^>]*property="og:url"[^>]*content="https:\/\/shirokostup\.site\/"/i.test(html) &&
    count(html, /https:\/\/shirokostup\.site\/assets\/og-card\.jpg\?v=20260723-1/gi) === 4 &&
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
    !css.includes("--site-cursor-") &&
    !css.includes("cursor: url(") &&
    css.includes("cursor: pointer") &&
    css.includes("cursor: grab") &&
    css.includes("cursor: grabbing") &&
    html.includes("data-cursor-trail") &&
    script.includes("drawTrail"),
  "The site must use predictable native cursors while retaining the non-interactive aurora trail.",
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
  /<a\b[^>]*class="event-ticket__link"[\s\S]*?<strong\b[^>]*class="event-ticket__title"[^>]*id="event-ticket-title"/i.test(
    html,
  ) &&
    css.includes(".event-ticket__link:hover .event-ticket__title") &&
    css.includes(".now__card:hover .now__copy h2") &&
    css.includes(".now__card:focus-visible .now__copy h2"),
  "Both event titles must remain inside their links with non-colour hover and keyboard-focus cues.",
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
  script.includes("const heroBounds = heroSection?.getBoundingClientRect()") &&
    script.includes("heroBounds.bottom > headerHeight") &&
    !script.includes('classList.toggle("is-scrolled", window.scrollY > 24)'),
  "The header state must remain tied to the hero instead of changing after a tiny restored scroll.",
);
assert(
  css.includes("font-size: min(var(--type-hero), clamp(4.75rem, 16svh, 10.5rem))") &&
    css.includes("padding-bottom: clamp(9rem, 18svh, 11rem)") &&
    css.includes("@media (max-width: 980px) and (max-height: 800px)") &&
    css.includes("width: min(31vw, 9rem)"),
  "The hero must respond to both viewport width and height, with a dedicated compact mark layout and reserved event space.",
);
assert(
  /<h2\b[^>]*id="work-title"[^>]*data-reveal[^>]*>\s*<span>Long-term<\/span>\s+<span>projects<\/span>\s*<\/h2>/i.test(
    html,
  ) &&
    css.includes(".js .section-heading h2[data-reveal]:not(.is-visible) > span:first-child") &&
    css.includes(".js .section-heading h2[data-reveal]:not(.is-visible) > span:last-child") &&
    css.includes(".js .now__card[data-reveal]:not(.is-visible) .now__date") &&
    css.includes(".js .now__card[data-reveal]:not(.is-visible) .now__copy") &&
    css.includes(".now__card.is-visible:focus-visible .now__copy") &&
    css.includes("transform: translateX(-0.11em)") &&
    css.includes(".section-heading h2 {\n  line-height: 0.82") &&
    css.includes(':root.js[data-motion="reduced"] .section-heading h2[data-reveal] > span'),
  "The work heading and upcoming card must keep optical alignment and staggered motion while preserving focus and reduced-motion states.",
);
assert(
  /<svg\b[^>]*class="hero__mark"[^>]*aria-hidden="true"[^>]*focusable="false"/i.test(html) &&
    count(html.match(/<g\b[^>]*class="hero__mark-ink"[\s\S]*?<\/g>/i)?.[0] ?? "", /<path\b/gi) === 3 &&
    count(html.match(/<g\b[^>]*class="hero__mark-ink"[\s\S]*?<\/g>/i)?.[0] ?? "", /<circle\b/gi) === 1 &&
    count(html.match(/<g\b[^>]*class="hero__mark-aurora"[\s\S]*?<\/g>/i)?.[0] ?? "", /<path\b/gi) === 3 &&
    /<radialGradient\b[^>]*id="hero-mark-aurora-gradient"[^>]*cx="8"[^>]*cy="12"[^>]*r="42"/i.test(html) &&
    /<circle\b[^>]*cx="8"[^>]*cy="12"[^>]*r="3\.5"/i.test(
      html.match(/<g\b[^>]*class="hero__mark-ink"[\s\S]*?<\/g>/i)?.[0] ?? "",
    ) &&
    !html.includes("data-research-field") &&
    !script.includes("researchRoute") &&
    css.includes(".hero__mark") &&
    css.includes("color: var(--ink)") &&
    css.includes("stroke-width: 2.2") &&
    css.includes("stroke-width: 5") &&
    css.includes("@keyframes hero-mark-glow") &&
    css.includes(":root[data-motion=\"reduced\"] .hero__mark-aurora") &&
    css.includes(":root[data-motion=\"reduced\"] .climate-field__path--observed"),
  "The hero must keep one literal monochrome identity mark above a reduced-motion-safe aurora underlay that radiates from its focus point.",
);
assert(
  css.includes(".scroll-cue i {") &&
    css.includes("background: var(--paper)") &&
    css.includes("box-shadow: 0 0 0 0.42rem var(--paper)"),
  "The hero divider must leave a clean background break around the vertical scroll cue arrow.",
);
assert(
  /<article\b[^>]*class="project project--forum"[^>]*data-header-ink="theme"/i.test(html) &&
    /<section\b[^>]*class="about"[^>]*data-header-ink="theme"/i.test(html) &&
    css.includes(".work {") &&
    css.includes(".project--forum {") &&
    css.includes(".about {") &&
    css.includes(".texts {") &&
    css.includes("--editorial-frame: var(--paper-bright)") &&
    css.includes("--editorial-frame-solid: var(--paper-bright)") &&
    count(css, /--editorial-frame: transparent/g) >= 2 &&
    count(css, /--editorial-frame-solid: var\(--paper\)/g) >= 2 &&
    count(css, /background-color: var\(--editorial-frame\)/g) === 2 &&
    count(css, /background: color-mix\(in srgb, var\(--editorial-frame-solid\)/g) === 2 &&
    css.includes("background-image: radial-gradient(var(--texture-dot) 0.65px, transparent 0.65px)"),
  "Forum and Texts must recover their light editorial frames, with route masks matched to the actual surface in both themes.",
);
assert(
  script.includes("moveCursorTrail(menu)") && script.includes("moveCursorTrail(document.body)"),
  "The decorative cursor trail must move into the Index top layer and return to the page.",
);
assert(
  count(html, /data-archive-stack\b/gi) === 2 &&
    count(html, /data-archive-card\b/gi) === 12 &&
    script.includes('document.querySelectorAll("[data-archive-stack]")') &&
    script.includes('archiveStack.closest("figure")'),
  "Both project image stacks must retain independent drag, keyboard, counter, and live-region behaviour.",
);
assert(
  html.includes('aria-label="Eight archival records from the Archive of Artistic Life in Zapolyarye"') &&
    html.includes('data-archive-item-name="archive record"') &&
    html.includes("data-archive-register") &&
    count(html, /data-archive-kind=/gi) === 8 &&
    count(html, /data-archive-year=/gi) === 8 &&
    count(html, /data-archive-counter\b/gi) === 1 &&
    !html.includes("data-archive-register-number") &&
    !script.includes("archiveRegisterNumber") &&
    count(html, /archive-(?:painting-coup-poster|gallery-m-1991|gallery-modern-art-leaflet|russian-arctic-poster)\.jpg/gi) === 4 &&
    script.includes("archiveItemNameSentence") &&
    script.includes("--archive-register-position") &&
    css.includes(".archive-register__marker") &&
    css.includes(".archive-card--document > img") &&
    css.includes("height: calc(100% + 2.05rem)") &&
    css.includes("align-items: flex-start") &&
    css.includes("@media (min-width: 701px) and (max-width: 800px)") &&
    css.includes("right: -1rem"),
  "The Apatity archive must retain its mixed eight-record dossier, accessible item naming, linked catalogue register, and zoom-safe spine.",
);
assert(
  html.includes('class="women-route"') &&
    css.includes(".archive-stack--women .women-route") &&
    css.includes("height: 140%") &&
    css.includes("pointer-events: none"),
  "The Women in the North route must remain visible without intercepting photo dragging.",
);
assert(
    count(html, /women-route__branch/gi) === 2 &&
    count(html, /women-route__cluster--/gi) === 6 &&
    html.includes("women-route__cluster--waypoints") &&
    html.includes("women-route__cluster--junction") &&
    !html.includes("women-route__ink") &&
    css.includes("filter: drop-shadow(0 0 0.75px") &&
    css.includes(".women-route__points rect"),
  "The Women in the North route must retain its branch and source-faithful mix of sparse, dense, and waypoint clusters.",
);
assert(
  count(html, /class="timeline__date"/gi) === 6 &&
    /timeline__date[\s\S]*?<time datetime="2023">2023<\/time>[\s\S]*?ongoing-status/i.test(html) &&
    /timeline__date[\s\S]*?<time datetime="2022">2022<\/time>[\s\S]*?ongoing-status/i.test(html) &&
    css.includes(".timeline .ongoing-status__label") &&
    css.includes("width: 0.72rem") &&
    css.includes("background: var(--aurora-green)") &&
    css.includes("@keyframes ongoing-pulse"),
  "Ongoing project states must remain accessible as consistent pulsing markers beside their corresponding years.",
);
assert(
  css.includes(".climate-field__trace") &&
    !html.includes("climate-field__trace-underlay") &&
    !css.includes(".climate-field__trace-underlay") &&
    css.includes("stroke: color-mix(in srgb, var(--ink) 76%, var(--aurora-blue))") &&
    css.includes("stroke: color-mix(in srgb, var(--ink) 72%, var(--aurora-violet))") &&
    css.includes("--forum-label: #faf9f5") &&
    css.includes("background: color-mix(in srgb, var(--editorial-frame-solid) 94%, transparent)") &&
    css.includes("stroke-dasharray: none") &&
    css.includes(".climate-field__stations") &&
    css.includes(".climate-field__path--observed") &&
    css.includes("animation: none") &&
    !css.includes(".project--forum:hover .climate-field__trace--baseline"),
  "The climate route must stay crisp on imagery, remain below opaque station labels, soften beneath copy, and avoid Safari-fragile mobile animation.",
);
assert(
    css.includes("aspect-ratio: 1.58") &&
    css.includes("object-position: 68% center") &&
    css.includes("transform-origin: 68% center") &&
    /<figcaption\b[^>]*class="forum-caption__semantic"/i.test(html) &&
    /<p\b[^>]*class="forum-caption"[^>]*aria-hidden="true"/i.test(html) &&
    css.includes(".forum-caption {") &&
    css.includes(".project--forum .project__information") &&
    css.includes(".project__visual--forum {") &&
    css.includes("z-index: 3") &&
    css.includes("grid-column: 2") &&
    css.includes("rgba(250, 249, 245, 0.98) 18%") &&
    css.includes("text-shadow: 0 0 0.6rem"),
  "The Arctic Art Forum image must keep its meaningful right-edge forms in view while a semantic caption and a separate top-layer plaque keep the route physically below its material.",
);
assert(
  count(html, /class="timeline__date"/gi) === 6 &&
    count(html, /class="timeline__role"/gi) === 6 &&
    !html.includes("timeline__period") &&
    css.includes("grid-template-columns: 7rem minmax(0, 1fr) minmax(5.8rem, auto)") &&
    css.includes(".timeline__date") &&
    css.includes(".timeline__state"),
  "The selected-roles table must keep each ongoing state grouped with its year while preserving predictable role columns.",
);
assert(
  css.includes(".project__information {") &&
    css.includes("position: relative") &&
    css.includes(".js .project__information[data-reveal]") &&
    css.includes("transition: opacity 560ms"),
  "Project copy must move continuously with document scrolling instead of snapping into a sticky position or adding a competing vertical reveal.",
);
assert(!/[←↑→↓↗↘↙↖]/u.test(html), "Directional actions must use the shared vector-arrow system.");

if (failures.length) {
  console.error(`Site quality check failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Site quality check passed: ${ids.length} ids, ${fragmentLinks.length} internal links, ${imageTags.length} images.`);
}
