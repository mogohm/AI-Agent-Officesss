import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * WP-004 — continuous office tower shell, measured on the live render.
 *
 * These assert the building reads as ONE structure: every floor bounded by the
 * same pixels, no drift, no gaps. They measure the DOM rather than trusting the
 * CSS, so a refactor that visually breaks alignment fails here.
 */

const OUT = path.resolve(__dirname, "../../../../artifacts/WP-004/screenshots");
const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

async function login(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill("owner@demo.local");
  await page.locator("#password").fill("demo1234");
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 45_000 });
}

async function openFirstCompany(page: Page) {
  await page.goto("/companies");
  await page.waitForLoadState("networkidle");
  const href = await page.locator('a[href^="/companies/"]')
    .filter({ hasText: "เปิดดู" }).first().getAttribute("href");
  expect(href, "a company link must exist").toBeTruthy();
  await page.goto(href!);
  await page.waitForLoadState("networkidle");
  await expect(page.locator('[data-testid="office-tower"]')).toBeVisible();
}

test.describe("WP-004 continuous tower", () => {
  test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

  test("every floor shares the same left and right building edge", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await openFirstCompany(page);

    const boxes = await page.locator('[data-testid="floor-opening"]').evaluateAll((ns) =>
      ns.map((n) => { const r = n.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; }));
    expect(boxes.length, "floors rendered").toBeGreaterThan(0);

    const lefts = boxes.map((b) => b.left);
    const rights = boxes.map((b) => b.right);
    const widths = boxes.map((b) => b.width);
    // one shared shell means zero drift, not "close enough"
    expect(Math.max(...lefts) - Math.min(...lefts), "left edge drift").toBeLessThanOrEqual(1);
    expect(Math.max(...rights) - Math.min(...rights), "right edge drift").toBeLessThanOrEqual(1);
    expect(Math.max(...widths) - Math.min(...widths), "floor width variance").toBeLessThanOrEqual(1);
  });

  test("floors stack contiguously with no vertical gaps", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await openFirstCompany(page);

    const rows = await page.locator('[data-testid="tower-floor"], [data-testid="tower-basement"]')
      .evaluateAll((ns) => ns.map((n) => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
    for (let i = 1; i < rows.length; i++) {
      const gap = rows[i].top - rows[i - 1].bottom;
      expect(Math.abs(gap), `gap between floor ${i - 1} and ${i}`).toBeLessThanOrEqual(1);
    }
  });

  test("structural columns run the full height of the body", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await openFirstCompany(page);

    const col = await page.locator('[data-testid="tower-column-left"]').boundingBox();
    const rows = await page.locator('[data-testid="tower-floor"], [data-testid="tower-basement"]')
      .evaluateAll((ns) => ns.map((n) => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; }));
    expect(col, "left column").not.toBeNull();
    const bodyTop = Math.min(...rows.map((r) => r.top));
    const bodyBottom = Math.max(...rows.map((r) => r.bottom));
    // a single element spanning every floor - not one border per floor
    expect(Math.abs(col!.y - bodyTop), "column starts at body top").toBeLessThanOrEqual(1);
    expect(Math.abs(col!.y + col!.height - bodyBottom), "column ends at body bottom").toBeLessThanOrEqual(1);
  });

  test("no worker sprite is rendered in the label rail", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await openFirstCompany(page);

    const rail = await page.locator('[data-testid="floor-label"]').first().boundingBox();
    const sprites = await page.locator('[data-testid="office-tower"] img[src*="/characters/"], [data-testid="office-tower"] img[src*="/workers/"]')
      .evaluateAll((ns) => ns.map((n) => n.getBoundingClientRect().left));
    for (const left of sprites) {
      expect(left, "sprite must sit right of the label rail").toBeGreaterThanOrEqual(rail!.x + rail!.width - 1);
    }
  });

  test("floors come from real departments and the basement is not one of them", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await openFirstCompany(page);

    const declared = Number(await page.locator('[data-testid="office-tower"]').getAttribute("data-floor-count"));
    const rendered = await page.locator('[data-testid="tower-floor"]').count();
    expect(rendered, "rendered floors match the department count").toBe(declared);
    expect(declared).toBeGreaterThan(0);
    expect(declared).toBeLessThanOrEqual(15);

    // B1 exists but is never counted as a department floor
    expect(await page.locator('[data-testid="tower-basement"]').count()).toBe(1);

    // floor order strictly descending top to bottom
    const orders = await page.locator('[data-testid="tower-floor"]')
      .evaluateAll((ns) => ns.map((n) => Number((n as HTMLElement).dataset.floorOrder)));
    expect([...orders].sort((a, b) => b - a)).toEqual(orders);
  });

  test("every floor uses a canonical registry variant", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await openFirstCompany(page);

    const approved = ["marketing", "sales", "hr", "it-development", "design-meeting", "lobby-support", "server"];
    const variants = await page.locator('[data-testid="tower-floor"]')
      .evaluateAll((ns) => ns.map((n) => (n as HTMLElement).dataset.floorVariant));
    for (const v of variants) expect(approved, `variant ${v}`).toContain(v);

    // and the art actually loaded - a 404 must not pass as a rendered floor
    const broken = await page.locator('[data-testid="floor-opening"] img')
      .evaluateAll((ns) => ns.filter((n) => !(n as HTMLImageElement).naturalWidth).length);
    expect(broken, "floor images that failed to decode").toBe(0);
  });

  for (const vp of VIEWPORTS) {
    test(`tower renders without overflow at ${vp.name}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page);
      await openFirstCompany(page);

      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflow, "horizontal page overflow").toBe(false);

      await page.screenshot({ path: path.join(OUT, `tower-${vp.name}.png`), fullPage: false });
      expect(consoleErrors.filter((e) => !/favicon|devtools/i.test(e))).toEqual([]);
    });
  }
});
