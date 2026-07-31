import { test, Page } from "@playwright/test";
import fs from "node:fs";

const SHOTS = "visual-screenshots";
const COMPANY_A = process.env.COMPANY_A || "cms6a26620006qqt0k58dxm7g";
fs.mkdirSync(SHOTS, { recursive: true });

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#email", "owner@demo.local");
  await page.fill("#password", "demo1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
}

test.use({ viewport: { width: 1920, height: 1080 } });

test("visual capture", async ({ page }) => {
  test.setTimeout(180000);
  await login(page);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/dashboard-1920.png`, fullPage: true });

  await page.goto(`/companies/${COMPANY_A}`);
  await page.waitForTimeout(2500); // let floor/sprite images load
  await page.screenshot({ path: `${SHOTS}/company-office-1920.png`, fullPage: true });

  await page.goto("/workers");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SHOTS}/workers-1920.png`, fullPage: true });
});
