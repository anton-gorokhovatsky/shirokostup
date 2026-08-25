import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const stylesDirectory = join(repositoryRoot, "styles");
const bundledStylesPath = join(repositoryRoot, "styles.css");
const scriptPath = join(repositoryRoot, "script.js");
const htmlPath = join(repositoryRoot, "index.html");
const notFoundHtmlPath = join(repositoryRoot, "404.html");
const eventsPath = join(repositoryRoot, "content", "events.json");
const checkOnly = process.argv.includes("--check");
const extractStyles = process.argv.includes("--extract");
const eventRenderTime = process.env.EVENT_RENDER_TIME ? Date.parse(process.env.EVENT_RENDER_TIME) : Date.now();

if (!Number.isFinite(eventRenderTime)) throw new Error("EVENT_RENDER_TIME must be a valid date when provided.");

const styleParts = [
  "foundation.css",
  "hero.css",
  "work.css",
  "profile.css",
  "responsive.css",
  "modes.css",
];

const digest = (content) => createHash("sha256").update(content).digest("hex").slice(0, 10);

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const validateEvents = (events) => {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error("content/events.json must contain at least one event.");
  }

  const ids = new Set();
  for (const event of events) {
    const requiredTextFields = ["id", "title", "ticketTitle", "kind", "venue", "city", "startsAt", "archivesAt", "timeZone", "url"];
    const missingField = requiredTextFields.find((field) => typeof event[field] !== "string" || event[field].trim() === "");
    if (missingField) throw new Error(`Event ${event.id || "without an id"} needs a non-empty ${missingField}.`);
    if (ids.has(event.id)) throw new Error(`Duplicate event id: ${event.id}.`);
    ids.add(event.id);

    const startsAt = Date.parse(event.startsAt);
    const archivesAt = Date.parse(event.archivesAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(archivesAt) || archivesAt <= startsAt) {
      throw new Error(`Event ${event.id} needs valid startsAt and archivesAt values in chronological order.`);
    }
    if (!event.url.startsWith("https://")) throw new Error(`Event ${event.id} must use an HTTPS URL.`);

    try {
      new Intl.DateTimeFormat("en-GB", { timeZone: event.timeZone }).format(new Date(startsAt));
    } catch {
      throw new Error(`Event ${event.id} has an invalid IANA time zone: ${event.timeZone}.`);
    }
  }
};

