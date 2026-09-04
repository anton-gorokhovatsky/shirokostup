import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const eventId = "kin-conversation-2026-08-13";
const eventDismissalKey = `olga-event-ticket-dismissed:${eventId}`;
const analyticsConsentKey = "olga-analytics-consent";
const upcomingTime = new Date("2026-08-13T12:00:00+02:00");
const shortlyBeforeArchiveTime = new Date("2026-08-13T23:59:55+02:00");

const openFreshPage = async (page, hash = "top", { analyticsConsent = "denied" } = {}) => {
  await page.goto(`/?qa=browser-regression#${hash}`);
  await page.evaluate(
    ({ eventKey, consentKey, consent }) => {
      sessionStorage.removeItem(eventKey);
      if (consent === null) {
        localStorage.removeItem(consentKey);
      } else {
        localStorage.setItem(consentKey, consent);
      }
    },
    { eventKey: eventDismissalKey, consentKey: analyticsConsentKey, consent: analyticsConsent },
  );
  await page.reload();
};

const openNotFoundPage = async (page) => {
  await page.addInitScript((consentKey) => localStorage.setItem(consentKey, "denied"), analyticsConsentKey);
  await page.goto("/404.html?qa=not-found-regression");
};

const installUpcomingClock = async (page, time = upcomingTime) => {
  await page.clock.install({ time });
};

const rectanglesOverlap = (first, second) =>
  first.left < second.right &&
  first.right > second.left &&
  first.top < second.bottom &&
  first.bottom > second.top;

test("hero reserves space for the active event ticket", async ({ page }) => {
  await installUpcomingClock(page);
  await openFreshPage(page);

  const statement = page.locator(".hero__statement");
  const ticket = page.locator("[data-event-ticket]");
  await expect(statement).toBeVisible();
  await expect(ticket).toBeVisible();

  const [statementBox, ticketBox] = await Promise.all([statement.boundingBox(), ticket.boundingBox()]);
  expect(statementBox).not.toBeNull();
  expect(ticketBox).not.toBeNull();
  expect(rectanglesOverlap(statementBox, ticketBox)).toBe(false);

  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});

test("event lifecycle moves from invitation to a lasting past record", async ({ page }) => {
  await installUpcomingClock(page, shortlyBeforeArchiveTime);
  await openFreshPage(page);

  const ticket = page.locator("[data-event-ticket]");
  const featuredEvent = page.locator("[data-featured-event]");
  await expect(ticket).toBeVisible();
  await expect(featuredEvent).toHaveAttribute("data-event-state", "upcoming");
  await expect(featuredEvent.locator("[data-featured-event-status]")).toHaveText("Upcoming");

  await page.clock.runFor(5_100);
  await expect(ticket).toBeHidden();
  await expect(page.locator("html")).not.toHaveClass(/has-active-event/);
  await expect(featuredEvent).toHaveAttribute("data-event-state", "past");
  await expect(featuredEvent.locator("[data-featured-event-status]")).toHaveText("Past event");
  await expect(featuredEvent.locator("[data-featured-event-date]")).toHaveText("13 August 2026");
  await expect(featuredEvent.getByText("Event details", { exact: true })).toBeVisible();
});

test("event ticket dismissal is scoped to the current event", async ({ page }) => {
  await installUpcomingClock(page);
  await openFreshPage(page);

  const ticket = page.locator("[data-event-ticket]");
  await expect(ticket).toBeVisible();
  await page.getByRole("button", { name: "Hide event invitation" }).click();
  await expect(ticket).toBeHidden();
  await expect
    .poll(() => page.evaluate((key) => sessionStorage.getItem(key), eventDismissalKey))
    .toBe("true");
});

test("index keeps predictable focus, theme, and motion controls", async ({ page }, testInfo) => {
  await installUpcomingClock(page);
  await openFreshPage(page);

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  if (testInfo.project.name === "mobile-webkit") {
    await skipLink.focus();
  } else {
    await page.keyboard.press("Tab");
  }
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();

  const indexButton = page.getByRole("button", { name: "Index" });
  await indexButton.click();

  const dialog = page.getByRole("dialog", { name: "Index" });
  await expect(dialog).toBeVisible();

  const themeGroup = dialog.getByRole("group", { name: "Colour theme" });
  for (const [name, mode] of [
    ["Light", "light"],
    ["Dark", "dark"],
    ["System", "system"],
  ]) {
    const choice = themeGroup.getByRole("button", { name });
    await choice.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme-mode", mode);
    await expect(choice).toHaveAttribute("aria-pressed", "true");
  }

  const reducedMotion = dialog.getByRole("button", { name: "Reduced" });
  await reducedMotion.click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await expect(reducedMotion).toHaveAttribute("aria-pressed", "true");

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(indexButton).toBeFocused();
});

