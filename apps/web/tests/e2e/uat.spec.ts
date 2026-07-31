import { test, expect, Page } from "@playwright/test";
import fs from "node:fs";

// End-to-end UAT against the running app with REAL database mutations.
// Task execution is real: the worker calls a local mock OpenAI-compatible
// server (see scripts/mock-llm.mjs) so TaskRuns / usage / approvals are genuine.

const OWNER = { email: "owner@demo.local", password: "demo1234" };
const SHOTS = "uat-screenshots";
const stamp = Date.now();
const COMPANY = `UAT Corp ${stamp}`;
const IT_DEPT = "IT / Development";
const DEPTS = [IT_DEPT, "Design", "Marketing", "Support"];

fs.mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });

// shared across the serial suite
const ctx: { companyId?: string; taskId?: string; approvalTaskId?: string } = {};

async function login(page: Page, email = OWNER.email, password = OWNER.password) {
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

// Reload the current task page until the status badge shows `text` (or throw).
async function waitForStatus(page: Page, text: RegExp, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await page.getByText(text).first().isVisible().catch(() => false)) return true;
    await page.waitForTimeout(2000);
    await page.reload();
  }
  return false;
}

test.describe.configure({ mode: "serial" });

test("01 · owner login + dashboard", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();
  await shot(page, "01-dashboard");
});

test("02 · create company + persists after reload", async ({ page }) => {
  await login(page);
  await page.goto("/companies/new");
  await page.fill("#name", COMPANY);
  await page.getByRole("button", { name: "สร้างบริษัท" }).click();
  // NOTE: require a cuid-length id so we don't match "/companies/new" itself.
  await page.waitForURL(/\/companies\/[a-z0-9]{20,}$/i, { timeout: 20000 });
  ctx.companyId = page.url().split("/").pop()!;
  expect(ctx.companyId).toBeTruthy();
  await shot(page, "02-company-page");
  // persistence: appears in the list on a fresh navigation
  await page.goto("/companies");
  await expect(page.getByText(COMPANY).first()).toBeVisible();
});

test("03 · create 4 departments → 4 floors render", async ({ page }) => {
  await login(page);
  for (const name of DEPTS) {
    await page.goto(`/companies/${ctx.companyId}/departments/new`);
    await page.fill("#name", name);
    await page.getByRole("button", { name: "สร้างแผนก" }).click();
    await page.waitForTimeout(1500);
  }
  await page.goto(`/companies/${ctx.companyId}`);
  await expect(page.locator('[data-testid="dept-floor"]')).toHaveCount(4);
  await shot(page, "03-office-tower-4-floors");
});

