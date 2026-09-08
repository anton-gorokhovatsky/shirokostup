const root = document.documentElement;
const header = document.querySelector("[data-header]");
const progressBar = document.querySelector(".reading-progress span");
const menuButton = document.querySelector(".index-button");
const menu = document.querySelector("#site-index");
const menuClose = menu?.querySelector(".index-close");
const menuBody = menu?.querySelector(".site-index__body");
const indexLinks = Array.from(menu?.querySelectorAll(".index-nav a[href^='#']") || []);
const indexEntries = indexLinks
  .map((link) => ({
    link,
    section: document.querySelector(link.getAttribute("href")),
  }))
  .filter((entry) => entry.section);
const themeChoices = Array.from(document.querySelectorAll("[data-theme-choice]"));
const motionChoices = Array.from(document.querySelectorAll("[data-motion-choice]"));
const analyticsConsentPanel = document.querySelector("[data-analytics-consent]");
const analyticsChoices = Array.from(document.querySelectorAll("[data-analytics-choice]"));
const themeColor = document.querySelector('meta[name="theme-color"]');
const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
const systemReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const interactivePointerSelector = "a[href], button:not(:disabled), summary, [role='button'], [role='link']";
const validThemeModes = new Set(["system", "light", "dark"]);
const validMotionModes = new Set(["system", "reduced"]);
const analyticsConsentKey = "olga-analytics-consent";
const metricaId = 111895186;
const metricaScriptUrl = `https://mc.yandex.ru/metrika/tag.js?id=${metricaId}`;
const metricaDisableKey = `disableYaCounter${metricaId}`;
const headerInkSurfaces = Array.from(document.querySelectorAll("[data-header-ink]"));
const credits = document.querySelector(".credits");
const creditsSummary = credits?.querySelector("summary");
const cursorTrail = document.querySelector("[data-cursor-trail]");
const eventData = document.querySelector("#event-data");
const eventTicket = document.querySelector("[data-event-ticket]");
const eventTicketDismiss = document.querySelector("[data-event-ticket-dismiss]");
const heroSection = document.querySelector("#top");
const featuredEventSection = document.querySelector("[data-featured-event]");
let menuCloseTimer = 0;
let creditsCloseTimer = 0;
let themeTransitionTimer = 0;
let eventTicketHideTimer = 0;
let eventStateTimer = 0;
let metricaInitialized = false;

document.addEventListener(
  "pointerdown",
  () => root.classList.add("is-pointer-navigation"),
  { capture: true, passive: true },
);

document.addEventListener(
  "keydown",
  () => root.classList.remove("is-pointer-navigation"),
  { capture: true },
);

const resolveHeaderInk = (inkMode) => {
  const isDarkTheme = document.documentElement.dataset.theme === "dark";

  if (inkMode === "dark" || inkMode === "light") return inkMode;
  if (inkMode === "inverse") return isDarkTheme ? "dark" : "light";
  return isDarkTheme ? "light" : "dark";
};

const updateHeaderInk = () => {
  if (!header) return;

  const sampleY = Math.max(1, Math.min(window.innerHeight - 1, header.getBoundingClientRect().height / 2));
  const activeSurface = headerInkSurfaces.find((surface) => {
    const bounds = surface.getBoundingClientRect();
    return bounds.top <= sampleY && bounds.bottom > sampleY;
  });

  header.dataset.headerInk = resolveHeaderInk(activeSurface?.dataset.headerInk || "theme");
};

const readSavedThemeMode = () => {
  try {
    const savedThemeMode = localStorage.getItem("olga-theme");
    return validThemeModes.has(savedThemeMode) ? savedThemeMode : "system";
  } catch (error) {
    return "system";
  }
};

const readSavedMotionMode = () => {
  try {
    const savedMotionMode = localStorage.getItem("olga-motion");
    return validMotionModes.has(savedMotionMode) ? savedMotionMode : "system";
  } catch (error) {
    return "system";
  }
};

const readSavedAnalyticsConsent = () => {
  try {
    const savedConsent = localStorage.getItem(analyticsConsentKey);
    return savedConsent === "granted" || savedConsent === "denied" ? savedConsent : "unset";
  } catch (error) {
    return "unset";
  }
};

