import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const eventId = "listening-to-the-land-tromso-2026-11-01";
const eventDismissalKey = `olga-event-ticket-dismissed:${eventId}`;
const analyticsConsentKey = "olga-analytics-consent";
// macOS WebKit uses Option-Tab to include links with the default keyboard preference.
const linkTabKey = (browserName) => browserName === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab";
const upcomingTime = new Date("2026-11-01T12:00:00+01:00");
const shortlyBeforeArchiveTime = new Date("2026-11-01T23:59:55+01:00");

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

const openAtEventBoundary = async (page) => {
  // Navigation is setup, not part of the five seconds under test. Keep timers
  // running while the page loads, then own the exact boundary and every tick.
  await installUpcomingClock(page, new Date(shortlyBeforeArchiveTime.getTime() - 60_000));
  await openFreshPage(page);
  await page.clock.pauseAt(shortlyBeforeArchiveTime);
};

const rectanglesOverlap = (first, second) =>
  first.left < second.right &&
  first.right > second.left &&
  first.top < second.bottom &&
  first.bottom > second.top;

const inspectFooterReflow = () => {
  const footer = document.querySelector(".contact__footer");
  const bounds = footer.getBoundingClientRect();
  const signature = footer.querySelector("ag-signature").shadowRoot;
  const elements = [
    ...footer.children,
    ...footer.querySelectorAll("p, a, summary, .credits__count"),
    ...signature.querySelectorAll(".credit, .mark, .text, .name, .role, .arrow"),
  ];
  const clipped = elements.filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && (rect.left < bounds.left - 1 || rect.right > bounds.right + 1);
  }).map(element => ({
    class: element.getAttribute("class"),
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    footerLeft: bounds.left,
    footerRight: bounds.right,
    signatureMargin: getComputedStyle(footer.querySelector("ag-signature")).marginInlineStart,
  }));
  const links = [...footer.querySelectorAll("ag-signature, .contact__colophon > a")].map(element => element.getBoundingClientRect());
  const overlapping = links.some((first, index) => links.slice(index + 1).some(second =>
    first.left < second.right - 1 && first.right > second.left + 1 &&
    first.top < second.bottom - 1 && first.bottom > second.top + 1));
  const mark = signature.querySelector(".mark").getBoundingClientRect();
  const name = signature.querySelector(".name").getBoundingClientRect();
  const text = signature.querySelector(".text").getBoundingClientRect();
  const role = signature.querySelector(".role").getBoundingClientRect();
  const author = footer.querySelector("ag-signature").getBoundingClientRect();
  const primaryText = [
    [footer.querySelector(".contact__colophon > p"), footer.querySelector(".contact__colophon > p")],
    [footer.querySelector("ag-signature"), signature.querySelector(".name")],
    [footer.querySelector(".site-credit"), footer.querySelector(".site-credit .footer-link__label")],
  ].map(([owner, label]) => {
    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode()) && !node.textContent.trim()) { /* Find the first visible text. */ }
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, 1);
    const text = range.getBoundingClientRect();
    return { owner: owner.getBoundingClientRect(), textTop: text.top, textBottom: text.bottom, textLeft: text.left };
  });
  const identity = footer.querySelector(".contact__signature").getBoundingClientRect();
  const coordinates = footer.querySelector(".contact__coordinates").getBoundingClientRect();
  const professional = footer.querySelector(".professional-contact--footer").getBoundingClientRect();
  const threeColumns = professional.left > coordinates.right + 1;
  const multipleColumns = coordinates.left > identity.left + 1;
  const misaligned = [];
  for (let first = 0; first < primaryText.length; first++) {
    for (let second = first + 1; second < primaryText.length; second++) {
      const a = primaryText[first];
      const b = primaryText[second];
      // Compare text baselines in the named closing row, even if the mark makes the owner taller.
      const sharedRow = threeColumns || (multipleColumns && first === 0 && second === 1);
      if (sharedRow && Math.abs(a.textTop - b.textTop) > 1) misaligned.push({
        pair: [first, second],
        ownerTops: [a.owner.top, b.owner.top],
        ownerBottoms: [a.owner.bottom, b.owner.bottom],
        textTops: [a.textTop, b.textTop],
        signatureColumn: getComputedStyle(footer.querySelector("ag-signature")).gridColumn,
      });
    }
  }
  const textAxes = [
    [0, identity.left],
    [2, threeColumns ? coordinates.left : identity.left],
  ];
  const offGrid = textAxes.filter(([index, axis]) => Math.abs(primaryText[index].textLeft - axis) > 1)
    .map(([index, axis]) => ({ label: index, expectedLeft: axis, actualLeft: primaryText[index].textLeft }));
  // The name anchors the credit; the mark hangs left in columns and has its own row on mobile.
  const authorAxis = threeColumns ? professional.left : multipleColumns ? coordinates.left : identity.left;
  const gap = parseFloat(getComputedStyle(signature.querySelector(".credit")).columnGap);
  const markAxis = multipleColumns ? authorAxis - mark.width - gap : authorAxis;
  for (const [label, actual, expected] of [
    ["author", author.left, markAxis],
    ["mark", mark.left, markAxis],
    ["name", primaryText[1].textLeft, authorAxis],
    ["role", role.left, authorAxis],
    ["text", text.left, authorAxis],
  ]) {
    if (Math.abs(actual - expected) > 1) offGrid.push({ label, expectedLeft: expected, actualLeft: actual });
  }
  return {
    clipped,
    overlapping,
    misaligned,
    offGrid,
    horizontalScroll: document.documentElement.scrollWidth > innerWidth,
    signatureComposition: multipleColumns
      ? (mark.right <= name.left && name.top < mark.bottom && name.bottom > mark.top ? "hanging" : "invalid")
      : (mark.bottom <= text.top && Math.abs(mark.left - text.left) <= 1 ? "stacked" : "invalid"),
  };
};