const floorNames = (page: Page) =>
  page.locator('[data-testid="dept-floor"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-floor-name")));

test("04 · reorder department persists after reload", async ({ page }) => {
  await login(page);
  await page.goto(`/companies/${ctx.companyId}`);
  const before = await floorNames(page);
  // reorder on the departments list, move the top floor down one slot
  await page.goto(`/companies/${ctx.companyId}/departments`);
  await page.getByRole("button", { name: "ย้ายลง" }).first().click();
  await page.waitForTimeout(1500);
  await page.waitForTimeout(1200);
  // fresh DB-backed read from the tower (full navigation, not just reload)
  await page.goto(`/companies/${ctx.companyId}`);
  const after = await floorNames(page);
  expect(after).not.toEqual(before);              // order actually changed
  expect(new Set(after)).toEqual(new Set(before)); // same 4 departments
  await shot(page, "04-after-reorder");
});

test("05 · create worker on IT/Development → appears on that floor", async ({ page }) => {
  await login(page);
  await page.goto(`/workers/new?companyId=${ctx.companyId}`);
  await page.fill("#name", "Ada UAT");
  await page.fill("#role", "Engineer").catch(() => {});
  await page.selectOption("#departmentId", { label: IT_DEPT });
  await page.getByRole("button", { name: /สร้าง|บันทึก/ }).first().click();
  await page.waitForTimeout(1500);
  await page.goto(`/companies/${ctx.companyId}`);
  const itFloor = page.locator(`[data-testid="dept-floor"][data-floor-name="${IT_DEPT}"]`);
  await expect(itFloor).toContainText(/1 workers|Ada/i);
  await shot(page, "05-worker-on-floor");
  await page.goto("/workers");
  await shot(page, "05-workers-list");
});

test("06 · create project", async ({ page }) => {
  await login(page);
  await page.goto(`/companies/${ctx.companyId}/projects/new`);
  await page.fill("#name", `UAT Project ${stamp}`);
  await page.getByRole("button", { name: /สร้าง|บันทึก/ }).first().click();
  await page.waitForTimeout(1500);
  await page.goto("/projects");
  await expect(page.getByText(`UAT Project ${stamp}`).first()).toBeVisible();
  await shot(page, "06-projects");
});

test("07 · create task → queue → executes → COMPLETED + TaskRun", async ({ page }) => {
  await login(page);
  await page.goto(`/tasks/new?companyId=${ctx.companyId}`);
  await page.fill("#title", `UAT Task ${stamp}`);
  await page.fill("#instruction", "สรุปข้อความทดสอบ UAT ให้หน่อย");
  await page.selectOption("#workerId", { label: "Ada UAT" }).catch(() => {});
  await page.getByRole("button", { name: "สร้างงาน (Draft)" }).click();
  await page.waitForURL(/\/tasks\/[a-z0-9]{20,}$/i, { timeout: 20000 });
  ctx.taskId = page.url().split("/").pop()!;
  // queue it (ConfirmButton → modal confirm)
  await page.getByRole("button", { name: "เข้าคิว (Queue)" }).click();
  await page.getByRole("button", { name: "เข้าคิว", exact: true }).click();
  const done = await waitForStatus(page, /completed/i, 50000);
  expect(done).toBeTruthy();
  await expect(page.getByText(/Run History \(1\)|Run History \([1-9]/)).toBeVisible();
  await shot(page, "07-task-completed");
});

const REVIEWER = { email: `reviewer${stamp}@uat.local`, password: "reviewer1234" };

test("08 · approval flow: self-approval blocked, another user approves → COMPLETED", async ({ page, browser }) => {
  await login(page);
  // create an approval-required task, assigned to Ada, and queue it
  await page.goto(`/tasks/new?companyId=${ctx.companyId}`);
  await page.fill("#title", `UAT Approval Task ${stamp}`);
  await page.fill("#instruction", "งานที่ต้องขออนุมัติก่อน");
  await page.selectOption("#workerId", { label: "Ada UAT" }).catch(() => {});
  await page.check('input[type="checkbox"]').catch(() => {});
  await page.getByRole("button", { name: "สร้างงาน (Draft)" }).click();
  await page.waitForURL(/\/tasks\/[a-z0-9]{20,}$/i, { timeout: 20000 });
  ctx.approvalTaskId = page.url().split("/").pop()!;
  await page.getByRole("button", { name: "เข้าคิว (Queue)" }).click();
  await page.getByRole("button", { name: "เข้าคิว", exact: true }).click();
  // Poll the PENDING inbox directly until the approval lands (worker runs the
  // task, then creates the approval). Don't match status text on the task page —
  // the sidebar contains the word "Approvals" and yields false positives.
  const approvalLink = () => page.getByText(new RegExp(`UAT Approval Task ${stamp}`)).first();
  let seen = false;
  for (let i = 0; i < 30 && !seen; i++) {
    await page.goto("/approvals?status=PENDING");
    seen = await approvalLink().isVisible().catch(() => false);
    if (!seen) await page.waitForTimeout(2000);
  }
  expect(seen).toBeTruthy();
  await shot(page, "08a-approval-pending");

  // the OWNER created the task → must NOT be able to self-approve
  await approvalLink().click();
  await expect(page.getByText(/ไม่สามารถอนุมัติเองได้|self-approval|ผู้สร้างงานนี้/i)).toBeVisible();
  await shot(page, "08b-self-approval-blocked");

  // create a second user (MANAGER) via the Users admin UI, scoped to our company card
  await page.goto("/settings/users");
  // COMPANY name is unique (timestamped) → exactly one member card matches
  const card = page.locator("div.rounded-lg").filter({ hasText: COMPANY });
  await card.getByRole("button", { name: /สร้างผู้ใช้ใหม่/ }).click();
  await card.locator('input[name="name"]').fill("Reviewer UAT");
  await card.locator('input[name="email"]').fill(REVIEWER.email);
  await card.locator('input[name="password"]').fill(REVIEWER.password);
  await card.locator('select[name="role"]').selectOption("MANAGER");
  await card.getByRole("button", { name: /สร้างและเพิ่ม/ }).click();
  await page.waitForTimeout(1500);

  // reviewer logs in (fresh context) and approves
  const rc = await browser.newContext();
  const rp = await rc.newPage();
  await login(rp, REVIEWER.email, REVIEWER.password);
  await rp.goto("/approvals?status=PENDING");
  await rp.getByText(new RegExp(`UAT Approval Task ${stamp}`)).first().click();
  await rp.getByRole("button", { name: "อนุมัติ", exact: true }).click();
  await rp.waitForTimeout(2000);
  await rp.screenshot({ path: `${SHOTS}/08c-reviewer-approved.png`, fullPage: true });
  await rc.close();

  // task now completes
  await page.goto(`/tasks/${ctx.approvalTaskId}`);
  expect(await waitForStatus(page, /completed/i, 20000)).toBeTruthy();
  await shot(page, "08d-task-completed-after-approval");
});

test("09 · usage + activity recorded from real runs", async ({ page }) => {
  await login(page);
  await page.goto("/usage");
  await expect(page.getByText(/ต้นทุนรวมเดือนนี้|Usage/i).first()).toBeVisible();
  await shot(page, "09-usage");
  await page.goto("/activity");
  await expect(page.getByText(/task\.|company\.|member\.|เสร็จงาน|สร้าง/i).first()).toBeVisible();
  await shot(page, "09-activity");
});

test("10 · screenshots of remaining major pages", async ({ page }) => {
  await login(page);
  for (const [route, name] of [
    ["/infrastructure", "10-infrastructure"], ["/approvals", "10-approvals"],
    ["/knowledge", "10-knowledge"], ["/settings", "10-settings"],
    ["/settings/providers", "10-providers"], ["/settings/users", "10-users"],
    ["/tasks", "10-tasks"],
  ] as const) {
    await page.goto(route);
    await page.waitForTimeout(1500);
    await shot(page, name);
  }
});

test("11 · API error states", async ({ page, request }) => {
  await login(page);
  // authenticated request for a missing resource → 404 (page.request carries the session)
  const missing = await page.request.get("/api/tasks/nonexistent123/status");
  expect(missing.status()).toBe(404);
  // unauthenticated request to a protected API is bounced to /login (never 200 JSON of the resource)
  const unauth = await request.get("/api/tasks/nonexistent123/status", { maxRedirects: 0 });
  expect([302, 307, 401, 403]).toContain(unauth.status());
  // health probes are public and OK
  expect((await request.get("/api/live")).ok()).toBeTruthy();
  expect((await request.get("/api/ready")).ok()).toBeTruthy();
});

test("12 · unauthenticated access redirects to login", async ({ browser }) => {
  const fresh = await browser.newContext();
  const p = await fresh.newPage();
  await p.goto("/dashboard");
  await expect(p).toHaveURL(/\/login/);
  await fresh.close();
});

test("13 · mobile viewport", async ({ browser }) => {
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await mobile.newPage();
  await login(p);
  await p.goto("/dashboard");
  await p.screenshot({ path: `${SHOTS}/13-mobile-dashboard.png`, fullPage: true });
  await mobile.close();
});
