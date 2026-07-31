import Link from "next/link";
import { Server, Building2, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { floorBand, RUNTIME_COLOR, RUNTIME_LABEL } from "@/lib/office-assets";
import { WorkerSprite, type SpriteWorker } from "./WorkerSprite";

export type TowerDept = { id: string; name: string; floorOrder: number; floorType: string; themeColor: string };
export type TowerWorker = SpriteWorker & { departmentId: string | null };

const FLOOR_H = 108; // compact so a full 6-floor tower + B1 fits ~800px (Overview mode)
const WALL = "linear-gradient(90deg,#0a1526,#12243c 55%,#0a1526)";

export function WorkerStatusIndicator({ status }: { status: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: RUNTIME_COLOR[status] ?? "#657A91" }} aria-hidden />;
}

// ---------- shared building shell ----------
function TowerRoof({ label }: { label: string }) {
  return (
    <div className="relative h-10 overflow-hidden" style={{ background: "linear-gradient(180deg,#35633f,#274b32 55%,#1b2b3f)" }}>
      <div className="absolute inset-x-0 top-0 h-2.5" style={{ background: "repeating-linear-gradient(90deg,#3f7a4b 0 10px,#2f6140 10px 20px)" }} />
      <div className="absolute inset-x-0 bottom-0 h-2 bg-[#16283f]" />
      <div className="absolute inset-0 flex items-center justify-between px-4">
        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/90">🌿 {label}</span>
        <span className="text-[10px] text-emerald-200/70">Rooftop Garden</span>
      </div>
    </div>
  );
}

function TowerBase() {
  return <div className="h-3" style={{ background: "linear-gradient(180deg,#16283f,#0a1424)" }} />;
}

// ---------- department floor (one opening in the shell) ----------
function DepartmentFloorScene({ companyId, dept, workers, selected }: { companyId: string; dept: TowerDept; workers: TowerWorker[]; selected: boolean }) {
  const shown = workers.slice(0, 6);
  const activeGlow = (s: string) => s === "WORKING" || s === "THINKING";
  return (
    <Link
      href={`/companies/${companyId}/departments/${dept.id}`}
      aria-current={selected ? "true" : undefined}
      data-testid="dept-floor"
      data-floor-name={dept.name}
      className={cn("group relative flex overflow-hidden outline-none", selected && "ring-2 ring-inset ring-[#F0B84B]")}
      style={{ height: FLOOR_H }}
    >
      {/* left structural wall */}
      <span className="w-3 shrink-0" style={{ background: WALL }} aria-hidden />
      {/* room: painted interior art fills the shell opening edge-to-edge */}
      <span className="relative min-w-0 flex-1 overflow-hidden" style={{ background: `linear-gradient(180deg, ${dept.themeColor}26, #0c1a2c 62%)` }}>
        <img
          src={floorBand(dept.floorType, dept.name)}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-center opacity-90 transition duration-500 group-hover:opacity-100"
          loading="lazy"
        />
        {/* tint + readability scrim, keeps every floor on the same value range */}
        <span className="pointer-events-none absolute inset-0" style={{ background: `linear-gradient(180deg, ${dept.themeColor}33 0%, rgba(8,17,32,0.35) 55%, rgba(8,17,32,0.72) 100%)` }} aria-hidden />

        {/* department label chip */}
        <span className="absolute left-2.5 top-2 z-10 flex items-center gap-2 transition group-hover:brightness-125">
          <span className="rounded bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">{dept.name}</span>
        </span>

        {/* structural slab seam between floors (thin — the art supplies the floor) */}
        <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: "linear-gradient(180deg,#2b4569,#16283f)" }} aria-hidden />

        {/* real workers standing on the room's floor plane, spread across it */}
        <span className="absolute inset-x-0 bottom-1.5 flex items-end justify-evenly px-8">
          {shown.length === 0
            ? <span className="mb-2 rounded bg-black/45 px-1.5 text-[10px] text-slate-300/80">— ว่าง —</span>
            : shown.map((w) => (
              <span key={w.id} className="relative flex flex-col items-center drop-shadow-[0_3px_3px_rgba(0,0,0,0.6)]">
                <WorkerSprite worker={w} size={64} />
                {activeGlow(w.runtimeStatus) ? <span className="absolute -bottom-0.5 h-1 w-7 rounded-full bg-[#3ABEF9]/40 blur-[2px]" aria-hidden /> : null}
              </span>
            ))}
        </span>
        {workers.length > 6 ? <span className="absolute bottom-4 right-2 z-10 text-[10px] font-semibold text-slate-200">+{workers.length - 6}</span> : null}
      </span>
      {/* right structural wall */}
      <span className="w-3 shrink-0" style={{ background: WALL }} aria-hidden />
    </Link>
  );
}

