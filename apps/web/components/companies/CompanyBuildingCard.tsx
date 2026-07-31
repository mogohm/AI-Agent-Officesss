import Link from "next/link";
import { Layers, Bot, Briefcase } from "lucide-react";
import { buildingImage, companyBuildingIndex } from "@/lib/office-assets";

export type CompanyCardData = {
  id: string;
  name: string;
  legalName?: string | null;
  description?: string | null;
  status: string;
  departments: number;
  workers: number;
  activeTasks: number;
};

const STATUS = (s: string) =>
  s === "ACTIVE" ? { dot: "#35D07F", label: "online" } : s === "PAUSED" ? { dot: "#F0B84B", label: "paused" } : { dot: "#657A91", label: s.toLowerCase() };

/**
 * Dashboard company card — a pixel-art building preview (≈60% of card height)
 * over live counts. Building art is picked deterministically from the id so it
 * stays stable across reloads. All numbers come from real DB records.
 */
export function CompanyBuildingCard({ company, selected }: { company: CompanyCardData; selected?: boolean }) {
  const st = STATUS(company.status);
  const src = buildingImage(companyBuildingIndex(company.id));
  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-xl border bg-[#0E1B2D] transition ${selected ? "border-[#F0B84B] ring-1 ring-[#F0B84B]/50" : "border-[#244768] hover:border-[#3ABEF9]/60"}`}
    >
      {/* building preview — the visual anchor */}
      <Link href={`/companies/${company.id}`} className="relative block h-40 overflow-hidden bg-gradient-to-b from-[#0d1a2e] to-[#0a1424]">
        <img src={src} alt="" aria-hidden className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.04]" loading="lazy" />
        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-slate-200 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot, boxShadow: `0 0 6px ${st.dot}` }} />
          {st.label}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-[#F4F7FB]">{company.name}</div>
          <div className="truncate text-[11px] text-[#9DB1C8]">{company.legalName || company.description || "AI Agent Company"}</div>
        </div>

        <div className="grid grid-cols-3 gap-1 text-center">
          {[
            { icon: Layers, n: company.departments, l: "แผนก" },
            { icon: Bot, n: company.workers, l: "workers" },
            { icon: Briefcase, n: company.activeTasks, l: "งาน" },
          ].map(({ icon: Icon, n, l }, i) => (
            <div key={i} className="rounded-md border border-[#244768]/60 bg-[#12233A] py-1">
              <div className="flex items-center justify-center gap-1 text-sm font-bold text-[#F4F7FB]">
                <Icon className="h-3 w-3 text-[#3ABEF9]" />{n}
              </div>
              <div className="text-[9px] text-[#657A91]">{l}</div>
            </div>
          ))}
        </div>

        <Link
          href={`/companies/${company.id}`}
          className="mt-auto inline-flex h-8 items-center justify-center rounded-md bg-[#3478F6] text-xs font-semibold text-white transition hover:bg-[#2f6ce0]"
        >
          เปิดดู
        </Link>
      </div>
    </div>
  );
}
