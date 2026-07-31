import Link from "next/link";
import { Server, Building2, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { floorModule, RUNTIME_COLOR, RUNTIME_LABEL } from "@/lib/office-assets";
import { WorkerSprite, type SpriteWorker } from "./WorkerSprite";

export type TowerDept = { id: string; name: string; floorOrder: number; floorType: string; themeColor: string };
export type TowerWorker = SpriteWorker & { departmentId: string | null };

export function WorkerStatusIndicator({ status }: { status: string }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: RUNTIME_COLOR[status] ?? "#657A91" }} aria-hidden />;
}

// ---- roof cap (parapet + rooftop garden) ----
function TowerRoof({ label }: { label: string }) {
  return (
    <div className="relative h-11 overflow-hidden rounded-t-lg border-x border-t border-[#244768]"
      style={{ background: "linear-gradient(180deg,#35633f 0%,#274b32 45%,#1b2b3f 100%)" }}>
      <div className="absolute inset-x-0 bottom-0 h-3 bg-[#1b3350]" />
      <div className="absolute inset-0 flex items-center justify-between px-3">
        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-100/90">🌿 {label}</span>
        <span className="text-[10px] text-emerald-200/70">Rooftop</span>
      </div>
    </div>
  );
}

function FloorLabelTab({ order, name, color }: { order: number; name: string; color: string }) {
  return (
    <div className="flex w-[68px] shrink-0 flex-col items-center justify-center gap-0.5 border-r-2 px-1"
      style={{ borderColor: color, background: `linear-gradient(180deg, ${color}2e, ${color}12)` }}>
      <span className="font-pixel text-2xl font-black leading-none" style={{ color }}>{order}</span>
      <span className="text-center text-[8.5px] font-bold uppercase leading-tight text-[#9DB1C8]">{name}</span>
    </div>
  );
}

function DepartmentFloor({
  companyId, dept, workers, selected,
}: { companyId: string; dept: TowerDept; workers: TowerWorker[]; selected: boolean }) {
  const shown = workers.slice(0, 7);
  return (
    <Link
      href={`/companies/${companyId}/departments/${dept.id}`}
      aria-current={selected ? "true" : undefined}
      data-testid="dept-floor"
      data-floor-name={dept.name}
      className={cn(
        "group relative flex min-h-[172px] border-b border-[#244768] transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ABEF9]",
        selected && "ring-2 ring-inset ring-[#F0B84B]",
      )}
    >
      <FloorLabelTab order={dept.floorOrder} name={dept.name} color={dept.themeColor} />

      {/* isometric pixel-art room */}
      <div className="office-room relative min-w-0 flex-1 overflow-hidden">
        <img
          src={floorModule(dept.floorType, dept.name)}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-[center_46%] opacity-[0.97] transition duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        {/* readability scrim on top + bottom */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/55" />

        {/* department name + live worker count */}
        <div className="absolute left-2.5 top-2 flex items-center gap-2">
          <span className="rounded bg-black/60 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">{dept.name}</span>
          <span className="rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-medium text-slate-200">{workers.length} workers</span>
        </div>

        {/* real worker sprites — the live roster on this floor */}
        <div className="absolute inset-x-0 bottom-0 flex items-end gap-0.5 px-2 pb-1">
          {shown.length === 0 ? (
            <span className="mb-1 rounded bg-black/40 px-2 py-0.5 text-[10px] text-slate-400">ว่าง — ยังไม่มี worker</span>
          ) : (
            shown.map((w) => <WorkerSprite key={w.id} worker={w} size={58} />)
          )}
          {workers.length > 7 ? <span className="mb-2 ml-0.5 text-[11px] font-semibold text-slate-200">+{workers.length - 7}</span> : null}
        </div>
      </div>
    </Link>
  );
}

function ServerFloor({ companyId }: { companyId: string }) {
  return (
    <Link href="/infrastructure" className="group flex min-h-[76px] border-x border-b border-[#244768] transition hover:brightness-110">
      <div className="flex w-[68px] shrink-0 flex-col items-center justify-center border-r-2 border-[#243150] bg-[#0e1930]">
        <span className="font-pixel text-lg font-black text-[#3ABEF9]">B1</span>
        <span className="text-[8px] font-bold uppercase text-[#657A91]">Server</span>
      </div>
      <div className="server-floor relative flex min-w-0 flex-1 items-center gap-3 overflow-hidden rounded-b-lg px-4">
        <Server className="h-6 w-6 text-[#3ABEF9]" />
        <div className="min-w-0">
          <div className="text-sm font-bold text-white">VPS / Server</div>
          <div className="text-[10px] text-[#9DB1C8]">โครงสร้างพื้นฐาน · Compute · Storage</div>
        </div>
        <Cloud className="ml-auto h-6 w-6 text-[#3478F6]/70" />
      </div>
    </Link>
  );
}

export function TowerLegend() {
  const items = ["IDLE", "WORKING", "THINKING", "WAITING_APPROVAL", "ERROR", "OFFLINE"];
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#244768]/60 bg-[#0b1626] px-3 py-2 text-[11px] text-[#9DB1C8]">
      <span className="font-semibold text-[#657A91]">Worker Status:</span>
      {items.map((key) => (
        <span key={key} className="inline-flex items-center gap-1"><WorkerStatusIndicator status={key} />{RUNTIME_LABEL[key]}</span>
      ))}
    </div>
  );
}

export function OfficeTower({
  companyId, companyName, departments, workers, selectedDepartmentId,
}: {
  companyId: string;
  companyName?: string;
  departments: TowerDept[];
  workers: TowerWorker[];
  selectedDepartmentId?: string;
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
      {/* building unit — framed side walls give it a tower silhouette */}
      <div className="mx-auto w-full min-w-[560px] max-w-[760px] overflow-hidden rounded-lg border-x-2 border-[#1b3350] shadow-[0_0_50px_rgba(52,120,246,0.10)]">
        <TowerRoof label={companyName ?? "AI Office"} />
        {floors.map((d) => (
          <DepartmentFloor key={d.id} companyId={companyId} dept={d} workers={byDept.get(d.id) ?? []} selected={selectedDepartmentId === d.id} />
        ))}
        <ServerFloor companyId={companyId} />
        {/* foundation */}
        <div className="h-2.5 bg-gradient-to-b from-[#1b3350] to-[#0a1424]" />
      </div>
      <TowerLegend />
    </div>
  );
}
