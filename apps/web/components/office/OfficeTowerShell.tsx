import Link from "next/link";
import { Server, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveDepartmentFloor } from "@/lib/visual-assets";
import { WorkerSprite, type SpriteWorker } from "./WorkerSprite";

/**
 * Continuous office tower shell (WP-004).
 *
 * The building must read as ONE structure, not a vertical list of room cards.
 * That is guaranteed structurally rather than by eye: the left and right columns,
 * the label rail and the outer frame are each a SINGLE absolutely-positioned
 * element spanning the whole body, so every floor is bounded by the same pixels.
 * Per-floor borders cannot drift because there are none.
 *
 * Floor art comes from the canonical registry (empty rooms). Workers are
 * composited on top by the caller's data — never baked into the artwork, which
 * is what WP-001 rejected the previous art for.
 */

/** Single source of geometry. Tests assert against these exact numbers. */
export const TOWER = {
  labelRailW: 72,
  columnW: 10,
  floorH: 104,
  basementH: 84,
  roofH: 44,
  baseH: 18,
  minBodyW: 420,
  maxBodyW: 760,
} as const;

export type TowerDept = {
  id: string;
  name: string;
  floorOrder: number;
  floorType: string;
  themeColor: string;
  slug?: string | null;
};
export type TowerWorker = SpriteWorker & { departmentId: string | null };

/**
 * Deterministic floor order: highest floorOrder on top, ties broken by id so the
 * same departments always stack the same way regardless of query order.
 */
export function orderFloors(departments: TowerDept[]): TowerDept[] {
  return [...departments].sort((a, b) =>
    b.floorOrder - a.floorOrder || a.id.localeCompare(b.id));
}

// ----------------------------------------------------------------- structure

function TowerRoof({ label }: { label: string }) {
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ height: TOWER.roofH }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#2f5b3c,#24452e 55%,#18283a)" }} />
      <div className="absolute inset-x-0 top-0 h-2.5" style={{ background: "repeating-linear-gradient(90deg,#3f7a4b 0 10px,#2f6140 10px 20px)" }} />
      {/* parapet: the roof sits ON the columns, so it reads as one structure */}
      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-[#16283f]" />
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <span className="truncate text-[11px] font-bold uppercase tracking-wide text-emerald-100/90">{label}</span>
        <span className="shrink-0 text-[10px] text-emerald-200/70">Rooftop Garden</span>
      </div>
    </div>
  );
}

