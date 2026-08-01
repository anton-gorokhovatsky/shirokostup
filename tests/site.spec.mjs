import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const eventDismissalKey = "olga-event-ticket-dismissed";

const openFreshPage = async (page, hash = "top") => {
  await page.goto(`/?qa=browser-regression#${hash}`);
  await page.evaluate((key) => sessionStorage.removeItem(key), eventDismissalKey);
  await page.reload();
};

const rectanglesOverlap = (first, second) =>
  first.left < second.right &&
  first.right > second.left &&
  first.top < second.bottom &&
  first.bottom > second.top;

test("hero reserves space for the active event ticket", async ({ page }) => {
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

test("index keeps predictable focus, theme, and motion controls", async ({ page }, testInfo) => {
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

test("content reflows at 320 px and equivalent 200% desktop zoom", async ({ page }, testInfo) => {
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

test("decorative route illustrations render as solid strokes", async ({ page }) => {
  await openFreshPage(page, "work");

  const routeDashArrays = await page.locator(".women-route > path").evaluateAll((paths) =>
    paths.map((path) => getComputedStyle(path).strokeDasharray),
  );
  const traceDashArrays = await page.locator(".climate-field__trace").evaluateAll((paths) =>
    paths.map((path) => getComputedStyle(path).strokeDasharray),
  );

  expect(routeDashArrays).toEqual(["none", "none", "none", "none"]);
  expect(traceDashArrays).toEqual(["none", "none"]);
});

test("rendered page has no serious WCAG A or AA violations", async ({ page }) => {
  await openFreshPage(page);

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const seriousViolations = results.violations.filter(({ impact }) => impact === "serious" || impact === "critical");

  expect(seriousViolations).toEqual([]);
});
