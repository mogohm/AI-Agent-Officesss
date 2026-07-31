import Link from "next/link";
import { Layers, Bot, Briefcase, Settings } from "lucide-react";
import { buildingImage, companyBuildingIndex } from "@/lib/office-assets";

export type CompanyCardData = {
  id: string;
  name: string;
  legalName?: string | null;
  description?: string | null;
  status: string;
  departments: number;
  workers: number;
  activeTasks?: number;
  projects?: number;
};

// ---- shared pieces (used by BOTH card variants) ----
export function companyStatus(s: string) {
  return s === "ACTIVE" ? { dot: "#35D07F", label: "online" }
    : s === "PAUSED" ? { dot: "#F0B84B", label: "paused" }
    : { dot: "#657A91", label: s.toLowerCase() };
}

export function BuildingPreview({ id, className, sizes = "(max-width:768px) 100vw, 25vw" }: { id: string; className?: string; sizes?: string }) {
  // object-contain: the ENTIRE building silhouette stays visible, base never cropped.
  return (
    <span className={`relative block overflow-hidden bg-gradient-to-b from-[#0d1a2e] to-[#0a1424] ${className ?? ""}`}>
      <img
        src={buildingImage(companyBuildingIndex(id))}
        alt=""
        aria-hidden
        sizes={sizes}
        className="h-full w-full object-contain object-center p-1 transition duration-500 group-hover:scale-[1.03]"
        loading="lazy"
      />
    </span>
  );
}

function StatCell({ icon: Icon, n, l }: { icon: typeof Layers; n: number; l: string }) {
  return (
    <div className="rounded-md border border-[#244768]/60 bg-[#12233A] py-1">
      <div className="flex items-center justify-center gap-1 text-[13px] font-bold tabular-nums text-[#F4F7FB]">
        <Icon className="h-3 w-3 text-[#3ABEF9]" />{n}
      </div>
      <div className="text-[9px] text-[#657A91]">{l}</div>
    </div>
  );
}

function StatusChip({ status, className }: { status: string; className?: string }) {
  const st = companyStatus(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium text-slate-200 ${className ?? "bg-black/55 backdrop-blur"}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot, boxShadow: `0 0 6px ${st.dot}` }} />
      {st.label}
    </span>
  );
}

/**
 * Full card (Dashboard). Building preview ≈4:3 and ~55% of card height; the
 * whole building is visible (contain, never cropped). Counts are real DB values.
 */
export function CompanyBuildingCard({ company, selected }: { company: CompanyCardData; selected?: boolean }) {
  return (
    <div className={`group flex flex-col overflow-hidden rounded-xl border bg-[#0E1B2D] transition ${selected ? "border-[#F0B84B] ring-1 ring-[#F0B84B]/50" : "border-[#244768] hover:border-[#3ABEF9]/60"}`}>
      {/* fixed 4:3-ish preview height keeps 4 cards above the fold at 1080p */}
      <Link href={`/companies/${company.id}`} className="relative block h-[168px]">
        <BuildingPreview id={company.id} className="absolute inset-0" />
        <StatusChip status={company.status} className="absolute right-2 top-2 bg-black/55 backdrop-blur" />
      </Link>

      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-bold leading-tight text-[#F4F7FB]">{company.name}</div>
          <div className="truncate text-[10px] leading-tight text-[#9DB1C8]">{company.legalName || company.description || "AI Agent Company"}</div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <StatCell icon={Layers} n={company.departments} l="แผนก" />
          <StatCell icon={Bot} n={company.workers} l="workers" />
          <StatCell icon={Briefcase} n={company.activeTasks ?? company.projects ?? 0} l={company.activeTasks !== undefined ? "งาน" : "โปรเจกต์"} />
        </div>
        <Link href={`/companies/${company.id}`} className="mt-auto inline-flex h-9 items-center justify-center rounded-md bg-[#3478F6] text-xs font-semibold text-white transition hover:bg-[#2f6ce0]">
          เปิดดู
        </Link>
      </div>
    </div>
  );
}

/**
 * Compact card (Companies page) — same theme resolver, status chip, stats and
 * fallback, denser layout with an extra settings action.
 */
export function CompanyBuildingCardCompact({ company }: { company: CompanyCardData }) {
  return (
    <div className="group flex gap-2.5 rounded-xl border border-[#244768] bg-[#0E1B2D] p-2.5 transition hover:border-[#3ABEF9]/60">
      <Link href={`/companies/${company.id}`} className="shrink-0">
        <BuildingPreview id={company.id} className="h-[76px] w-[76px] rounded-lg" sizes="76px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/companies/${company.id}`} className="block truncate text-[13px] font-bold text-[#F4F7FB] hover:text-[#3ABEF9]">{company.name}</Link>
            <div className="truncate text-[10px] text-[#9DB1C8]">{company.legalName || "AI Agent Company"}</div>
          </div>
          <StatusChip status={company.status} className="bg-[#12233A]" />
        </div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <StatCell icon={Layers} n={company.departments} l="แผนก" />
          <StatCell icon={Bot} n={company.workers} l="workers" />
          <StatCell icon={Briefcase} n={company.projects ?? company.activeTasks ?? 0} l="โปรเจกต์" />
        </div>
        <div className="flex gap-1.5">
          <Link href={`/companies/${company.id}`} className="inline-flex h-7 flex-1 items-center justify-center rounded-md bg-[#3478F6] text-[11px] font-semibold text-white transition hover:bg-[#2f6ce0]">เปิดดู</Link>
          <Link href={`/companies/${company.id}/settings`} aria-label="ตั้งค่า" className="inline-flex h-7 w-8 items-center justify-center rounded-md border border-[#244768] text-[#9DB1C8] transition hover:border-[#3ABEF9]/60 hover:text-[#3ABEF9]">
            <Settings className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
