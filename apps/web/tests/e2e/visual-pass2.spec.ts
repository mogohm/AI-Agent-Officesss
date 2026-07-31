import { test, Page } from "@playwright/test";
import fs from "node:fs";

const SHOTS = "../../outputs/screenshots/visual-pass-2";
const COMPANY_A = process.env.COMPANY_A || "cms6a26620006qqt0k58dxm7g";
fs.mkdirSync(SHOTS, { recursive: true });

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#email", "owner@demo.local");
  await page.fill("#password", "demo1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
}

const PAGES: [string, string, number][] = [
  ["/dashboard", "dashboard", 1500],
  ["/companies", "companies", 1200],
  [`/companies/${COMPANY_A}`, "company-office", 2200],
  ["/workers", "workers", 1500],
];

for (const [w, h] of [[1920, 1080], [1600, 900], [1440, 900], [390, 844]] as [number, number][]) {
  test(`capture ${w}x${h}`, async ({ browser }) => {
    test.setTimeout(180000);
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await login(page);
    for (const [route, name, wait] of PAGES) {
      await page.goto(route);
      await page.waitForTimeout(wait);
      // viewport shot proves above-the-fold fit; full-page shot shows everything
      await page.screenshot({ path: `${SHOTS}/${name}-${w}x${h}.png` });
      if (w === 1920) await page.screenshot({ path: `${SHOTS}/${name}-${w}-full.png`, fullPage: true });
    }
    await ctx.close();
  });
}
