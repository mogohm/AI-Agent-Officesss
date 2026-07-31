import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";

// DB-gated: runs only when a real database is reachable. Enable in CI/deploy
// with RUN_DB_TESTS=1 after `prisma migrate deploy && prisma db seed`.
// Kept out of `npm run verify` so unit checks stay hermetic.
const ENABLED = process.env.RUN_DB_TESTS === "1";
const d = describe.runIf(ENABLED);

const prisma = new PrismaClient();

describe("integration harness", () => {
  it("is skipped unless RUN_DB_TESTS=1", () => {
    expect(true).toBe(true);
  });
});

d("database schema + seed", () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("seed created the super-admin and demo companies", async () => {
    const owner = await prisma.user.findFirst({ where: { email: "owner@demo.local" } });
    expect(owner?.globalRole).toBe("SUPER_ADMIN");
    const companies = await prisma.company.count();
    expect(companies).toBeGreaterThanOrEqual(4);
  });

  it("enforces the department floor-order unique constraint per company", async () => {
    const company = await prisma.company.findFirstOrThrow();
    const dupe = prisma.department.create({
      data: { companyId: company.id, name: "z-dupe", slug: `z-dupe-${Date.now()}`, floorOrder: 1, floorType: "OFFICE" },
    });
    // floorOrder 1 already used by a seeded department -> unique violation.
    await expect(dupe).rejects.toBeTruthy();
  });

  it("round-trips a task through a valid state transition", async () => {
    const company = await prisma.company.findFirstOrThrow();
    const task = await prisma.agentTask.create({
      data: { companyId: company.id, title: "itest", instruction: "hi", status: "DRAFT" },
    });
    const updated = await prisma.agentTask.update({ where: { id: task.id }, data: { status: "QUEUED", scheduledAt: new Date() } });
    expect(updated.status).toBe("QUEUED");
    await prisma.agentTask.delete({ where: { id: task.id } });
  });
});