const formatEvent = (event) => {
  const startsAt = new Date(event.startsAt);
  const format = (options) => new Intl.DateTimeFormat("en-GB", { ...options, timeZone: event.timeZone }).format(startsAt);
  return {
    day: format({ day: "numeric" }),
    month: format({ month: "short" }),
    date: format({ day: "numeric", month: "long", year: "numeric" }),
    machineDate: format({ year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-"),
    time: format({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  };
};

const renderEvents = (events) => {
  const sortedEvents = [...events].sort((first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt));
  const event = sortedEvents.find((candidate) => eventRenderTime < Date.parse(candidate.archivesAt)) || sortedEvents.at(-1);
  const display = formatEvent(event);
  const eventJson = JSON.stringify(events).replaceAll("<", "\\u003c");
  const details = `${event.title}, ${display.date} at ${display.time}, ${event.venue}, ${event.city}`;

  const ticket = `<!-- GENERATED:event-ticket:start -->
    <script type="application/json" id="event-data">${eventJson}</script>

    <aside
      class="event-ticket"
      data-event-ticket
      data-event-id="${escapeHtml(event.id)}"
      aria-labelledby="event-ticket-title"
      hidden
    >
      <a
        class="event-ticket__link"
        data-event-ticket-link
        href="${escapeHtml(event.url)}"
        aria-label="${escapeHtml(details)}"
      >
        <time class="event-ticket__date" data-event-ticket-date datetime="${escapeHtml(event.startsAt)}">
          <strong data-event-day>${escapeHtml(display.day)}</strong>
          <span data-event-month>${escapeHtml(display.month)}</span>
        </time>
        <span class="event-ticket__copy">
          <span>
            <span class="event-ticket__status" data-event-ticket-status>Event</span>
            <span class="event-ticket__details"
              ><span data-event-city>${escapeHtml(event.city)}</span>&nbsp;·
              <time data-event-ticket-time datetime="${escapeHtml(display.time)}">${escapeHtml(display.time)}</time></span
            >
          </span>
          <strong class="event-ticket__title" id="event-ticket-title" data-event-ticket-title
            >${escapeHtml(event.ticketTitle)}</strong
          >
        </span>
      </a>
      <button
        class="event-ticket__dismiss"
        type="button"
        data-event-ticket-dismiss
        aria-label="Hide event invitation"
      >
        <span aria-hidden="true"></span>
      </button>
    </aside>
    <!-- GENERATED:event-ticket:end -->`;
  const featured = `<!-- GENERATED:featured-event:start -->
      <section
        class="now"
        id="now"
        aria-labelledby="now-title"
        data-featured-event
        data-event-id="${escapeHtml(event.id)}"
        data-event-state="event"
        data-header-ink="dark"
      >
        <div class="section-label section-label--dark">
          <span data-featured-event-status>Event</span
          ><time data-featured-event-date datetime="${escapeHtml(display.machineDate)}">${escapeHtml(display.date)}</time>
        </div>
        <a
          class="now__card"
          data-featured-event-link
          href="${escapeHtml(event.url)}"
          aria-label="Event details: ${escapeHtml(details)}"
          data-reveal
        >
          <div class="now__date" aria-hidden="true">
            <strong data-event-day>${escapeHtml(display.day)}</strong>
            <span><span data-event-month>${escapeHtml(display.month)}</span><br /><span data-event-time>${escapeHtml(display.time)}</span></span>
          </div>
          <span class="dialogue-field" aria-hidden="true">
            <i class="dialogue-field__voice dialogue-field__voice--olga"></i>
            <b class="dialogue-field__line"></b>
            <i class="dialogue-field__voice dialogue-field__voice--tanja"></i>
          </span>
          <div class="now__copy">
            <p><span data-event-kind>${escapeHtml(event.kind)}</span>&nbsp;· <span data-event-venue>${escapeHtml(event.venue)}</span>, <span data-event-city>${escapeHtml(event.city)}</span></p>
            <h2 id="now-title" data-event-title>${escapeHtml(event.title)}</h2>
          </div>
          <span class="now__action" aria-hidden="true">
            <span class="now__action-label">Event details</span>
            <span class="round-arrow"
              ><svg class="arrow-icon" viewBox="0 0 16 16" focusable="false"><use href="#icon-arrow-ne"></use></svg
            ></span>
          </span>
        </a>
      </section>
      <!-- GENERATED:featured-event:end -->`;
  return { ticket, featured };
};

const replaceSingle = (content, pattern, replacement, label, sourceName = "index.html") => {
  const matches = content.match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`));

  if (matches?.length !== 1) {
    throw new Error(`Expected one ${label} cache key in ${sourceName}, found ${matches?.length ?? 0}.`);
  }

  return content.replace(pattern, replacement);
};

const extractCurrentBundle = async () => {
  const currentBundle = await readFile(bundledStylesPath, "utf8");
  const markers = [
    { file: "foundation.css", marker: null },
    { file: "hero.css", marker: "\n.hero {\n" },
    { file: "work.css", marker: "\n.now {\n" },
    { file: "profile.css", marker: "\n.about {\n" },
    { file: "responsive.css", marker: "\n@media (max-width: 1180px) {\n" },
    { file: "modes.css", marker: "\n@media print {\n" },
  ];
  const boundaries = markers.map(({ marker }) => (marker === null ? 0 : currentBundle.indexOf(marker) + 1));

  if (boundaries.some((boundary) => boundary < 0) || new Set(boundaries).size !== boundaries.length) {
    throw new Error("Could not find every stable CSS section marker in styles.css.");
  }

  await mkdir(stylesDirectory, { recursive: true });

  await Promise.all(
    markers.map(async ({ file }, index) => {
      const end = boundaries[index + 1] ?? currentBundle.length;
      const section = currentBundle.slice(boundaries[index], end).trimEnd();
      await writeFile(join(stylesDirectory, file), `${section}\n`);
    }),
  );
};

if (extractStyles) {
  await extractCurrentBundle();
}

const styleSources = await Promise.all(
  styleParts.map(async (file) => ({
    file,
    content: (await readFile(join(stylesDirectory, file), "utf8")).trimEnd(),
  })),
);

const bundledStyles = `${[
  "/* Generated by scripts/build-assets.mjs. Edit files in styles/ instead. */",
  ...styleSources.map(({ file, content }) => `/* ${file} */\n${content}`),
].join("\n\n")}\n`;

const script = await readFile(scriptPath, "utf8");
const html = await readFile(htmlPath, "utf8");
const notFoundHtml = await readFile(notFoundHtmlPath, "utf8");
const events = JSON.parse(await readFile(eventsPath, "utf8"));
validateEvents(events);
const renderedEvents = renderEvents(events);
const nextHtmlWithTicket = replaceSingle(
  html,
  /<!-- GENERATED:event-ticket:start -->[\s\S]*?<!-- GENERATED:event-ticket:end -->/,
  renderedEvents.ticket,
  "generated event ticket",
);
const nextHtmlWithEvents = replaceSingle(
  nextHtmlWithTicket,
  /<!-- GENERATED:featured-event:start -->[\s\S]*?<!-- GENERATED:featured-event:end -->/,
  renderedEvents.featured,
  "generated featured event",
);
const nextHtmlWithStyles = replaceSingle(
  nextHtmlWithEvents,
  /styles\.css\?v=[^"]+/,
  `styles.css?v=${digest(bundledStyles)}`,
  "stylesheet",
);
const nextHtml = replaceSingle(
  nextHtmlWithStyles,
  /script\.js\?v=[^"]+/,
  `script.js?v=${digest(script)}`,
  "script",
);
const nextNotFoundHtmlWithStyles = replaceSingle(
  notFoundHtml,
  /styles\.css\?v=[^"]+/,
  `styles.css?v=${digest(bundledStyles)}`,
  "stylesheet",
  "404.html",
);
const nextNotFoundHtml = replaceSingle(
  nextNotFoundHtmlWithStyles,
  /script\.js\?v=[^"]+/,
  `script.js?v=${digest(script)}`,
  "script",
  "404.html",
);

if (checkOnly) {
  const currentBundle = await readFile(bundledStylesPath, "utf8");
  const failures = [];

  if (currentBundle !== bundledStyles) failures.push("styles.css is not built from the files in styles/.");
  if (html !== nextHtml) failures.push("index.html contains stale generated events or asset cache keys.");
  if (notFoundHtml !== nextNotFoundHtml) failures.push("404.html contains stale asset cache keys.");

  if (failures.length) {
    console.error("Generated assets are out of date:");
    failures.forEach((failure) => console.error(`- ${failure}`));
    console.error("Run `pnpm run build` and commit the generated files.");
    process.exitCode = 1;
  } else {
    console.log(`Generated assets are current: CSS ${digest(bundledStyles)}, JS ${digest(script)}.`);
  }
} else {
  await writeFile(bundledStylesPath, bundledStyles);
  if (html !== nextHtml) await writeFile(htmlPath, nextHtml);
  if (notFoundHtml !== nextNotFoundHtml) await writeFile(notFoundHtmlPath, nextNotFoundHtml);
  console.log(`Built styles.css and cache keys: CSS ${digest(bundledStyles)}, JS ${digest(script)}.`);
}
