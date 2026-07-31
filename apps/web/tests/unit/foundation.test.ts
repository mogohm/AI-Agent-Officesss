import { describe, it, expect } from "vitest";
import { slugify, isValidSlug, uniqueSlug } from "@/lib/slug";
import { computeCost } from "@/lib/pricing";
import { canTransition, isTerminal } from "@/lib/task-state";
import { ROLE_RANK, roleAtLeast } from "@/lib/roles";

describe("slug", () => {
  it("slugifies names", () => {
    expect(slugify("IT / Dev")).toBe("it-dev");
    expect(slugify("  Hello  World!! ")).toBe("hello-world");
    expect(slugify("")).toBe("item");
  });
  it("validates slug format", () => {
    expect(isValidSlug("company-a")).toBe(true);
    expect(isValidSlug("Company_A")).toBe(false);
    expect(isValidSlug("-bad-")).toBe(false);
  });
  it("makes unique slugs", async () => {
    const taken = new Set(["it-dev", "it-dev-2"]);
    const s = await uniqueSlug("IT / Dev", async (x) => taken.has(x));
    expect(s).toBe("it-dev-3");
  });
});

describe("pricing", () => {
  it("computes cost from tokens", () => {
    const c = computeCost(1000, 500, 0.005, 0.015);
    expect(c.inputCost).toBeCloseTo(0.005, 6);
    expect(c.outputCost).toBeCloseTo(0.0075, 6);
    expect(c.totalCost).toBeCloseTo(0.0125, 6);
  });
  it("handles zero", () => {
    expect(computeCost(0, 0, 0, 0).totalCost).toBe(0);
  });
});

describe("task state machine", () => {
  it("allows valid transitions", () => {
    expect(canTransition("DRAFT", "QUEUED")).toBe(true);
    expect(canTransition("QUEUED", "RUNNING")).toBe(true);
    expect(canTransition("RUNNING", "WAITING_APPROVAL")).toBe(true);
    expect(canTransition("WAITING_APPROVAL", "APPROVED")).toBe(true);
    expect(canTransition("FAILED", "QUEUED")).toBe(true);
  });
  it("rejects invalid transitions", () => {
    expect(canTransition("COMPLETED", "RUNNING")).toBe(false);
    expect(canTransition("DRAFT", "COMPLETED")).toBe(false);
    expect(canTransition("CANCELLED", "QUEUED")).toBe(false);
  });
  it("knows terminal states", () => {
    expect(isTerminal("COMPLETED")).toBe(true);
    expect(isTerminal("RUNNING")).toBe(false);
  });
});

describe("rbac ranks", () => {
  it("orders roles", () => {
    expect(ROLE_RANK.OWNER).toBeGreaterThan(ROLE_RANK.ADMIN);
    expect(ROLE_RANK.ADMIN).toBeGreaterThan(ROLE_RANK.VIEWER);
    expect(roleAtLeast("MANAGER", "OPERATOR")).toBe(true);
    expect(roleAtLeast("VIEWER", "MANAGER")).toBe(false);
  });
});