function TowerBase() {
  return (
    <div className="relative shrink-0" style={{ height: TOWER.baseH }}>
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#1b3050,#0a1424)" }} />
      {/* ground line, flush with the columns above it */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-[#2b4569]" />
    </div>
  );
}

/** The floor's own label cell. Workers are never rendered here (spec §14). */
function FloorLabel({ order, name, color, count, height }: {
  order: number | string; name: string; color: string; count?: number; height: number;
}) {
  return (
    <div
      data-testid="floor-label"
      className="flex flex-col items-center justify-center gap-0.5 px-1 text-center"
      style={{ width: TOWER.labelRailW, height, background: `linear-gradient(180deg, ${color}2e, ${color}10)` }}
    >
      <span className="font-pixel text-xl font-black leading-none" style={{ color }}>{order}</span>
      <span className="line-clamp-1 text-[8.5px] font-bold uppercase leading-tight text-[#9DB1C8]">{name}</span>
      {count !== undefined ? <span className="text-[8px] text-[#657A91]">{count} worker</span> : null}
    </div>
  );
}

/**
 * One opening cut into the shell. It never draws its own left/right border —
 * the continuous columns supply those, which is why floors cannot misalign.
 */
function TowerFloorOpening({ companyId, dept, workers, selected }: {
  companyId: string; dept: TowerDept; workers: TowerWorker[]; selected: boolean;
}) {
  const floor = resolveDepartmentFloor({
    floorType: dept.floorType, name: dept.name, slug: dept.slug ?? null,
  });
  const shown = workers.slice(0, 6);

  return (
    <div
      data-testid="tower-floor"
      data-floor-name={dept.name}
      data-floor-order={dept.floorOrder}
      data-floor-variant={floor.variant}
      className="relative flex"
      style={{ height: TOWER.floorH }}
    >
      <FloorLabel order={dept.floorOrder} name={dept.name} color={dept.themeColor} count={workers.length} height={TOWER.floorH} />

      <Link
        href={`/companies/${companyId}/departments/${dept.id}`}
        aria-current={selected ? "true" : undefined}
        aria-label={`${dept.name} — ${workers.length} worker`}
        data-testid="floor-opening"
        className={cn(
          "group relative min-w-0 flex-1 overflow-hidden outline-none",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3ABEF9]",
          selected && "ring-2 ring-inset ring-[#F0B84B]",
        )}
        style={{ marginLeft: TOWER.columnW, marginRight: TOWER.columnW }}
      >
        <img
          src={floor.src}
          alt=""
          aria-hidden
          width={1600}
          height={600}
          style={{ objectPosition: "center 72%" }}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:brightness-110"
        />
        {/* Department identity is carried by a thin accent edge, NOT a colour
            wash: a full-surface tint at any useful opacity buries the pixel art
            the floor exists to show. A mild bottom scrim keeps the label and
            worker sprites legible without touching the upper room. */}
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-[3px] z-[1]"
          style={{ background: dept.themeColor }}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(180deg, ${dept.themeColor}14 0%, rgba(8,17,32,0.20) 40%, rgba(8,17,32,0.62) 100%)` }}
          aria-hidden
        />
        <span className="absolute left-2.5 top-2 z-10">
          <span className="rounded bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">{dept.name}</span>
        </span>

        {/* workers stand on the floor plane inside the opening, never in the rail */}
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-evenly px-8">
          {shown.length === 0 ? (
            <span className="mb-2 rounded bg-black/45 px-1.5 text-[10px] text-slate-300/80">— ว่าง —</span>
          ) : shown.map((w) => (
            <span key={w.id} className="drop-shadow-[0_3px_3px_rgba(0,0,0,0.6)]">
              <WorkerSprite worker={w} size={58} />
            </span>
          ))}
        </span>
        {workers.length > 6 ? (
          <span className="absolute bottom-3 right-2 z-10 text-[10px] font-semibold text-slate-200">+{workers.length - 6}</span>
        ) : null}
      </Link>
    </div>
  );
}

/** B1 is infrastructure, not a department — it is never counted as a floor. */
function BasementOpening() {
  return (
    <div data-testid="tower-basement" className="relative flex" style={{ height: TOWER.basementH }}>
      <FloorLabel order="B1" name="Server" color="#243150" height={TOWER.basementH} />
      <Link
        href="/infrastructure"
        aria-label="VPS / Server — โครงสร้างพื้นฐาน"
        className="group relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden px-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3ABEF9]"
        style={{ marginLeft: TOWER.columnW, marginRight: TOWER.columnW, background: "linear-gradient(180deg,#0d1b2e,#0a1424)" }}
      >
        <Server className="h-6 w-6 shrink-0 text-[#3ABEF9]" />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-white">VPS / Server</span>
          <span className="block truncate text-[10px] text-[#9DB1C8]">โครงสร้างพื้นฐาน · Compute · Storage</span>
        </span>
        <Cloud className="ml-auto h-6 w-6 shrink-0 text-[#3478F6]/70" />
      </Link>
    </div>
  );
}

// ------------------------------------------------------------------- shell

export function OfficeTowerShell({ companyId, companyName, departments, workers, selectedDepartmentId }: {
  companyId: string;
  companyName?: string;
  departments: TowerDept[];
  workers: TowerWorker[];
  selectedDepartmentId?: string;
}) {
  const floors = orderFloors(departments);
  const byDept = new Map<string, TowerWorker[]>();
  for (const w of workers) {
    if (!w.departmentId) continue;
    byDept.set(w.departmentId, [...(byDept.get(w.departmentId) ?? []), w]);
  }

  return (
    <div
      data-testid="office-tower"
      data-floor-count={floors.length}
      className="mx-auto w-full overflow-hidden rounded-b-md shadow-[0_0_50px_rgba(52,120,246,0.10)]"
      style={{ minWidth: TOWER.minBodyW, maxWidth: TOWER.maxBodyW }}
    >
      <TowerRoof label={companyName ?? "AI Office"} />

      {/* body: the columns below are single elements spanning every floor, so
          the left and right building edges are one line by construction */}
      <div className="relative">
        <span
          data-testid="tower-column-left"
          className="pointer-events-none absolute inset-y-0 z-10"
          style={{ left: TOWER.labelRailW, width: TOWER.columnW, background: "linear-gradient(90deg,#0a1526,#20395c 55%,#0a1526)" }}
          aria-hidden
        />
        <span
          data-testid="tower-column-right"
          className="pointer-events-none absolute inset-y-0 right-0 z-10"
          style={{ width: TOWER.columnW, background: "linear-gradient(90deg,#0a1526,#20395c 45%,#0a1526)" }}
          aria-hidden
        />
        {/* continuous rail edge — one line, not a border per label cell */}
        <span
          className="pointer-events-none absolute inset-y-0 z-10 w-[2px] bg-[#2b4569]"
          style={{ left: TOWER.labelRailW - 2 }}
          aria-hidden
        />

        {floors.map((d) => (
          <TowerFloorOpening
            key={d.id}
            companyId={companyId}
            dept={d}
            workers={byDept.get(d.id) ?? []}
            selected={selectedDepartmentId === d.id}
          />
        ))}
        <BasementOpening />
      </div>

      <TowerBase />
    </div>
  );
}