test("index strokes morph with the dialog state, not hover", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openFreshPage(page);

  const opener = page.getByRole("button", { name: "Index", exact: true });
  const dialog = page.getByRole("dialog", { name: "Index" });
  const closeButton = page.getByRole("button", { name: "Close index", exact: true });
  const firstStroke = closeButton.locator(".index-button__glyph i").first();
  const angle = () => firstStroke.evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
    return Math.round(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI);
  });

  const openingMorph = await opener.evaluate((element) => {
    element.click();
    return document.querySelector(".index-close .index-button__glyph i")
      .getAnimations().some((animation) => animation.transitionProperty === "transform");
  });
  expect(openingMorph).toBe(true);
  await expect.poll(angle).toBe(45);
  await closeButton.hover();
  await expect.poll(angle).toBe(45);
  await expect(closeButton.locator(".index-button__glyph")).toHaveAttribute("aria-hidden", "true");

  const closingMorph = await closeButton.evaluate((element) => {
    element.click();
    return element.querySelector(".index-button__glyph i")
      .getAnimations().some((animation) => animation.transitionProperty === "transform");
  });
  expect(closingMorph).toBe(true);
  await expect(dialog).not.toBeVisible();
  await expect(opener).toHaveAttribute("aria-expanded", "false");
  await expect(opener).toBeFocused();

  await opener.click();
  await expect.poll(angle).toBe(45);
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});

test("credits strokes follow disclosure state and rapid reversal", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openFreshPage(page, "contact");
  const disclosure = page.locator(".credits");
  const summary = disclosure.locator("summary");
  const glyph = summary.locator(".credits__glyph");
  const verticalScale = () => glyph.evaluate((element) => {
    const matrix = new DOMMatrixReadOnly(getComputedStyle(element, "::after").transform);
    return Math.round(Math.hypot(matrix.a, matrix.b) * 100) / 100;
  });

  await summary.scrollIntoViewIfNeeded();
  await expect(glyph).toHaveAttribute("aria-hidden", "true");
  await expect.poll(verticalScale).toBe(1);
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(disclosure).toHaveAttribute("open", "");
  await expect.poll(verticalScale).toBe(0);

  await summary.evaluate((element) => {
    element.click();
    element.click();
  });
  await expect(disclosure).not.toHaveClass(/is-closing/);
  await page.waitForTimeout(300); // Longer than the cancelled close timer.
  await expect(disclosure).toHaveAttribute("open", "");
  await expect.poll(verticalScale).toBe(0);

  await summary.click();
  await expect(disclosure).not.toHaveAttribute("open", "");
  await expect.poll(verticalScale).toBe(1);
  await expect(summary).toBeFocused();
});

test("control morphs keep immediate, legible reduced-motion states", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFreshPage(page);
  await page.getByRole("button", { name: "Index", exact: true }).click();

  const closeButton = page.getByRole("button", { name: "Close index", exact: true });
  const stroke = closeButton.locator(".index-button__glyph i").first();
  const readState = () => stroke.evaluate((element) => {
    const style = getComputedStyle(element);
    const matrix = new DOMMatrixReadOnly(style.transform);
    return { duration: parseFloat(style.transitionDuration), angle: Math.round(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI) };
  });
  // WebKit may report the pre-paint transform even for the 0.01ms reduced transition.
  await expect.poll(async () => (await readState()).angle).toBe(45);
  expect((await readState()).duration).toBeLessThan(0.001);
  await closeButton.click();
  await expect(page.locator("#site-index")).not.toBeVisible();

  const disclosure = page.locator(".credits");
  const summary = disclosure.locator("summary");
  await summary.click();
  await expect(disclosure).toHaveAttribute("open", "");
  expect(await summary.locator(".credits__glyph").evaluate((element) =>
    parseFloat(getComputedStyle(element, "::after").transitionDuration))).toBeLessThan(0.001);
  await summary.click();
  await expect(disclosure).not.toHaveAttribute("open", "");
  await expect(disclosure).not.toHaveClass(/is-closing/);
});