function ServerFloorScene() {
  return (
    <Link href="/infrastructure" className="group relative flex overflow-hidden" style={{ height: 84 }}>
      <span className="w-3 shrink-0" style={{ background: WALL }} aria-hidden />
      <span className="server-floor relative flex min-w-0 flex-1 items-center gap-3 px-5">
        <Server className="h-6 w-6 text-[#3ABEF9]" />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-white">VPS / Server</span>
          <span className="block text-[10px] text-[#9DB1C8]">โครงสร้างพื้นฐาน · Compute · Storage</span>
        </span>
        <Cloud className="ml-auto h-6 w-6 text-[#3478F6]/70" />
      </span>
      <span className="w-3 shrink-0" style={{ background: WALL }} aria-hidden />
    </Link>
  );
}

// ---------- floor label column (outside the shell, constant width) ----------
function FloorLabelTab({ order, name, color, count, height }: { order: number | string; name: string; color: string; count?: number; height: number }) {
  return (
    <div className="flex w-[74px] shrink-0 flex-col items-center justify-center gap-0.5 border-r-2 px-1 text-center"
      style={{ height, borderColor: color, background: `linear-gradient(180deg, ${color}2e, ${color}10)` }}>
      <span className="font-pixel text-xl font-black leading-none" style={{ color }}>{order}</span>
      <span className="line-clamp-1 text-[8.5px] font-bold uppercase leading-tight text-[#9DB1C8]">{name}</span>
      {count !== undefined ? <span className="text-[8px] text-[#657A91]">{count} worker</span> : null}
    </div>
  );
}

export function TowerStatusLegend() {
  const items = ["IDLE", "WORKING", "THINKING", "WAITING_APPROVAL", "ERROR", "OFFLINE"];
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#244768]/60 bg-[#0b1626] px-3 py-2 text-[11px] text-[#9DB1C8]">
      <span className="font-semibold text-[#657A91]">สถานะ worker:</span>
      {items.map((key) => <span key={key} className="inline-flex items-center gap-1"><WorkerStatusIndicator status={key} />{RUNTIME_LABEL[key]}</span>)}
    </div>
  );
}

// ---------- assembled tower ----------
export function OfficeTower({ companyId, companyName, departments, workers, selectedDepartmentId }: {
  companyId: string; companyName?: string; departments: TowerDept[]; workers: TowerWorker[]; selectedDepartmentId?: string;
}) {
  const floors = [...departments].sort((a, b) => b.floorOrder - a.floorOrder);
  const byDept = new Map<string, TowerWorker[]>();
  for (const w of workers) {
    if (!w.departmentId) continue;
    const arr = byDept.get(w.departmentId) ?? [];
    arr.push(w);
    byDept.set(w.departmentId, arr);
  }

  if (floors.length === 0) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-[#244768] py-12 text-center">
        <Building2 className="mb-2 h-9 w-9 text-[#657A91]" />
        <div className="text-sm text-[#9DB1C8]">ยังไม่มีแผนก — เพิ่มแผนกเพื่อสร้างชั้นแรกของตึก</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-center">
        <div className="flex">
          {/* label column */}
          <div className="shrink-0">
            <div style={{ height: 40 }} />
            {floors.map((d) => (
              <FloorLabelTab key={d.id} order={d.floorOrder} name={d.name} color={d.themeColor} count={(byDept.get(d.id) ?? []).length} height={FLOOR_H} />
            ))}
            <FloorLabelTab order="B1" name="Server" color="#243150" height={84} />
          </div>
          {/* building shell */}
          <div className="w-full min-w-[440px] max-w-[720px] overflow-hidden rounded-b-md border-x-2 border-[#16283f] shadow-[0_0_50px_rgba(52,120,246,0.10)]">
            <TowerRoof label={companyName ?? "AI Office"} />
            {floors.map((d) => (
              <DepartmentFloorScene key={d.id} companyId={companyId} dept={d} workers={byDept.get(d.id) ?? []} selected={selectedDepartmentId === d.id} />
            ))}
            <ServerFloorScene />
            <TowerBase />
          </div>
        </div>
      </div>
      <TowerStatusLegend />
    </div>
  );
}
