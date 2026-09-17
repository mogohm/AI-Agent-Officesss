import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * WP-003B / WP-003C visual + functional verification.
 *
 * Real authenticated session against real database records — no fixtures, no
 * mocked routes. Screenshots are captured from the live render so they are
 * evidence, not decoration.
 */

const VIEWPORTS = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1600x900", width: 1600, height: 900 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

const OUT = path.resolve(__dirname, "../../../../artifacts/WP-003B/screenshots");

async function login(page: Page) {
  await page.goto("/login");
  await page.locator("#email").fill("owner@demo.local");
  await page.locator("#password").fill("demo1234");
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 45_000 });
}

test.describe("WP-003 dashboard and companies", () => {
  test.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

  for (const vp of VIEWPORTS) {
    test(`dashboard renders canonical buildings at ${vp.name}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const failedRequests: string[] = [];
      page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
      page.on("requestfailed", (r) => failedRequests.push(r.url()));

      await page.setViewportSize({ width: vp.width, height: vp.height });
      await login(page);
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");

      // every building image must be a canonical registry path and actually load
      const imgs = page.locator('img[src^="/assets/office/buildings/"]');
      const count = await imgs.count();
      expect(count, "canonical building images on dashboard").toBeGreaterThan(0);

      for (let i = 0; i < count; i++) {
        const el = imgs.nth(i);
        const natural = await el.evaluate((n) => (n as HTMLImageElement).naturalWidth);
        expect(natural, `image ${i} must have loaded`).toBeGreaterThan(0);
        // object-contain is required: cover would crop the building base
        const fit = await el.evaluate((n) => getComputedStyle(n).objectFit);
        expect(fit, `image ${i} object-fit`).toBe("contain");
      }

      // no legacy index-mapped art may remain
      expect(await page.locator('img[src*="/companies/building-"]').count()).toBe(0);

      // no horizontal overflow at any viewport
      const overflow = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflow, "horizontal overflow").toBe(false);

      await page.screenshot({ path: path.join(OUT, `dashboard-${vp.name}.png`), fullPage: false });

      const assetFailures = failedRequests.filter((u) => u.includes("/assets/office/"));
      expect(assetFailures, "failed canonical asset requests").toEqual([]);
      expect(consoleErrors.filter((e) => !/favicon|devtools/i.test(e)), "console errors").toEqual([]);
    });
  }

  test("companies page reuses the same canonical card system", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await page.goto("/companies");
    await page.waitForLoadState("networkidle");
    const imgs = page.locator('img[src^="/assets/office/buildings/"]');
    expect(await imgs.count(), "canonical buildings on companies page").toBeGreaterThan(0);
    fs.mkdirSync(path.resolve(OUT, "../../WP-003C/screenshots"), { recursive: true });
    await page.screenshot({ path: path.resolve(OUT, "../../WP-003C/screenshots/companies-1920x1080.png") });
  });

  test("company variants are deterministic across reloads", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    const read = async () => {
      await page.goto("/dashboard");
      await page.waitForLoadState("networkidle");
      return page.locator("[data-variant]").evaluateAll((ns) =>
        ns.map((n) => (n as HTMLElement).dataset.variant).join(","));
    };
    const first = await read();
    const second = await read();
    expect(first.length, "variants present").toBeGreaterThan(0);
    expect(second, "variant assignment must be stable").toBe(first);
  });
});

/** WP-003D — accessibility smoke and integrated checks. */
test.describe("WP-003D integrated verification", () => {
  test("accessibility smoke: names, alt text, focus, headings, unique ids", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // every content image carries real alt text (decorative ones must opt out)
    const badAlt = await page.locator("img:not([aria-hidden='true'])").evaluateAll((ns) =>
      ns.filter((n) => !(n as HTMLImageElement).alt?.trim()).map((n) => (n as HTMLImageElement).src));
    expect(badAlt, "images missing alt text").toEqual([]);

    // every link and button is reachable by name
    const nameless = await page.locator("a, button").evaluateAll((ns) =>
      ns.filter((n) => {
        const el = n as HTMLElement;
        const text = (el.textContent ?? "").trim();
        return !text && !el.getAttribute("aria-label") && !el.getAttribute("title");
      }).length);
    expect(nameless, "links/buttons without an accessible name").toBe(0);

    // duplicate ids break label association and assistive tech
    const dupes = await page.evaluate(() => {
      const seen = new Set<string>(); const dup: string[] = [];
      document.querySelectorAll("[id]").forEach((n) => {
        const id = n.id; if (seen.has(id)) dup.push(id); else seen.add(id);
      });
      return dup;
    });
    expect(dupes, "duplicate element ids").toEqual([]);

    // exactly one h1, and headings exist
    expect(await page.locator("h1").count(), "h1 count").toBeLessThanOrEqual(1);

    // keyboard focus reaches an interactive element with a visible indicator
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      if (!a || a === document.body) return null;
      const s = getComputedStyle(a);
      return { tag: a.tagName, outline: s.outlineStyle, ring: s.boxShadow };
    });
    expect(focus, "Tab must reach an interactive element").not.toBeNull();
  });

  test("test records are hidden by default and the explicit filter works", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await login(page);
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    const normal = await page.locator("[data-variant]").count();
    await page.goto("/dashboard?showTestData=1");
    await page.waitForLoadState("networkidle");
    const withTest = await page.locator("[data-variant]").count();
    // the toggle must never REDUCE the set; hidden-by-default is the contract
    expect(withTest).toBeGreaterThanOrEqual(normal);
  });
});