test("control strokes remain visible in forced colours", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await openFreshPage(page);
  await page.getByRole("button", { name: "Index", exact: true }).click();
  const line = page.locator(".index-close .index-button__glyph i").first();
  await expect(line).toHaveCSS("border-top-width", "1px");
  await expect(line).toHaveCSS("border-top-style", "solid");
  await expect(line).toHaveCSS("border-top-color", await line.evaluate((element) => getComputedStyle(element).color));
  await page.keyboard.press("Escape");

  const glyph = page.locator(".credits__glyph");
  const border = await glyph.evaluate((element) => {
    const style = getComputedStyle(element, "::before");
    return { width: style.borderTopWidth, style: style.borderTopStyle, colour: style.borderTopColor, ink: style.color };
  });
  expect(border.width).toBe("1px");
  expect(border.style).toBe("solid");
  expect(border.colour).toBe(border.ink);
});

test("analytics waits for consent and can be withdrawn", async ({ page }, testInfo) => {
  const metricaRequests = [];
  const isMobileProject = testInfo.project.name.startsWith("mobile-");
  await page.setViewportSize(isMobileProject ? { width: 320, height: 844 } : { width: 640, height: 360 });
  await page.route("https://mc.yandex.ru/**", async (route) => {
    metricaRequests.push(route.request().url());
    if (route.request().url().includes("/metrika/tag.js")) {
      await route.fulfill({ status: 200, contentType: "application/javascript", body: "/* metrica test stub */" });
      return;
    }
    await route.abort();
  });

  await openFreshPage(page, "top", { analyticsConsent: null });

  const consentPanel = page.locator(".analytics-consent[data-analytics-consent]");
  const allowAnalytics = consentPanel.getByRole("button", { name: "Allow analytics" });
  const declineAnalytics = consentPanel.getByRole("button", { name: "Decline" });
  await expect(consentPanel).toBeVisible();
  await expect(page.locator('script[src*="mc.yandex.ru/metrika/tag.js"]')).toHaveCount(0);
  expect(metricaRequests).toEqual([]);
  expect(await page.evaluate(() => window.disableYaCounter111895186)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  await allowAnalytics.focus();
  await expect(allowAnalytics).toBeFocused();
  if (testInfo.project.name === "mobile-webkit") {
    await declineAnalytics.focus();
  } else {
    await page.keyboard.press("Tab");
  }
  await expect(declineAnalytics).toBeFocused();
  await declineAnalytics.click();
  await expect(consentPanel).toBeHidden();
  expect(await page.evaluate((key) => localStorage.getItem(key), analyticsConsentKey)).toBe("denied");
  expect(metricaRequests).toEqual([]);

  await page.getByRole("button", { name: "Index" }).click();
  const analyticsGroup = page.getByRole("dialog", { name: "Index" }).getByRole("group", {
    name: "Analytics preference",
  });
  await expect(analyticsGroup.getByRole("button", { name: "Decline" })).toHaveAttribute("aria-pressed", "true");

  await analyticsGroup.getByRole("button", { name: "Allow" }).click();
  await expect(page.locator('script[src*="mc.yandex.ru/metrika/tag.js"]')).toHaveCount(1);
  await expect.poll(() => metricaRequests.filter((url) => url.includes("/metrika/tag.js")).length).toBe(1);
  expect(await page.evaluate(() => window.disableYaCounter111895186)).toBe(false);
  const initCall = await page.evaluate(() =>
    window.ym?.a?.find(([id, method]) => id === 111895186 && method === "init"),
  );
  expect(initCall?.[2]).toMatchObject({
    ssr: true,
    webvisor: true,
    clickmap: true,
    accurateTrackBounce: true,
    trackLinks: true,
  });

  await analyticsGroup.getByRole("button", { name: "Decline" }).click();
  await expect(analyticsGroup.getByRole("button", { name: "Decline" })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => window.disableYaCounter111895186)).toBe(true);
  expect(await page.evaluate((key) => localStorage.getItem(key), analyticsConsentKey)).toBe("denied");

  await page.reload();
  await expect(consentPanel).toBeHidden();
  await expect(page.locator('script[src*="mc.yandex.ru/metrika/tag.js"]')).toHaveCount(0);
});

