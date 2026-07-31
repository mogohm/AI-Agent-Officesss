import { test, Page } from "@playwright/test";
import fs from "node:fs";

const SHOTS = "visual-screenshots";
const COMPANY_A = "cms6a26620006qqt0k58dxm7g";
const DEPT = process.env.DEPT_ID || "cms6a266d000gqqt0f7ntpjf6";
fs.mkdirSync(SHOTS, { recursive: true });

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#email", "owner@demo.local");
  await page.fill("#password", "demo1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30000 });
}

test.use({ viewport: { width: 1920, height: 1080 } });

test("secondary visual capture", async ({ page }) => {
  test.setTimeout(180000);
  await login(page);
  for (const [route, name, wait] of [
    [`/companies/${COMPANY_A}/departments/${DEPT}`, "department-1920", 2500],
    ["/projects", "projects-1920", 1500],
    ["/infrastructure", "infrastructure-1920", 1500],
    ["/activity", "activity-1920", 1500],
  ] as [string, string, number][]) {
    await page.goto(route);
    await page.waitForTimeout(wait);
    await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
  }
});