const initializeMetrica = () => {
  if (metricaInitialized) return;

  window[metricaDisableKey] = false;
  if (typeof window.ym !== "function") {
    window.ym = (...args) => (window.ym.a = window.ym.a || []).push(args);
    window.ym.l = Date.now();
  }

  if (!Array.from(document.scripts).some((script) => script.src === metricaScriptUrl)) {
    const metricaScript = document.createElement("script");
    metricaScript.async = true;
    metricaScript.src = metricaScriptUrl;
    document.head.append(metricaScript);
  }

  window.ym(metricaId, "init", {
    ssr: true,
    webvisor: true,
    clickmap: true,
    referrer: document.referrer,
    url: window.location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
  metricaInitialized = true;
};

const stopMetrica = () => {
  window[metricaDisableKey] = true;

  if (metricaInitialized && typeof window.ym === "function") {
    window.ym(metricaId, "destruct");
  }

  metricaInitialized = false;
};

// No queue before consent, no replay after consent, and no navigation delay.
document.addEventListener("click", (event) => {
  if (!metricaInitialized || root.dataset.analyticsConsent !== "granted") return;
  const link = event.target.closest?.("a[href]");
  if (!link) return;
  const href = link.getAttribute("href");
  const goal = href.startsWith("mailto:") ? "email_click"
    : href.endsWith("olga-shirokostup-cv.pdf") ? "cv_open" : link.dataset.analyticsGoal;
  if (!["email_click", "cv_open", "project_open"].includes(goal)) return;
  window.ym(metricaId, "reachGoal", goal, link.dataset.project ? { project: link.dataset.project } : {});
});

const applyAnalyticsConsent = (consent, { save = false } = {}) => {
  const nextConsent = consent === "granted" || consent === "denied" ? consent : "unset";

  root.dataset.analyticsConsent = nextConsent;
  analyticsConsentPanel?.toggleAttribute("hidden", nextConsent !== "unset");

  analyticsChoices.forEach((choice) => {
    if (choice.hasAttribute("aria-pressed")) {
      choice.setAttribute("aria-pressed", String(choice.dataset.analyticsChoice === nextConsent));
    }
  });

  if (save) {
    try {
      localStorage.setItem(analyticsConsentKey, nextConsent);
    } catch (error) {
      // The preference still applies for this visit.
    }
  }

  if (nextConsent === "granted") {
    initializeMetrica();
  } else {
    stopMetrica();
  }
};

const motionIsReduced = () => root.dataset.motion === "reduced";

const moveCursorTrail = (target) => {
  if (!target || !cursorTrail) return;
  target.append(cursorTrail);
};

const applyMotion = (motionMode, { save = false } = {}) => {
  const nextMotionMode = validMotionModes.has(motionMode) ? motionMode : "system";
  const nextMotion = nextMotionMode === "reduced" || systemReducedMotion.matches ? "reduced" : "full";

  root.dataset.motionMode = nextMotionMode;
  root.dataset.motion = nextMotion;

  motionChoices.forEach((choice) => {
    choice.setAttribute("aria-pressed", String(choice.dataset.motionChoice === nextMotionMode));
  });

  if (save) {
    try {
      localStorage.setItem("olga-motion", nextMotionMode);
    } catch (error) {
      // The selected preference still applies for the current visit when storage is unavailable.
    }
  }
};

const resolveTheme = (themeMode) => {
  if (themeMode === "system") {
    return systemTheme.matches ? "dark" : "light";
  }

  return themeMode;
};

const applyTheme = (themeMode, { save = false } = {}) => {
  const nextThemeMode = validThemeModes.has(themeMode) ? themeMode : "system";
  const nextTheme = resolveTheme(nextThemeMode);

  document.documentElement.dataset.themeMode = nextThemeMode;
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;

  if (themeColor) {
    themeColor.content = nextTheme === "dark" ? "#11130f" : "#f2efe7";
  }

  themeChoices.forEach((choice) => {
    const isSelected = choice.dataset.themeChoice === nextThemeMode;
    choice.setAttribute("aria-pressed", String(isSelected));
  });

  updateHeaderInk();

  if (save) {
    try {
      localStorage.setItem("olga-theme", nextThemeMode);
    } catch (error) {
      // The selected theme still applies for the current visit when storage is unavailable.
    }
  }
};

applyTheme(document.documentElement.dataset.themeMode || readSavedThemeMode());
applyMotion(document.documentElement.dataset.motionMode || readSavedMotionMode());
applyAnalyticsConsent(readSavedAnalyticsConsent());

themeChoices.forEach((choice) => {
  choice.addEventListener("click", () => {
    const updateTheme = () => applyTheme(choice.dataset.themeChoice, { save: true });

    if (!motionIsReduced() && typeof document.startViewTransition === "function") {
      document.startViewTransition(updateTheme);
      return;
    }

    if (!motionIsReduced()) {
      root.classList.add("is-theme-transitioning");
      window.requestAnimationFrame(updateTheme);
      window.clearTimeout(themeTransitionTimer);
      themeTransitionTimer = window.setTimeout(() => root.classList.remove("is-theme-transitioning"), 480);
      return;
    }

    updateTheme();
  });
});

motionChoices.forEach((choice) => {
  choice.addEventListener("click", () => {
    applyMotion(choice.dataset.motionChoice, { save: true });
    updateScrollUI();
  });
});

analyticsChoices.forEach((choice) => {
  choice.addEventListener("click", () => {
    applyAnalyticsConsent(choice.dataset.analyticsChoice, { save: true });
  });
});

systemTheme.addEventListener?.("change", () => {
  if ((document.documentElement.dataset.themeMode || readSavedThemeMode()) === "system") {
    applyTheme("system");
  }
});

systemReducedMotion.addEventListener?.("change", () => {
  if ((root.dataset.motionMode || readSavedMotionMode()) === "system") {
    applyMotion("system");
    updateScrollUI();
  }
});

const legacyEventDismissalKey = "olga-event-ticket-dismissed";
let events = [];
let featuredEvent = null;
let upcomingEvent = null;
let eventTicketDismissed = false;

try {
  const parsedEvents = JSON.parse(eventData?.textContent || "[]");
  if (Array.isArray(parsedEvents)) {
    events = parsedEvents.filter((event) => {
      const startTime = Date.parse(event?.startsAt || "");
      const archiveTime = Date.parse(event?.archivesAt || "");
      return (
        typeof event?.id === "string" &&
        typeof event?.title === "string" &&
        typeof event?.url === "string" &&
        Number.isFinite(startTime) &&
        Number.isFinite(archiveTime) &&
        archiveTime > startTime
      );
    });
  }
} catch (error) {
  events = [];
}

const eventDismissalKey = (eventId) => `olga-event-ticket-dismissed:${eventId}`;

const eventDisplay = (event) => {
  const date = new Date(event.startsAt);
  const format = (options) => new Intl.DateTimeFormat("en-GB", { ...options, timeZone: event.timeZone }).format(date);
  return {
    day: format({ day: "numeric" }),
    month: format({ month: "short" }),
    date: format({ day: "numeric", month: "long", year: "numeric" }),
    machineDate: format({ year: "numeric", month: "2-digit", day: "2-digit" }).split("/").reverse().join("-"),
    time: format({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
  };
};

const setText = (selector, text, scope = document) => {
  scope.querySelectorAll(selector).forEach((element) => {
    element.textContent = text;
  });
};

const resolveEvents = () => {
  const now = Date.now();
  const sortedEvents = [...events].sort((first, second) => Date.parse(first.startsAt) - Date.parse(second.startsAt));
  upcomingEvent = sortedEvents.find((event) => now < Date.parse(event.archivesAt)) || null;
  const pastEvents = sortedEvents.filter((event) => now >= Date.parse(event.archivesAt));
  featuredEvent = upcomingEvent || pastEvents.at(-1) || sortedEvents.at(-1) || null;
};

const updateFeaturedEvent = () => {
  if (!featuredEventSection || !featuredEvent) return;

  const display = eventDisplay(featuredEvent);
  const isUpcoming = featuredEvent === upcomingEvent;
  const details = `${featuredEvent.title}, ${display.date} at ${display.time}, ${featuredEvent.venue}, ${featuredEvent.city}`;
  featuredEventSection.dataset.eventId = featuredEvent.id;
  featuredEventSection.dataset.eventState = isUpcoming ? "upcoming" : "past";
  featuredEventSection.dataset.headerInk = isUpcoming ? "dark" : "theme";
  setText("[data-featured-event-status]", isUpcoming ? "Upcoming" : "Past event", featuredEventSection);
  setText("[data-featured-event-date]", display.date, featuredEventSection);
  setText("[data-event-day]", display.day, featuredEventSection);
  setText("[data-event-month]", display.month, featuredEventSection);
  setText("[data-event-time]", display.time, featuredEventSection);
  setText("[data-event-kind]", featuredEvent.kind, featuredEventSection);
  setText("[data-event-venue]", featuredEvent.venue, featuredEventSection);
  setText("[data-event-city]", featuredEvent.city, featuredEventSection);
  setText("[data-event-title]", featuredEvent.title, featuredEventSection);

  const featuredDate = featuredEventSection.querySelector("[data-featured-event-date]");
  if (featuredDate) featuredDate.dateTime = display.machineDate;

  const featuredLink = featuredEventSection.querySelector("[data-featured-event-link]");
  if (featuredLink) {
    featuredLink.href = featuredEvent.url;
    featuredLink.setAttribute("aria-label", `Event details: ${details}`);
  }
};

const updateEventTicket = () => {
  if (!eventTicket || !upcomingEvent) {
    eventTicketDismissed = false;
    return;
  }

  const display = eventDisplay(upcomingEvent);
  const details = `${upcomingEvent.title}, ${display.date} at ${display.time}, ${upcomingEvent.venue}, ${upcomingEvent.city}`;
  eventTicket.dataset.eventId = upcomingEvent.id;
  setText("[data-event-ticket-status]", "Upcoming", eventTicket);
  setText("[data-event-day]", display.day, eventTicket);
  setText("[data-event-month]", display.month, eventTicket);
  setText("[data-event-city]", upcomingEvent.city, eventTicket);
  setText("[data-event-ticket-time]", display.time, eventTicket);
  setText("[data-event-ticket-title]", upcomingEvent.ticketTitle, eventTicket);

  const ticketDate = eventTicket.querySelector("[data-event-ticket-date]");
  if (ticketDate) ticketDate.dateTime = upcomingEvent.startsAt;

  const ticketTime = eventTicket.querySelector("[data-event-ticket-time]");
  if (ticketTime) ticketTime.dateTime = display.time;

  const ticketLink = eventTicket.querySelector("[data-event-ticket-link]");
  if (ticketLink) {
    ticketLink.href = upcomingEvent.url;
    ticketLink.setAttribute("aria-label", details);
  }

  try {
    eventTicketDismissed = sessionStorage.getItem(eventDismissalKey(upcomingEvent.id)) === "true";
  } catch (error) {
    eventTicketDismissed = false;
  }
};

const scheduleEventStateUpdate = () => {
  window.clearTimeout(eventStateTimer);
  if (!upcomingEvent) return;

  const remainingTime = Date.parse(upcomingEvent.archivesAt) - Date.now();
  if (remainingTime <= 0) return;
  eventStateTimer = window.setTimeout(refreshEventState, Math.min(remainingTime + 50, 2_147_483_647));
};

const refreshEventState = () => {
  const previousUpcomingId = upcomingEvent?.id;
  resolveEvents();
  updateFeaturedEvent();
  updateEventTicket();

  if (previousUpcomingId && previousUpcomingId !== upcomingEvent?.id) {
    hideEventTicket({ immediate: true });
  }

  root.classList.toggle("has-active-event", Boolean(upcomingEvent && !eventTicketDismissed));
  scheduleEventStateUpdate();
  updateEventTicketVisibility();
};

resolveEvents();
updateFeaturedEvent();
updateEventTicket();
root.classList.toggle("has-active-event", Boolean(upcomingEvent && !eventTicketDismissed));
scheduleEventStateUpdate();

const hideEventTicket = ({ immediate = false } = {}) => {
  if (!eventTicket || eventTicket.hidden) return;

  window.clearTimeout(eventTicketHideTimer);
  eventTicket.classList.remove("is-visible");

  const finishHide = () => {
    eventTicket.hidden = true;
    eventTicket.classList.remove("event-ticket--intro");
  };

  if (immediate || motionIsReduced()) {
    finishHide();
    return;
  }

  eventTicketHideTimer = window.setTimeout(finishHide, 280);
};

const showEventTicket = () => {
  if (!eventTicket || !upcomingEvent || eventTicketDismissed) return;

  window.clearTimeout(eventTicketHideTimer);
  eventTicket.classList.add("event-ticket--intro");

  if (!eventTicket.hidden && eventTicket.classList.contains("is-visible")) return;

  eventTicket.hidden = false;

  if (motionIsReduced()) {
    eventTicket.classList.add("is-visible");
    return;
  }

  window.requestAnimationFrame(() => eventTicket.classList.add("is-visible"));
};

const updateEventTicketVisibility = () => {
  if (!eventTicket || !heroSection || !featuredEventSection) return;

  if (!upcomingEvent || eventTicketDismissed) {
    root.classList.remove("has-active-event");
    hideEventTicket({ immediate: true });
    return;
  }

  const heroBounds = heroSection.getBoundingClientRect();
  const featuredEventBounds = featuredEventSection.getBoundingClientRect();
  const headerClearance = (header?.getBoundingClientRect().height || 0) + 8;
  const introIsVisible =
    heroBounds.bottom > headerClearance && featuredEventBounds.top > window.innerHeight * 0.9;

  if (introIsVisible) {
    showEventTicket();
  } else {
    hideEventTicket();
  }
};

eventTicketDismiss?.addEventListener("click", () => {
  eventTicketDismissed = true;
  root.classList.remove("has-active-event");

  try {
    if (upcomingEvent) sessionStorage.setItem(eventDismissalKey(upcomingEvent.id), "true");
    sessionStorage.removeItem(legacyEventDismissalKey);
  } catch (error) {
    // Dismissal still applies for the current page when storage is unavailable.
  }

  hideEventTicket({ immediate: motionIsReduced() });
});

const updateScrollUI = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
  const headerHeight = header?.getBoundingClientRect().height || 0;
  const heroBounds = heroSection?.getBoundingClientRect();
  const heroIsUnderHeader = heroSection
    ? heroBounds.bottom > headerHeight
    : window.scrollY <= 24;

  header?.classList.toggle("is-scrolled", !heroIsUnderHeader);
  updateHeaderInk();

  if (progressBar) {
    progressBar.style.transform = `scaleX(${progress})`;
  }

  const indexMarker = headerHeight + Math.min(window.innerHeight * 0.22, 160);
  const currentIndexEntry = indexEntries.find(({ section }) => {
    const bounds = section.getBoundingClientRect();
    return bounds.top <= indexMarker && bounds.bottom > indexMarker;
  });

  indexEntries.forEach(({ link }) => {
    if (link === currentIndexEntry?.link) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  updateEventTicketVisibility();
};

let scrollFrame = 0;
window.addEventListener(
  "scroll",
  () => {
    if (scrollFrame) return;

    scrollFrame = window.requestAnimationFrame(() => {
      updateScrollUI();
      scrollFrame = 0;
    });
  },
  { passive: true },
);

updateScrollUI();
window.addEventListener("resize", updateScrollUI, { passive: true });

if (cursorTrail) {
  const trailContext = cursorTrail.getContext("2d", { alpha: true });
  const trailLifetime = 620;
  const trailPoints = [];
  let trailFrame = 0;
  let trailPixelRatio = 1;
  let trailTarget = null;
  let trailHead = null;
  let trailIsOverInteractive = false;

  const colourWithAlpha = (colour, alpha) => {
    const match = colour.trim().match(/^#([0-9a-f]{6})$/i);
    if (!match) return colour;

    const value = Number.parseInt(match[1], 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  };

  const readTrailPalette = () => {
    const styles = window.getComputedStyle(root);
    return {
      violet: styles.getPropertyValue("--aurora-violet").trim(),
      blue: styles.getPropertyValue("--aurora-blue").trim(),
      green: styles.getPropertyValue("--aurora-green").trim(),
    };
  };

  const resizeTrail = () => {
    trailPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    cursorTrail.width = Math.round(window.innerWidth * trailPixelRatio);
    cursorTrail.height = Math.round(window.innerHeight * trailPixelRatio);
    trailContext.setTransform(trailPixelRatio, 0, 0, trailPixelRatio, 0, 0);
    trailPoints.length = 0;
    trailTarget = null;
    trailHead = null;
  };

  const drawTrail = (now) => {
    trailFrame = 0;
    trailContext.clearRect(0, 0, window.innerWidth, window.innerHeight);

    if (motionIsReduced() || !finePointer.matches) {
      trailPoints.length = 0;
      trailTarget = null;
      trailHead = null;
      return;
    }

    if (trailTarget && trailHead) {
      const deltaX = trailTarget.x - trailHead.x;
      const deltaY = trailTarget.y - trailHead.y;
      const distanceToTarget = Math.hypot(deltaX, deltaY);

      if (distanceToTarget > 0.35) {
        trailHead.x += deltaX * 0.16;
        trailHead.y += deltaY * 0.16;
        trailPoints.push({ x: trailHead.x, y: trailHead.y, time: now });
        if (trailPoints.length > 38) trailPoints.shift();
      }
    }

    while (trailPoints.length && now - trailPoints[0].time > trailLifetime) trailPoints.shift();

    if (trailPoints.length > 1) {
      const firstPoint = trailPoints[0];
      const lastPoint = trailPoints[trailPoints.length - 1];
      const idleFade = Math.max(0, 1 - (now - lastPoint.time) / trailLifetime);
      const palette = readTrailPalette();
      const gradient = trailContext.createLinearGradient(firstPoint.x, firstPoint.y, lastPoint.x, lastPoint.y);

      gradient.addColorStop(0, colourWithAlpha(palette.violet, 0));
      gradient.addColorStop(0.48, colourWithAlpha(palette.blue, 0.76));
      gradient.addColorStop(1, colourWithAlpha(palette.green, 0.94));

      trailContext.beginPath();
      trailContext.moveTo(firstPoint.x, firstPoint.y);

      for (let index = 1; index < trailPoints.length - 1; index += 1) {
        const point = trailPoints[index];
        const nextPoint = trailPoints[index + 1];
        trailContext.quadraticCurveTo(point.x, point.y, (point.x + nextPoint.x) / 2, (point.y + nextPoint.y) / 2);
      }

      trailContext.lineTo(lastPoint.x, lastPoint.y);
      trailContext.globalAlpha = 0.5 * idleFade;
      trailContext.lineCap = "round";
      trailContext.lineJoin = "round";
      trailContext.lineWidth = 2.1;
      trailContext.strokeStyle = gradient;
      trailContext.shadowBlur = 7;
      trailContext.shadowColor = colourWithAlpha(palette.blue, 0.24);
      trailContext.stroke();
      trailContext.globalAlpha = 1;
      trailContext.shadowBlur = 0;
    }

    const headIsMoving =
      trailTarget && trailHead && Math.hypot(trailTarget.x - trailHead.x, trailTarget.y - trailHead.y) > 0.35;
    if (trailPoints.length > 1 || headIsMoving) trailFrame = window.requestAnimationFrame(drawTrail);
  };

  window.addEventListener(
    "pointermove",
    (event) => {
      if (motionIsReduced() || !finePointer.matches || (event.pointerType && event.pointerType !== "mouse")) return;

      const isOverInteractive =
        event.target instanceof Element && Boolean(event.target.closest(interactivePointerSelector));

      if (isOverInteractive !== trailIsOverInteractive) {
        trailIsOverInteractive = isOverInteractive;
        cursorTrail.classList.toggle("is-over-interactive", isOverInteractive);

        if (isOverInteractive) {
          if (trailFrame) window.cancelAnimationFrame(trailFrame);
          trailFrame = 0;
          trailTarget = null;
          trailHead = null;
          trailPoints.length = 0;
          trailContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
        }
      }

      if (isOverInteractive) return;

      const now = performance.now();
      trailTarget = { x: event.clientX, y: event.clientY, time: now };

      if (!trailHead) {
        trailHead = { x: event.clientX, y: event.clientY };
        trailPoints.push({ x: event.clientX, y: event.clientY, time: now });
      }

      if (!trailFrame) trailFrame = window.requestAnimationFrame(drawTrail);
    },
    { passive: true },
  );

  window.addEventListener("resize", resizeTrail, { passive: true });
  resizeTrail();
}

const resetMenuClose = () => {
  window.clearTimeout(menuCloseTimer);
  menuCloseTimer = 0;
  menu?.removeEventListener("animationend", handleMenuExit);
  menu?.classList.remove("is-closing");
};

const openMenu = () => {
  if (!menu || typeof menu.showModal !== "function") return;

  resetMenuClose();
  if (menuBody) menuBody.scrollTop = 0;
  menu.showModal();
  menuClose?.getBoundingClientRect(); // Prime the resting icon.
  moveCursorTrail(menu);
  root.classList.add("menu-open");
  document.body.classList.add("menu-open");
  menuButton?.setAttribute("aria-expanded", "true");
};

const finishMenuClose = () => {
  resetMenuClose();
  if (menu?.open) menu.close();
};

const handleMenuExit = (event) => {
  if (event.target !== menu || event.animationName !== "index-out") return;
  finishMenuClose();
};

const closeMenu = () => {
  if (!menu?.open || menu.classList.contains("is-closing")) return;

  if (motionIsReduced()) {
    finishMenuClose();
    return;
  }

  menu.classList.add("is-closing");
  menu.addEventListener("animationend", handleMenuExit);
  menuCloseTimer = window.setTimeout(finishMenuClose, 380);
};

menuButton?.addEventListener("click", openMenu);
menuClose?.addEventListener("click", closeMenu);

menu?.addEventListener("click", (event) => {
  if (event.target === menu) closeMenu();
});

menu?.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeMenu();
});

menu?.addEventListener("close", () => {
  resetMenuClose();
  root.classList.remove("menu-open");
  document.body.classList.remove("menu-open");
  moveCursorTrail(document.body);
  menuButton?.setAttribute("aria-expanded", "false");
  menuButton?.focus();
});

menu?.querySelectorAll("a[href^='#']").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

const finishCreditsClose = () => {
  window.clearTimeout(creditsCloseTimer);
  creditsCloseTimer = 0;
  credits?.classList.remove("is-closing");

  if (credits) credits.open = false;
};

creditsSummary?.addEventListener("click", (event) => {
  window.clearTimeout(creditsCloseTimer);
  if (!credits?.open || motionIsReduced()) {
    credits?.classList.remove("is-closing");
    return;
  }

  event.preventDefault();
  if (credits.classList.toggle("is-closing")) {
    creditsCloseTimer = window.setTimeout(finishCreditsClose, 240);
  }
});

const revealItems = document.querySelectorAll("[data-reveal]");

// Content may already be on screen while the script downloads. Never hide it again.
revealItems.forEach((item) => {
  if (item.getBoundingClientRect().top < window.innerHeight) item.classList.add("is-visible");
});

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -7%", threshold: 0.08 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const archiveStacks = Array.from(document.querySelectorAll("[data-archive-stack]"));

archiveStacks.forEach((archiveStack) => {
  const archiveFigure = archiveStack.closest("figure");
  const archiveCards = Array.from(archiveStack.querySelectorAll("[data-archive-card]"));
  const archiveCounter = archiveFigure?.querySelector("[data-archive-counter]");
  const archiveStatus = archiveFigure?.querySelector("[data-archive-status]");
  const archiveNext = archiveFigure?.querySelector("[data-archive-next]");
  const archiveItemName = archiveStack.dataset.archiveItemName || "image";
  const archiveItemNameSentence = archiveItemName.replace(/^./, (character) => character.toUpperCase());
  const archiveRegister = archiveFigure?.querySelector("[data-archive-register]");
  const archiveRegisterKind = archiveRegister?.querySelector("[data-archive-register-kind]");
  const archiveRegisterYear = archiveRegister?.querySelector("[data-archive-register-year]");

  if (archiveCards.length <= 1) return;

  let activeArchiveIndex = 0;
  let archiveIsAnimating = false;
  let archiveAnimationTimer = 0;
  let activePointerId = null;
  let draggedCard = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartTime = 0;
  let dragX = 0;
  let dragAxis = null;
  let suppressCardClick = false;

  const formatArchivePosition = (index) => String(index + 1).padStart(2, "0");

  const clearArchiveDrag = (card) => {
    card.classList.remove("is-dragging", "is-leaving");
    card.style.removeProperty("--archive-drag-x");
    card.style.removeProperty("--archive-drag-y");
    card.style.removeProperty("--archive-drag-rotate");
  };

  const renderArchiveStack = ({ focus = false, announce = false, departingCard = null } = {}) => {
    const activeCard = archiveCards[activeArchiveIndex];
    const activeLabel = activeCard.dataset.archiveLabel || "Archive photograph";

    activeCard.dataset.stackDepth = "0";
    activeCard.removeAttribute("aria-hidden");
    activeCard.tabIndex = 0;
    activeCard.setAttribute(
      "aria-label",
      `${archiveItemNameSentence} ${activeArchiveIndex + 1} of ${archiveCards.length}: ${activeLabel}. Activate for the next ${archiveItemName}, or swipe, drag, or press either arrow key.`,
    );

    if (focus) activeCard.focus({ preventScroll: true });

    archiveCards.forEach((card, index) => {
      card.setAttribute("role", "button");
      if (card !== departingCard) clearArchiveDrag(card);
      const depth = (index - activeArchiveIndex + archiveCards.length) % archiveCards.length;
      card.dataset.stackDepth = String(depth);

      if (depth !== 0) {
        card.setAttribute("aria-hidden", "true");
        card.removeAttribute("aria-label");
        card.tabIndex = -1;
      }
    });

    if (archiveCounter) {
      archiveCounter.textContent = `${formatArchivePosition(activeArchiveIndex)} / ${formatArchivePosition(archiveCards.length - 1)}`;
    }

    if (archiveRegister) {
      archiveRegister.style.setProperty("--archive-register-position", String(activeArchiveIndex));
      if (archiveRegisterKind) archiveRegisterKind.textContent = activeCard.dataset.archiveKind || "Archive record";
      if (archiveRegisterYear) archiveRegisterYear.textContent = activeCard.dataset.archiveYear || "Undated";
    }

    if (announce && archiveStatus) {
      archiveStatus.textContent = `Showing ${archiveItemName} ${activeArchiveIndex + 1} of ${archiveCards.length}: ${activeLabel}.`;
    }
  };

  const cycleArchiveStack = (exitDirection = -1, { focus = false } = {}) => {
    if (archiveIsAnimating) return;

    const departingCard = archiveCards[activeArchiveIndex];
    const nextIndex = (activeArchiveIndex + 1) % archiveCards.length;
    const shouldRestoreFocus = focus || document.activeElement === departingCard;

    if (motionIsReduced()) {
      activeArchiveIndex = nextIndex;
      renderArchiveStack({ focus: shouldRestoreFocus, announce: true });
      return;
    }

    archiveIsAnimating = true;
    const cardWidth = departingCard.getBoundingClientRect().width;
    const exitStartX = exitDirection < 0 ? Math.min(dragX, 0) : Math.max(dragX, 0);
    const isCompactArchive = window.matchMedia("(max-width: 700px)").matches;
    const exitDistance = isCompactArchive
      ? Math.max(cardWidth + 32, Math.abs(exitStartX) + 96)
      : Math.max(Math.abs(exitStartX) + 72, Math.min(cardWidth * 0.62, 220));

    departingCard.classList.remove("is-dragging");
    departingCard.style.setProperty("--archive-drag-x", `${exitStartX}px`);
    departingCard.style.setProperty("--archive-drag-y", "0px");
    departingCard.style.setProperty("--archive-drag-rotate", `${(exitStartX / Math.max(cardWidth, 1)) * 2.4}deg`);
    departingCard.getBoundingClientRect();

    departingCard.classList.add("is-leaving");
    activeArchiveIndex = nextIndex;
    renderArchiveStack({ announce: true, departingCard });
    departingCard.style.setProperty("--archive-drag-x", `${exitDirection * exitDistance}px`);
    departingCard.style.setProperty("--archive-drag-y", "16px");
    departingCard.style.setProperty("--archive-drag-rotate", `${exitDirection * 2.4}deg`);

    const finishCycle = () => {
      if (!archiveIsAnimating) return;
      window.clearTimeout(archiveAnimationTimer);
      departingCard.removeEventListener("transitionend", handleArchiveExit);
      departingCard.classList.add("is-recycling");
      clearArchiveDrag(departingCard);
      departingCard.getBoundingClientRect();
      departingCard.classList.remove("is-recycling");
      archiveIsAnimating = false;
      if (shouldRestoreFocus) archiveCards[activeArchiveIndex].focus({ preventScroll: true });
    };

    const handleArchiveExit = (event) => {
      if (event.target !== departingCard || event.propertyName !== "transform") return;
      finishCycle();
    };

    departingCard.addEventListener("transitionend", handleArchiveExit);
    archiveAnimationTimer = window.setTimeout(finishCycle, 360);
  };

  const finishArchiveDrag = (event, { cancelled = false } = {}) => {
    if (activePointerId === null || event.pointerId !== activePointerId || !draggedCard) return;

    const card = draggedCard;
    const threshold = Math.min(92, Math.max(48, card.getBoundingClientRect().width * 0.13));
    const dragDuration = Math.max(performance.now() - dragStartTime, 1);
    const isIntentionalFlick = Math.abs(dragX) >= 24 && Math.abs(dragX) / dragDuration >= 0.32;

    if (card.hasPointerCapture?.(activePointerId)) card.releasePointerCapture(activePointerId);

    activePointerId = null;
    draggedCard = null;
    card.classList.remove("is-dragging");

    if (!cancelled && dragAxis === "horizontal" && (Math.abs(dragX) >= threshold || isIntentionalFlick)) {
      cycleArchiveStack(dragX < 0 ? -1 : 1);
    } else {
      renderArchiveStack();
    }

    dragX = 0;
    dragAxis = null;
  };

  archiveNext?.addEventListener("click", () => cycleArchiveStack());

  archiveCards.forEach((card) => {
    card.addEventListener("click", () => {
      if (!suppressCardClick && card.dataset.stackDepth === "0") cycleArchiveStack();
      suppressCardClick = false;
    });
    card.addEventListener("keydown", (event) => {
      if (card.dataset.stackDepth !== "0" || archiveIsAnimating) return;

      if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        cycleArchiveStack(-1, { focus: true });
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        cycleArchiveStack(1, { focus: true });
      }
    });

    card.addEventListener("pointerdown", (event) => {
      if (card.dataset.stackDepth !== "0" || archiveIsAnimating || (event.pointerType === "mouse" && event.button !== 0)) {
        return;
      }

      activePointerId = event.pointerId;
      suppressCardClick = false;
      draggedCard = card;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragStartTime = performance.now();
      dragX = 0;
      dragAxis = null;
      card.setPointerCapture?.(activePointerId);
    });

    card.addEventListener("pointermove", (event) => {
      if (event.pointerId !== activePointerId || draggedCard !== card) return;

      const deltaX = event.clientX - dragStartX;
      const deltaY = event.clientY - dragStartY;

      if (!dragAxis && Math.max(Math.abs(deltaX), Math.abs(deltaY)) > 7) {
        suppressCardClick = true;
        dragAxis = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
      }

      if (dragAxis === "vertical") {
        finishArchiveDrag(event, { cancelled: true });
        return;
      }

      if (dragAxis !== "horizontal") return;

      if (event.cancelable) event.preventDefault();
      card.classList.add("is-dragging");
      dragX = deltaX;
      const cardWidth = Math.max(card.getBoundingClientRect().width, 1);
      card.style.setProperty("--archive-drag-x", `${deltaX}px`);
      card.style.setProperty("--archive-drag-y", `${deltaY * 0.14}px`);
      card.style.setProperty("--archive-drag-rotate", `${(deltaX / cardWidth) * 4}deg`);
    });

    card.addEventListener("pointerup", (event) => finishArchiveDrag(event));
    card.addEventListener("pointercancel", (event) => finishArchiveDrag(event, { cancelled: true }));
  });

  renderArchiveStack();
});

// Opt into enhanced controls and reveals only after their handlers are installed.
root.classList.replace("no-js", "js");