test("content and native navigation survive an unavailable interaction script", async ({ page }) => {
  await page.route('**/script.js*', route => route.abort());
  await page.goto('/?qa=script-unavailable');
  for (const line of await page.locator('.hero__title span').all()) {
    await expect(line).toHaveCSS('opacity', '1');
  }
  await expect(page.locator('.index-button')).toBeHidden();
  await expect(page.locator('[data-archive-card][role="button"]')).toHaveCount(0);
  const workLink = page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Selected work' });
  await workLink.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator('#work-title')).toHaveCSS('opacity', '1');
  await page.goto('/404.html?qa=script-unavailable');
  await expect(page.locator('h1')).toHaveCSS('opacity', '1');
  await expect(page.getByRole('link', { name: 'Return to the portfolio' })).toBeVisible();
});

test("a delayed interaction script keeps the already visible introduction in place", async ({ page }) => {
  let releaseScript;
  const scriptReady = new Promise(resolve => { releaseScript = resolve; });
  await page.route('**/script.js*', async route => {
    await scriptReady;
    await route.continue();
  });
  try {
    await page.goto('/?qa=delayed-script', { waitUntil: 'commit' });
    const title = page.locator('.hero__title');
    await expect(title.locator('span').first()).toHaveCSS('opacity', '1');
    const before = await title.boundingBox();
    releaseScript();
    await page.waitForLoadState('load');
    await expect(page.locator('html')).toHaveClass(/\bjs\b/);
    const after = await title.boundingBox();
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    await expect(title.locator('span').first()).toHaveCSS('opacity', '1');
  } finally {
    releaseScript();
  }
});

test("a mobile first visit reaches visual work directly from the introduction", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFreshPage(page, 'top', { analyticsConsent: null });
  const workLink = page.locator('.hero').getByRole('link', { name: 'Selected work' });
  await expect(workLink).toBeInViewport({ ratio: 1 });
  await workLink.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#work$/);
  await expect(page.locator('.project--women [data-stack-depth="0"] img')).toBeInViewport();
  for (const project of await page.locator('.project').all()) {
    const heading = await project.locator('.project__heading').boundingBox();
    const visual = await project.locator('.project__visual').boundingBox();
    const description = await project.locator('.project__information').boundingBox();
    expect(visual.y).toBeGreaterThan(heading.y + heading.height);
    expect(description.y).toBeGreaterThanOrEqual(visual.y + visual.height);
  }
});

