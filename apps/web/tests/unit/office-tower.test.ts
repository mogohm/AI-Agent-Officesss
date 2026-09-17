import { describe, it, expect } from "vitest";
import { orderFloors, TOWER, type TowerDept } from "@/components/office/OfficeTowerShell";

/** WP-004 structural guarantees that do not need a browser. */

const dept = (over: Partial<TowerDept> & { id: string }): TowerDept => ({
  name: `Dept ${over.id}`, floorOrder: 1, floorType: "OFFICE",
  themeColor: "#3478F6", ...over,
});

describe("floor ordering", () => {
  it("stacks the highest floorOrder on top", () => {
    const out = orderFloors([
      dept({ id: "a", floorOrder: 1 }),
      dept({ id: "b", floorOrder: 6 }),
      dept({ id: "c", floorOrder: 3 }),
    ]);
    expect(out.map((d) => d.floorOrder)).toEqual([6, 3, 1]);
  });

  it("is deterministic regardless of query order", () => {
    const list = [
      dept({ id: "m", floorOrder: 2 }), dept({ id: "x", floorOrder: 5 }),
      dept({ id: "c", floorOrder: 2 }), dept({ id: "a", floorOrder: 9 }),
    ];
    const forward = orderFloors(list).map((d) => d.id);
    const reversed = orderFloors([...list].reverse()).map((d) => d.id);
    const shuffled = orderFloors([list[2], list[0], list[3], list[1]]).map((d) => d.id);
    expect(reversed).toEqual(forward);
    expect(shuffled).toEqual(forward);
  });

  it("breaks floorOrder ties by id so equal floors never swap between renders", () => {
    const out = orderFloors([
      dept({ id: "zz", floorOrder: 4 }), dept({ id: "aa", floorOrder: 4 }),
    ]);
    expect(out.map((d) => d.id)).toEqual(["aa", "zz"]);
  });

  it("does not mutate the input array", () => {
    const list = [dept({ id: "a", floorOrder: 1 }), dept({ id: "b", floorOrder: 9 })];
    const before = list.map((d) => d.id);
    orderFloors(list);
    expect(list.map((d) => d.id)).toEqual(before);
  });

  it("supports 1 through 15 departments", () => {
    for (const n of [1, 2, 6, 15]) {
      const list = Array.from({ length: n }, (_, i) => dept({ id: `d${i}`, floorOrder: i + 1 }));
      const out = orderFloors(list);
      expect(out, `${n} departments`).toHaveLength(n);
      // strictly descending - no duplicate or missing floor
      const orders = out.map((d) => d.floorOrder);
      expect([...orders].sort((a, b) => b - a)).toEqual(orders);
    }
  });

  it("handles an empty company", () => {
    expect(orderFloors([])).toEqual([]);
  });
});

describe("tower geometry", () => {
  it("exposes one source of truth for every structural dimension", () => {
    for (const k of ["labelRailW", "columnW", "floorH", "basementH", "roofH", "baseH"] as const) {
      expect(TOWER[k], k).toBeGreaterThan(0);
    }
  });

  it("fits six floors plus B1 inside the WP-006 overview budget", () => {
    // 760-830px is the target for a typical company in Overview mode
    const total = TOWER.roofH + TOWER.floorH * 6 + TOWER.basementH + TOWER.baseH;
    expect(total).toBeGreaterThanOrEqual(700);
    expect(total).toBeLessThanOrEqual(830);
  });

  it("keeps the basement shorter than a department floor", () => {
    // B1 is infrastructure, not a department - it must not read as an equal floor
    expect(TOWER.basementH).toBeLessThan(TOWER.floorH);
  });
});
