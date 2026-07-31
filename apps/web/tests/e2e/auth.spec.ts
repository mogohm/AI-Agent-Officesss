import { test, expect } from "@playwright/test";

// Smoke: the app enforces auth and the health endpoints answer.
test("unauthenticated visit to a protected page redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: /เข้าสู่ระบบ|sign in/i })).toBeVisible();
});

test("liveness endpoint is ok", async ({ request }) => {
  const res = await request.get("/api/live");
  expect(res.ok()).toBeTruthy();
  expect(await res.json()).toMatchObject({ status: "ok" });
});

test("owner can log in with seeded credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(process.env.E2E_EMAIL || "owner@demo.local");
  await page.getByLabel(/password|รหัส/i).fill(process.env.E2E_PASSWORD || "demo1234");
  await page.getByRole("button", { name: /เข้าสู่ระบบ|sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});