test("Index keeps background detail from showing through its reading surface", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFreshPage(page, 'contact');
  await page.evaluate(() => {
    const backdrop = document.createElement('div');
    backdrop.id = 'qa-background-detail';
    backdrop.style.cssText = 'position:fixed;inset:0;z-index:1000;background:repeating-linear-gradient(90deg,#000 0 1px,#fff 1px 2px);pointer-events:none';
    document.body.append(backdrop);
  });
  await page.getByRole('button', { name: 'Index', exact: true }).click();
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
    // WebKit may acknowledge the media change before painting the new surface.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const clip = { x: 4, y: 160, width: 10, height: 80 };
    const before = await page.screenshot({ clip });
    await page.locator('#qa-background-detail').evaluate(el => el.style.backgroundPositionX = '1px');
    const after = await page.screenshot({ clip });
    const difference = await page.evaluate(async (images) => {
      const pixels = await Promise.all(images.map(async data => {
        const img = new Image();
        img.src = `data:image/png;base64,${data}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height).data;
      }));
      return pixels[0].reduce((sum, value, i) => sum + Math.abs(value - pixels[1][i]), 0) / pixels[0].length;
    }, [before, after].map(image => image.toString('base64')));
    expect(difference, `Background details remain suppressed in ${colorScheme}`).toBeLessThan(2);
    await page.locator('#qa-background-detail').evaluate(el => el.style.backgroundPositionX = '0px');
  }
});

test("hero reserves space for the active event ticket", async ({ page }, testInfo) => {
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
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: testInfo.outputPath("listening-hero.png"), animations: "disabled" });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect(ticket).toBeVisible();
  await ticket.scrollIntoViewIfNeeded();
  for (const element of await ticket.locator("a, button, .event-calendar, .event-ticket__copy").all()) {
    const box = await element.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(321);
    expect(await element.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  }
  const [textAt200, ticketAt200] = await Promise.all([
    page.locator(".hero__content").boundingBox(), ticket.boundingBox(),
  ]);
  expect(textAt200.y + textAt200.height).toBeLessThanOrEqual(ticketAt200.y);
  await page.screenshot({ path: testInfo.outputPath("calendar-text-200.png"), animations: "disabled" });
  await page.locator("#now").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(await page.locator("#now-title").evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("event-text-200.png"), animations: "disabled" });

  await page.evaluate(() => { document.documentElement.style.removeProperty("font-size"); });
  for (const width of [320, 390, 700, 701, 800, 1024, 1280, 1920]) {
    await page.setViewportSize({ width, height: 844 });
    const layout = await page.locator("#now").evaluate(section => {
      const blocks = [...section.querySelectorAll(".now__date, .now__copy > p, .now__copy > h2, .now__action")].map(el => el.getBoundingClientRect());
      return {
        clipped: blocks.some(rect => rect.left < 0 || rect.right > innerWidth + 1),
        overlapping: blocks.some((first, index) => blocks.slice(index + 1).some(second =>
          first.left < second.right - 1 && first.right > second.left + 1 &&
          first.top < second.bottom - 1 && first.bottom > second.top + 1)),
        titleOverflow: section.querySelector("h2").scrollWidth - section.querySelector("h2").clientWidth,
        dateToCopy: blocks[1].top - blocks[0].bottom,
        dateHeight: blocks[0].height,
      };
    });
    expect(layout.clipped, `Event bounds at ${width}px`).toBe(false);
    expect(layout.overlapping, `Event groups at ${width}px`).toBe(false);
    expect(layout.titleOverflow, `Event title at ${width}px`).toBeLessThanOrEqual(1);
    if (width <= 700) {
      expect(layout.dateToCopy, `Date stays with its event at ${width}px`).toBeLessThanOrEqual(layout.dateHeight * 0.5);
    }
  }
  if (testInfo.project.name === "desktop-chromium") {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.mouse.move(0, 0);
    const card = page.locator("[data-featured-event-link]");
    const dateToTitle = () => card.evaluate(el =>
      el.querySelector(".now__date").getBoundingClientRect().bottom - el.querySelector("h2").getBoundingClientRect().bottom);
    const restingAlignment = await dateToTitle();
    const finishFeedback = () => card.evaluate(async el => {
      await Promise.allSettled(el.getAnimations({ subtree: true }).map(animation => animation.finished));
    });
    await card.hover();
    await finishFeedback();
    expect(Math.abs(await dateToTitle() - restingAlignment)).toBeLessThanOrEqual(1);
    await card.press("ArrowDown");
    await expect(card).toBeFocused();
    await finishFeedback();
    expect(Math.abs(await dateToTitle() - restingAlignment)).toBeLessThanOrEqual(1);
  }
});

test("event lifecycle moves from invitation to a lasting past record", async ({ page }) => {
  await openAtEventBoundary(page);

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
  await expect(featuredEvent.locator("[data-featured-event-date]")).toHaveText("1 November 2026");
  await expect(featuredEvent.getByText("Event details", { exact: true })).toBeVisible();
  const permanentLink = page.getByRole("list", { name: "Selected roles and projects" })
    .getByRole("link", { name: "Listening to the Land: Tromsø", exact: true });
  await expect(permanentLink).toHaveAttribute("href", "https://www.smallprojects.net/listeningtotheland");
  await expect(permanentLink).toBeVisible();
});

test("event ticket dismissal is scoped to the current event", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await installUpcomingClock(page);
  await openFreshPage(page);

  const ticket = page.locator("[data-event-ticket]");
  await expect(ticket).toBeVisible();
  // WebKit can report two equal rectangles between entrance frames. Visibility
  // alone does not mean the animated target has reached its resting position.
  await expect(ticket).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await expect(ticket).toBeInViewport({ ratio: 1 });
  await page.getByRole("button", { name: "Hide event invitation" }).click();
  await expect(ticket).toBeHidden();
  await expect
    .poll(() => page.evaluate((key) => sessionStorage.getItem(key), eventDismissalKey))
    .toBe("true");
  await page.reload();
  await expect(ticket).toBeHidden();
});

test("event anchor keeps its date clear of the fixed Index", async ({ page }) => {
  await installUpcomingClock(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFreshPage(page);
  for (const width of [320, 390, 1280, 1920]) {
    await page.setViewportSize({ width, height: 844 });
    for (const fontSize of ['100%', '200%']) {
      await page.goto('/?qa=browser-regression#top');
      await page.evaluate(size => { document.documentElement.style.fontSize = size; }, fontSize);
      // Let fonts and the invitation's resize observer finish the new text/viewport layout.
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      await expect.poll(() => page.locator('[data-event-ticket]').evaluate(ticket =>
        Math.abs(parseFloat(document.documentElement.style.getPropertyValue('--event-ticket-height')) - ticket.offsetHeight)
      )).toBeLessThanOrEqual(1);
      await page.goto('/?qa=browser-regression#now');
      await expect.poll(async () => {
        const index = await page.getByRole('button', { name: 'Index', exact: true }).boundingBox();
        const date = await page.locator('[data-featured-event-date]').boundingBox();
        return date.y - (index.y + index.height);
      }, { message: `Event date clears Index at ${width}px and ${fontSize} text` }).toBeGreaterThanOrEqual(0);
    }
  }
});

test("calendar date stays painted after changing themes", async ({ page }, testInfo) => {
  await installUpcomingClock(page);
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await openFreshPage(page);
  await page.evaluate(() => document.fonts.ready);
  const day = page.locator(".event-calendar strong");
  await expect(day).toHaveText("1");
  for (const width of [390, 1920]) {
    await page.setViewportSize({ width, height: 1080 });
    const initial = await day.screenshot({ animations: "disabled" });
    for (const name of ["Dark", "Light", "Dark", "Light"]) {
      await page.getByRole("button", { name: "Index", exact: true }).click();
      await page.locator(`[data-theme-choice="${name.toLowerCase()}"]`).click();
      await page.getByRole("button", { name: "Close index", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Index" })).toBeHidden();
      await expect(day).toBeVisible();
      const rendered = await day.screenshot({ animations: "disabled" });
      if (!rendered.equals(initial)) {
        await testInfo.attach(`calendar-${width}-${name}`, { body: rendered, contentType: "image/png" });
        await testInfo.attach(`calendar-${width}-initial`, { body: initial, contentType: "image/png" });
      }
      expect(rendered.equals(initial), `The date must stay painted after ${name} at ${width}px`).toBe(true);
    }
  }
});

test("professional link focus clears its labels and the next line", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await openFreshPage(page, "contact");
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const scale of ["100%", "200%"]) {
      await page.evaluate(size => { document.documentElement.style.fontSize = size; }, scale);
      for (const location of ["footer", "index"]) {
        if (location === "index") await page.getByRole("button", { name: "Index", exact: true }).click();
        const contact = page.locator(`.professional-contact--${location}`);
        for (const link of await contact.locator("a").all()) {
          await link.press("ArrowDown");
          await expect(link).toBeFocused();
          const focus = await link.evaluate(el => {
            const group = el.closest(".professional-contact");
            const styles = getComputedStyle(el);
            const clearance = parseFloat(styles.outlineWidth) + parseFloat(styles.outlineOffset);
            const bounds = el.getBoundingClientRect();
            return {
              top: bounds.top - clearance,
              bottom: bounds.bottom + clearance,
              labelBottom: group.querySelector(".professional-contact__label").getBoundingClientRect().bottom,
              noteTop: group.querySelector(".professional-contact__note").getBoundingClientRect().top,
              height: bounds.height,
              outline: styles.outlineStyle,
            };
          });
          expect(focus.outline).not.toBe("none");
          expect(focus.height).toBeGreaterThanOrEqual(44);
          expect(focus.top, `${location} focus above at ${width}px / ${scale}`).toBeGreaterThanOrEqual(focus.labelBottom);
          expect(focus.bottom, `${location} focus below at ${width}px / ${scale}`).toBeLessThanOrEqual(focus.noteTop);
        }
        if (location === "index") await page.getByRole("button", { name: "Close index", exact: true }).click();
      }
    }
  }
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
  await page.emulateMedia({ reducedMotion: "reduce" });
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
  await page.evaluate(() => document.fonts.ready);

  const consentPanel = page.locator(".analytics-consent[data-analytics-consent]");
  const allowAnalytics = consentPanel.getByRole("button", { name: "Allow analytics" });
  const declineAnalytics = consentPanel.getByRole("button", { name: "Decline" });
  await expect(consentPanel).toBeVisible();
  await expect(page.locator('script[src*="mc.yandex.ru/metrika/tag.js"]')).toHaveCount(0);
  expect(metricaRequests).toEqual([]);
  expect(await page.evaluate(() => window.disableYaCounter111895186)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);

  // Finish bringing the whole panel into view before focus changes and the pointer click.
  await consentPanel.scrollIntoViewIfNeeded();
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

test("enlarged text keeps consent, past event, and gallery actions inside a narrow screen", async ({ page }, testInfo) => {
  await page.clock.install({ time: new Date("2026-11-04T12:00:00Z") });
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFreshPage(page, "top", { analyticsConsent: null });
  await page.evaluate(async () => {
    await document.fonts.ready;
    document.documentElement.style.fontSize = "200%";
  });

  const controls = page.locator(".analytics-consent__actions button, .now__action, .archive-next");
  for (const control of await controls.all()) {
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(321);
    expect(await control.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

  for (const instruction of await page.locator('.archive-stack__instruction:visible').all()) {
    const lines = await instruction.evaluate(el => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight));
    expect(lines, 'A three-word gallery instruction must keep words readable at 200%').toBeLessThanOrEqual(3.01);
  }
  for (const project of ['women', 'archive']) {
    await page.locator(`.project--${project} .archive-stack__instructions`).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`${project}-controls-text-200.png`), animations: 'disabled' });
  }
  const next = page.getByRole("button", { name: "Next image in Women in the North" });
  await next.focus();
  await expect(next).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".project__visual--women-stack [data-archive-counter]")).toHaveText("02 / 04");
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

  // This scenario checks motion after scrolling, not pointer hit testing. In the
  // Linux WebKit trace, scrolling shifted during the synthetic click and Index
  // stayed closed. Keep pointer coverage in the dedicated Index/footer tests.
  const index = page.getByRole("button", { name: "Index", exact: true });
  await index.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Index" });
  await expect(index).toHaveAttribute("aria-expanded", "true");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Reduced" }).click();
  const reducedReveal = page.locator(".route-reveal-path");
  await expect(reducedReveal.first()).toHaveCSS("animation-name", "none");
  await expect(reducedReveal.first()).toHaveCSS("stroke-dasharray", "none");
  await expect(reducedReveal.first()).toHaveCSS("stroke-dashoffset", "0px");
});

test("consent notice has an opaque surface and never overlaps the introduction", async ({ page }) => {
  await installUpcomingClock(page);
  await openFreshPage(page, "top", { analyticsConsent: null });
  const notice = page.locator("aside.analytics-consent");
  const [hero, panel] = await Promise.all([page.locator(".hero").boundingBox(), notice.boundingBox()]);
  expect(panel.y).toBeGreaterThanOrEqual(hero.y + hero.height - 1);
  expect(await notice.evaluate(el => getComputedStyle(el).backgroundColor)).not.toMatch(/rgba|transparent/);
  await expect(page.locator('[data-event-ticket]')).toBeVisible();
  await expect(page.locator('[data-event-ticket]')).toHaveCSS('opacity', '1');
  await notice.scrollIntoViewIfNeeded();
  await expect(notice.getByRole("button", { name: "Allow analytics" })).toBeInViewport();
  await expect(notice.getByRole("button", { name: "Decline" })).toBeInViewport();
});

test("past event becomes compact while a future event keeps its invitation", async ({ page }) => {
  await openAtEventBoundary(page);
  const feature = page.locator("[data-featured-event]");
  const before = (await feature.boundingBox()).height;
  await page.clock.runFor(5100);
  await expect(feature).toHaveAttribute("data-event-state", "past");
  const after = (await feature.boundingBox()).height;
  expect(after).toBeLessThan(before * 0.65);
  await expect(feature.getByRole("link")).toHaveAccessibleName(/Event details: Listening to the Land: Tromsø/);
});

test("past event uses the neutral dark surface while invitations retain their accent", async ({ page }) => {
  await installUpcomingClock(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openFreshPage(page, "now");
  const feature = page.locator("[data-featured-event]");
  const expectBackground = async (background) => {
    const expected = await feature.evaluate((element, value) => {
      const probe = document.createElement("div");
      probe.style.background = value;
      element.append(probe);
      const colour = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return colour;
    }, background);
    await expect(feature).toHaveCSS("background-color", expected);
  };
  const chooseTheme = async (name, colorScheme) => {
    await page.emulateMedia({ colorScheme });
    await page.getByRole("button", { name: "Index", exact: true }).click();
    await page.getByRole("group", { name: "Colour theme" }).getByRole("button", { name, exact: true }).click();
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).toHaveAttribute("data-theme", name === "System" ? colorScheme : name.toLowerCase());
  };

  for (const name of ["Light", "Dark"]) {
    await chooseTheme(name, "dark");
    await expect(feature).toHaveAttribute("data-event-state", "upcoming");
    await expectBackground("var(--lichen)");
  }

  await page.clock.fastForward(12 * 60 * 60 * 1000 + 1000);
  await expect(feature).toHaveAttribute("data-event-state", "past");
  for (const [name, colorScheme, dark] of [["Light", "dark", false], ["Dark", "light", true], ["System", "dark", true], ["System", "light", false]]) {
    await chooseTheme(name, colorScheme);
    await expectBackground(dark ? "var(--paper-bright)" : "color-mix(in srgb, var(--paper-bright) 94%, var(--lichen))");
  }

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectBackground("var(--paper-bright)");
  await feature.scrollIntoViewIfNeeded();
  const results = await new AxeBuilder({ page }).include("#now").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(results.violations).toEqual([]);

  // Match the CSS-only system fallback before a theme attribute is available.
  await page.locator("html").evaluate(element => element.removeAttribute("data-theme"));
  await expectBackground("var(--paper-bright)");
});

test("next event is selected without changing the build clock", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  let firstNavigation = true;
  await page.route('**/?qa=browser-regression*', async route => {
    const response = await route.fetch();
    if (firstNavigation) {
      firstNavigation = false;
      // A slow first response must not archive the fixture before dismissal.
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
    let html = await response.text();
    html = html.replace(/(<script type="application\/json" id="event-data">)([\s\S]*?)(<\/script>)/, (_, start, json, end) => {
      const events = JSON.parse(json);
      events.push({ ...events[0], id: 'test-next-event', title: 'Next conversation', ticketTitle: 'Next conversation', startsAt: '2026-12-01T18:00:00+01:00', archivesAt: '2026-12-02T00:00:00+01:00' });
      return start + JSON.stringify(events) + end;
    });
    await route.fulfill({ response, body: html });
  });
  await openAtEventBoundary(page);
  const ticket = page.locator('[data-event-ticket]');
  await expect(ticket).toHaveAttribute('data-event-id', eventId);
  await expect(ticket).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(ticket).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Hide event invitation' }).click();
  await expect(page.locator('[data-event-ticket]')).toBeHidden();
  await expect.poll(() => page.evaluate(key => sessionStorage.getItem(key), eventDismissalKey)).toBe('true');
  await page.clock.runFor(5100);
  await expect(page.locator('[data-featured-event]')).toHaveAttribute('data-event-id', 'test-next-event');
  await expect(page.locator('[data-featured-event-status]')).toHaveText('Upcoming');
  await expect(page.locator('[data-event-ticket]')).toBeVisible();
  await expect(page.locator('[data-event-ticket-title]')).toHaveText('Next conversation');
  await expect(page.locator('[data-event-ticket] [data-event-weekday]')).toHaveText('Tue');
});

test("both stacks advance once on tap, button and either drag direction", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openFreshPage(page, 'work');
  for (const figure of await page.locator('figure:has([data-archive-stack])').all()) {
    const cards = figure.locator('[data-archive-card]');
    const next = figure.locator('[data-archive-next]');
    await next.scrollIntoViewIfNeeded();
    if (testInfo.project.use.hasTouch) await next.tap(); else await next.click();
    await expect(cards.nth(1)).toHaveAttribute('data-stack-depth', '0');
    await next.focus();
    await next.press('Enter');
    await expect(cards.nth(2)).toHaveAttribute('data-stack-depth', '0');
    await expect(next).toBeFocused();
    await cards.nth(2).scrollIntoViewIfNeeded();
    if (testInfo.project.use.hasTouch) await cards.nth(2).tap(); else await cards.nth(2).click();
    await expect(cards.nth(3)).toHaveAttribute('data-stack-depth', '0');
    let current = 3;
    for (const direction of [-1, 1]) {
      const card = cards.nth(current);
      await card.scrollIntoViewIfNeeded();
      const box = await card.boundingBox();
      const x = box.x + box.width / 2;
      const y = box.y + Math.min(box.height / 2, 150);
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + direction * Math.min(box.width * 0.35, 180), y, { steps: 8 });
      await page.mouse.up();
      current = (current + 1) % await cards.count();
      await expect(cards.nth(current)).toHaveAttribute('data-stack-depth', '0');
    }
  }
});

test("Index contrast passes over the blue archive in every theme", async ({ page }) => {
  await openFreshPage(page);
  await page.locator('.project--archive').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Index', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Index' });
  for (const mode of ['Light', 'Dark', 'System']) {
    await dialog.getByRole('button', { name: mode, exact: true }).first().click();
    await page.waitForTimeout(500);
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(results.violations).toEqual([]);
  }
});

test("analytics goals respect consent and do not replay earlier actions", async ({ page }) => {
  await page.route('https://mc.yandex.ru/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '/* test stub */' }));
  await openFreshPage(page);
  await page.evaluate(() => document.addEventListener('click', event => { if (event.target.closest('a')) event.preventDefault(); }));
  const project = page.locator('.project--women h3 a');
  await project.click();
  expect(await page.evaluate(() => window.ym?.a?.filter(call => call[1] === 'reachGoal') || [])).toEqual([]);
  await page.getByRole('button', { name: 'Index', exact: true }).click();
  const group = page.getByRole('group', { name: 'Analytics preference' });
  await group.getByRole('button', { name: 'Allow', exact: true }).click();
  await page.keyboard.press('Escape');
  await project.click();
  await page.locator('.contact__footer a[href$=".pdf"]').click();
  await page.getByRole('link', { name: 'Email Olga Shirokostup to work together', exact: true }).click();
  expect(await page.evaluate(() => window.ym.a.filter(call => call[1] === 'reachGoal').map(call => call[2]))).toEqual(['project_open', 'cv_open', 'email_click']);
  await page.getByRole('button', { name: 'Index', exact: true }).click();
  await group.getByRole('button', { name: 'Decline', exact: true }).click();
  await page.keyboard.press('Escape');
  await project.click();
  expect(await page.evaluate(() => window.ym.a.filter(call => call[1] === 'reachGoal').length)).toBe(3);
});

test("rendered page has no serious WCAG A or AA violations", async ({ page }) => {
  await installUpcomingClock(page);
  await openFreshPage(page, "top", { analyticsConsent: null });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-event-ticket]")).toHaveCSS("opacity", "1");

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const seriousViolations = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");

  expect(seriousViolations).toEqual([]);
});

test("Areal loads its variable styles and follows manual and system themes without reflow", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  const fontResponse = page.waitForResponse(response => response.url().includes("ABCArealVariable-") && response.url().endsWith(".woff2"));
  await page.goto("/?qa=areal");
  expect((await fontResponse).status()).toBe(200);
  expect(await page.evaluate(async () => {
    const styles = ['400 16px "ABC Areal"', '600 16px "ABC Areal"', 'italic 400 16px "ABC Areal"'];
    const faces = await Promise.all(styles.map(style => document.fonts.load(style)));
    return faces.every(loaded => loaded.length > 0 && loaded.every(face => face.status === "loaded"));
  })).toBe(true);

  const body = page.locator("body");
  const paragraph = page.locator(".practice-statement p");
  const geometry = () => paragraph.evaluate(element => {
    // Compare actual line breaks, not platform-specific glyph ink/hinting bounds.
    const lines = new Map();
    const nodes = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = nodes.nextNode(); node; node = nodes.nextNode()) {
      for (let offset = 0; offset < node.length; offset++) {
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);
        const top = range.getBoundingClientRect().top;
        lines.set(top, (lines.get(top) || "") + node.textContent[offset]);
      }
    }
    return { height: element.getBoundingClientRect().height, lines: [...lines.values()].map(line => line.trim()) };
  });
  const initial = await geometry();
  await page.getByRole("button", { name: "Index", exact: true }).click();
  const theme = page.getByRole("group", { name: "Colour theme" });
  for (const [name, axis] of [["Dark", 1], ["Light", 0], ["System", 0]]) {
    const choice = theme.getByRole("button", { name, exact: true });
    await choice.focus();
    await page.keyboard.press("Enter");
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await expect(body).toHaveCSS("font-variation-settings", `"DRKM" ${axis}`);
    expect(await geometry()).toEqual(initial);
  }
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(body).toHaveCSS("font-variation-settings", '"DRKM" 1');
  expect(await geometry()).toEqual(initial);
  // Labels on fixed-colour surfaces follow their own background, in either theme.
  await expect(page.locator(".archive-card__caption").first()).toHaveCSS("font-variation-settings", '"DRKM" 1');
  await expect(page.locator(".forum-caption").first()).toHaveCSS("font-variation-settings", '"DRKM" 0');

  await page.goto("/404.html?qa=areal");
  expect(await page.evaluate(async () => (await document.fonts.load('400 16px "ABC Areal"')).length)).toBeGreaterThan(0);
  await expect(body).toHaveCSS("font-variation-settings", '"DRKM" 1');
});

test("footer row and image sources reflow continuously and with enlarged text", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await page.goto("/?qa=areal-footer#contact");
  await expect(page.locator("ag-signature")).toHaveAttribute("data-signature-version", /^1\./);
  await page.evaluate(() => document.fonts.ready);
  const credit = page.getByRole("link", { name: "Typeface: ABC Areal by Dinamo" });
  await expect(credit).toHaveAttribute("href", "https://are.al.are.na/");
  // Sweep the range and both sides of the old and current wrapping boundaries.
  const widths = [...new Set([
    ...Array.from({ length: 56 }, (_, index) => 320 + index * 64),
    324, 325, 326, 360, 390, 430, 600, 679, 680, 681, 699, 700, 701,
    704, 705, 706, 768, 820, 824, 825, 826, 900, 1024, 1180, 1181,
    1204, 1205, 1206, 1280, 1410, 1411, 1412, 1440, 1512, 1600, 1920,
    2408, 2409, 2410, 2560, 3840,
  ])].sort((first, second) => first - second);
  for (const theme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      // Measure after a paint: rAF itself runs before the container-query layout.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const reflow = await page.evaluate(inspectFooterReflow);
      expect(reflow, `Footer at ${width}px / ${theme}`).toMatchObject({
        clipped: [], overlapping: false, misaligned: [], offGrid: [], horizontalScroll: false,
      });
      expect(reflow.signatureComposition).not.toBe("invalid");
      if ([320, 390, 700, 768, 1280, 1512, 1920].includes(width)) {
        await page.locator(".contact__footer").screenshot({ path: testInfo.outputPath(`signature-footer-${theme}-${width}.png`), animations: "disabled" });
      }
    }
  }
  await page.emulateMedia({ colorScheme: "light" });
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const label = page.locator(".credits summary > span").first();
    expect(await label.evaluate(element => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    })).toBeLessThanOrEqual(2);
    // A clipped grid can hide overflow from document.scrollWidth; inspect actual content too.
    const reflow = await page.evaluate(inspectFooterReflow);
    expect(reflow, `Footer at ${width}px / text 200%`).toMatchObject({
      clipped: [], overlapping: false, misaligned: [], offGrid: [], horizontalScroll: false,
    });
    expect(reflow.signatureComposition).not.toBe("invalid");
    if ([320, 768, 1280, 1920].includes(width)) {
      await credit.scrollIntoViewIfNeeded();
      await credit.focus();
      await expect(credit).toBeFocused();
      await expect(credit).toBeInViewport();
      await expect(page.getByRole("link", { name: "Skip to content", exact: true })).not.toBeInViewport();
      expect((await credit.boundingBox()).height).toBeGreaterThanOrEqual(44);
      await page.screenshot({ path: testInfo.outputPath(`signature-footer-200-${width}.png`), animations: "disabled" });
    }
  }
});

test("shared author signature follows site themes and motion without losing native links", async ({ page, browserName }, testInfo) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await openFreshPage(page, "contact");
  const signature = page.locator("ag-signature");
  await expect(signature).toHaveAttribute("data-signature-version", /^1\./);
  await page.evaluate(() => document.fonts.ready);
  await signature.scrollIntoViewIfNeeded();
  const mark = signature.locator(".mark");
  const author = signature.getByRole("link", { name: "Anton Gorokhovatsky Design & development", exact: true });
  const typeface = page.getByRole("link", { name: "Typeface: ABC Areal by Dinamo", exact: true });
  const cv = page.locator(".contact__footer").getByRole("link", { name: "Open Olga Shirokostup’s CV as a PDF" });
  const labels = [signature.locator(".name"), typeface.locator(".footer-link__label")];
  const links = [author, typeface];
  const verifyUtilityFeedback = async (themeName) => {
    await cv.focus();
    await page.mouse.move(0, 0);
    const ink = await typeface.evaluate(element => getComputedStyle(element).color);
    const gradient = await labels[1].evaluate(element => getComputedStyle(element).backgroundImage);
    let focusColor;
    for (let index = 0; index < links.length; index++) {
      await expect(labels[index]).toHaveCSS("font-size", "14px");
      await expect(labels[index]).toHaveCSS("font-weight", "400");
      await expect(labels[index]).toHaveCSS("background-image", gradient);
      await links[index].hover();
      await expect(labels[index]).toHaveCSS("background-size", "0px 1px, 100% 2px");
      await expect(labels[index]).toHaveCSS("color", ink);
      await page.mouse.move(0, 0);
      await links[index].focus();
      await expect(links[index]).toHaveCSS("outline-style", "solid");
      await expect(links[index]).toHaveCSS("outline-width", "2px");
      focusColor ??= await links[index].evaluate(element => getComputedStyle(element).outlineColor);
      await expect(links[index]).toHaveCSS("outline-color", focusColor);
      await expect(labels[index]).toHaveCSS("background-size", "0px 1px, 100% 2px");
      await expect(labels[index]).toHaveCSS("color", ink);
      expect((await links[index].boundingBox()).height).toBeGreaterThanOrEqual(44);
      if (index === 0) {
        await page.locator(".contact__footer").screenshot({ path: testInfo.outputPath(`signature-focus-${themeName}.png`), animations: "disabled" });
      }
    }
    await cv.focus();
    for (const label of labels) await expect(label).toHaveCSS("background-size", "100% 1px, 0px 2px");
    const contrast = await new AxeBuilder({ page }).include(".contact__footer").withRules(["color-contrast"]).analyze();
    expect(contrast.violations).toEqual([]);
  };
  await expect(signature.getByRole("link")).toHaveCount(1);
  await expect(author).toHaveAttribute("href", "https://gorokhovatsky.tech/?point=shirokostup");
  await expect(author).toHaveAttribute("rel", "author");
  await expect(page.getByRole("link", { name: "About this website", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Back to top", exact: true })).toHaveCount(0);
  await expect(signature).toHaveAttribute("theme", "light");
  await expect(mark).toHaveAttribute("data-arc-running", "true");
  await expect(signature.getByRole("button")).toHaveCount(0);
  await verifyUtilityFeedback("light");
  await page.keyboard.press("End");
  await page.screenshot({ path: testInfo.outputPath("signature-footer-light.png"), animations: "disabled" });

  await cv.focus();
  await page.keyboard.press(linkTabKey(browserName));
  await expect(typeface).toBeFocused();
  await page.keyboard.press(linkTabKey(browserName));
  await expect(author).toBeFocused();
  await expect(author).toHaveCSS("outline-style", "solid");
  expect((await author.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press(linkTabKey(browserName));
  await expect(page.locator(".credits summary")).toBeFocused();

  await page.getByRole("button", { name: "Index", exact: true }).click();
  const theme = page.getByRole("group", { name: "Colour theme" });
  const motion = page.getByRole("group", { name: "Motion preference" });
  await theme.getByRole("button", { name: "Dark", exact: true }).click();
  await motion.getByRole("button", { name: "Reduced", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(signature).toHaveAttribute("theme", "dark");
  await expect(signature).toHaveAttribute("paused", "");
  await signature.scrollIntoViewIfNeeded();
  await expect(mark).toHaveAttribute("data-arc-running", "false");
  await expect(labels[0]).toHaveCSS("transition-duration", "0s");
  await verifyUtilityFeedback("dark");
  await page.keyboard.press("End");
  await page.screenshot({ path: testInfo.outputPath("signature-footer-dark.png"), animations: "disabled" });

  await page.getByRole("button", { name: "Index", exact: true }).click();
  await theme.getByRole("button", { name: "System", exact: true }).click();
  await motion.getByRole("button", { name: "System", exact: true }).click();
  await page.keyboard.press("Escape");
  await signature.scrollIntoViewIfNeeded();
  await expect(signature).toHaveAttribute("theme", "light");
  await expect(mark).toHaveAttribute("data-arc-running", "true");
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await expect(signature).toHaveAttribute("theme", "dark");
  await expect(mark).toHaveAttribute("data-arc-running", "false");
});

test("author credit remains keyboard accessible when the shared module is unavailable", async ({ page, browserName }) => {
  await page.route("https://gorokhovatsky.tech/signature/1.0.4/signature.js", route => route.abort());
  await openFreshPage(page, "contact");
  const author = page.getByRole("link", { name: "Anton Gorokhovatsky — Design & development", exact: true });
  await expect(author).toBeVisible();
  await expect(author).toHaveAttribute("href", "https://gorokhovatsky.tech/?point=shirokostup");
  await author.focus();
  await expect(author).toBeFocused();
  await page.keyboard.press(`Shift+${linkTabKey(browserName)}`);
  await expect(page.getByRole("link", { name: "Typeface: ABC Areal by Dinamo", exact: true })).toBeFocused();
  await page.keyboard.press(linkTabKey(browserName));
  await expect(author).toBeFocused();
  await page.keyboard.press(linkTabKey(browserName));
  await expect(page.locator(".credits summary")).toBeFocused();
});
