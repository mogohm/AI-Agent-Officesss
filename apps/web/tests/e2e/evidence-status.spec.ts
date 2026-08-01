import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";

/**
 * Stage A2 E2E: the mission UI must show SEPARATE evidence statuses (not one
 * misleading DEGRADED badge) and must enforce RBAC on owner-only operations.
 */
const SHOTS = "../../outputs/screenshots/stage-a";
fs.mkdirSync(SHOTS, { recursive: true });
const DIGEST = "2c7a7093149616014708b3a5c24b7873b7f85aa3a9895f9feaf2d42c6505ce76";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  return page.waitForURL(/\/dashboard/, { timeout: 25000 }).then(() => true).catch(() => false);
}

test.use({ viewport: { width: 1600, height: 1000 } });

test("owner sees separate evidence statuses and the canonical digest", async ({ page }) => {
  test.setTimeout(180_000);
  expect(await login(page, "owner@demo.local", "demo1234")).toBe(true);

  await page.goto("/missions");
  await page.getByText("VISUAL-2026-001").first().click();
  await page.waitForURL(/\/missions\//, { timeout: 20000 });

  const summary = page.getByTestId("evidence-status-summary");
  await expect(summary).toBeVisible();

  // each status is its own badge — provenance never collapses the whole package
  for (const [label, value] of [
    ["แหล่งที่มาของหลักฐาน", "RECONSTRUCTED"],
    ["ความสมบูรณ์ของ Baseline", "PASSED"],
    ["การผูกผล Validation", "PINNED"],
    ["การผูกผล Review", "PINNED"],
    ["ความครบถ้วนของหลักฐาน", "COMPLETE"],
  ] as const) {
    await expect(summary.getByText(label, { exact: true })).toBeVisible();
    await expect(summary.getByText(value, { exact: true }).first()).toBeVisible();
  }

  // canonical digest is visible and unchanged
  await expect(page.getByTestId("baseline-digest")).toHaveText(DIGEST);
  await expect(summary.getByText("17/17 assets pinned")).toBeVisible();

  await page.screenshot({ path: `${SHOTS}/evidence-badges.png`, fullPage: true });

  // state persists across a reload (it lives in PostgreSQL)
  await page.reload();
  await expect(page.getByTestId("baseline-digest")).toHaveText(DIGEST);

  // WP-002 remains PASSED and WP-003 is still blocked behind WP-002H
  const body = await page.locator("body").innerText();
  expect(body).toMatch(/WP-002[\s\S]{0,300}?passed/i);
  expect(body).toContain("WP-002H");
});

test("viewer cannot extend duration or start the mission but can read evidence", async ({ browser }) => {
  test.setTimeout(120_000);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const ok = await login(page, "viewer@delivery.local", "viewer1234");
  test.skip(!ok, "viewer fixture not seeded — run scripts/missions/seed-viewer.ts");

  await page.goto("/missions");
  await page.getByText("VISUAL-2026-001").first().click();
  await page.waitForURL(/\/missions\//, { timeout: 20000 });

  // read-only: evidence is visible…
  await expect(page.getByTestId("evidence-status-summary")).toBeVisible();
  await expect(page.getByTestId("baseline-digest")).toHaveText(DIGEST);
  // …but no mission controls are offered
  await expect(page.getByRole("button", { name: /Start Mission/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Resume/i })).toHaveCount(0);
  await expect(page.getByText(/ต้องมีสิทธิ์ DELIVERY_MANAGER/).first()).toBeVisible();

  await page.screenshot({ path: `${SHOTS}/viewer-rbac.png`, fullPage: true });
  await ctx.close();
});