test("content reflows at 320 px and equivalent 200% desktop zoom", async ({ page }, testInfo) => {
  await installUpcomingClock(page);
  const isMobileProject = testInfo.project.name.startsWith("mobile-");
  const viewport = isMobileProject ? { width: 320, height: 844 } : { width: 640, height: 360 };
  await page.setViewportSize(viewport);
  await openFreshPage(page);

  await expect(page.locator(".hero__statement")).toBeVisible();
  const horizontalScroll = await page.evaluate(() => {
    window.scrollTo({ left: 100, top: window.scrollY, behavior: "instant" });
    const position = window.scrollX;
    window.scrollTo({ left: 0, top: window.scrollY, behavior: "instant" });
    return position;
  });
  expect(horizontalScroll).toBe(0);

  const indexButtonBox = await page.getByRole("button", { name: "Index" }).boundingBox();
  expect(indexButtonBox).not.toBeNull();
  expect(indexButtonBox.x).toBeGreaterThanOrEqual(0);
  expect(indexButtonBox.x + indexButtonBox.width).toBeLessThanOrEqual(viewport.width);
});

test("custom 404 reflows, preserves preferences, and offers a clear return", async ({ page }, testInfo) => {
  const isMobileProject = testInfo.project.name.startsWith("mobile-");
  const viewport = isMobileProject ? { width: 320, height: 844 } : { width: 640, height: 360 };
  await page.setViewportSize(viewport);
  await openNotFoundPage(page);

  await expect(page).toHaveTitle("Page not found — Olga Shirokostup");
  await expect(page.getByRole("heading", { level: 1, name: "This page is not in the archive." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to the portfolio" })).toHaveAttribute("href", "/");
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toBe("noindex, follow");

  const routeReveal = page.locator(".not-found-route__reveal");
  await page.locator(".not-found__visual").scrollIntoViewIfNeeded();
  await expect(routeReveal.first()).toHaveCSS("animation-name", "route-reveal-draw");
  await expect(routeReveal.first()).toHaveCSS("stroke-dashoffset", "0px", { timeout: 4_000 });
  await expect(routeReveal.last()).toHaveCSS("stroke-dashoffset", "0px", { timeout: 4_000 });

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  if (testInfo.project.name === "mobile-webkit") {
    await skipLink.focus();
  } else {
    await page.keyboard.press("Tab");
  }
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main")).toBeFocused();

  const colourTheme = page.getByRole("group", { name: "Colour theme" });
  await colourTheme.getByRole("button", { name: "Dark" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(colourTheme.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Reduced" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
  await expect(routeReveal.first()).toHaveCSS("stroke-dasharray", "none");
  await expect(routeReveal.first()).toHaveCSS("stroke-dashoffset", "0px");

  const routeLayer = await page.locator(".not-found__visual").evaluate((visual) => getComputedStyle(visual).pointerEvents);
  expect(routeLayer).toBe("none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const seriousViolations = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
  expect(seriousViolations).toEqual([]);
});

test("archive stacks share depth, symmetric cycling, and focus behaviour", async ({ page }) => {
  await openFreshPage(page, "work");

  const stacks = page.locator("[data-archive-stack]");
  await expect(stacks).toHaveCount(2);

  for (const stack of await stacks.all()) {
    const visibleDepths = await stack.locator("[data-archive-card]").evaluateAll((cards) =>
      cards
        .filter((card) => {
          const styles = getComputedStyle(card);
          return styles.visibility !== "hidden" && Number.parseFloat(styles.opacity) > 0;
        })
        .map((card) => card.dataset.stackDepth),
    );
    expect(visibleDepths).toEqual(["0", "1", "2"]);
  }

  const womenFigure = page.locator(".project__visual--women-stack");
  const womenStack = womenFigure.locator("[data-archive-stack]");
  const routeLayer = await womenStack.locator(".women-route").evaluate((route) => ({
    pointerEvents: getComputedStyle(route).pointerEvents,
    zIndex: Number.parseInt(getComputedStyle(route).zIndex, 10),
  }));
  const activeLayer = await womenStack.locator('[data-stack-depth="0"]').evaluate((card) =>
    Number.parseInt(getComputedStyle(card).zIndex, 10),
  );
  expect(routeLayer.pointerEvents).toBe("none");
  expect(routeLayer.zIndex).toBeGreaterThan(activeLayer);

  const counter = womenFigure.locator("[data-archive-counter]");
  const initialCounter = await counter.textContent();
  const activeCard = womenStack.locator('[data-stack-depth="0"]');
  await activeCard.focus();
  await activeCard.press("ArrowRight");
  await expect(counter).not.toHaveText(initialCounter);
  await expect(womenStack.locator('[data-stack-depth="0"]')).toBeFocused();

  const afterRight = await counter.textContent();
  await womenStack.locator('[data-stack-depth="0"]').press("ArrowLeft");
  await expect(counter).not.toHaveText(afterRight);
  await expect(womenStack.locator('[data-stack-depth="0"]')).toBeFocused();
});

test("non-interactive forum image has no false hover action", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name.startsWith("mobile-"), "Touch layouts do not expose hover.");
  await openFreshPage(page, "work");

  const figure = page.locator(".project__visual--forum");
  const image = figure.locator(".project__image");
  await figure.scrollIntoViewIfNeeded();
  await figure.hover();
  await expect(image).toHaveCSS("transform", "none");
});

test("decorative routes draw through stable masks and finish as solid strokes", async ({ page }) => {
  await openFreshPage(page, "work");

  const routeDashArrays = await page.locator(".women-route__art > path").evaluateAll((paths) =>
    paths.map((path) => getComputedStyle(path).strokeDasharray),
  );
  const traceDashArrays = await page.locator(".climate-field__trace").evaluateAll((paths) =>
    paths.map((path) => getComputedStyle(path).strokeDasharray),
  );
  const arcaDashArrays = await page.locator(".arca-network__links path").evaluateAll((paths) =>
    paths.map((path) => getComputedStyle(path).strokeDasharray),
  );

  expect(routeDashArrays).toEqual(["none", "none", "none", "none"]);
  expect(traceDashArrays).toEqual(["none", "none"]);
  expect(arcaDashArrays).toEqual(["none", "none"]);

  const normalizedPathLengths = await page.locator(".route-reveal-path, .women-route__art > path, .climate-field__trace, .arca-network__links path").evaluateAll(
    (paths) => paths.map((path) => path.getAttribute("pathLength")),
  );
  expect(normalizedPathLengths.every((pathLength) => pathLength === null)).toBe(true);

  const routeSequences = [
    {
      trigger: page.locator(".project__visual--women-stack"),
      reveal: page.locator(".women-route__reveal"),
    },
    {
      trigger: page.locator(".project__visual--forum"),
      reveal: page.locator(".climate-field__reveal"),
    },
    {
      trigger: page.locator(".timeline"),
      reveal: page.locator(".arca-network__reveal"),
    },
  ];

  for (const { trigger, reveal } of routeSequences) {
    await trigger.scrollIntoViewIfNeeded();
    await expect(reveal.first()).toHaveCSS("animation-name", "route-reveal-draw");
    await expect(reveal.first()).toHaveCSS("stroke-dashoffset", "0px", { timeout: 4_000 });
    await expect(reveal.last()).toHaveCSS("stroke-dashoffset", "0px", { timeout: 4_000 });
  }

  await page.getByRole("button", { name: "Index" }).click();
  const dialog = page.getByRole("dialog", { name: "Index" });
  await dialog.getByRole("button", { name: "Reduced" }).click();
  const reducedReveal = page.locator(".route-reveal-path");
  await expect(reducedReveal.first()).toHaveCSS("animation-name", "none");
  await expect(reducedReveal.first()).toHaveCSS("stroke-dasharray", "none");
  await expect(reducedReveal.first()).toHaveCSS("stroke-dashoffset", "0px");
});

test("rendered page has no serious WCAG A or AA violations", async ({ page }) => {
  await installUpcomingClock(page);
  await openFreshPage(page, "top", { analyticsConsent: null });

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const seriousViolations = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");

  expect(seriousViolations).toEqual([]);
});
