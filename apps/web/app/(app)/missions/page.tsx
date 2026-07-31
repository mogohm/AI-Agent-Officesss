import Link from "next/link";
import { listMissions } from "@/lib/data/missions";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const TONE: Record<string, "green" | "amber" | "red" | "blue" | "purple" | "neutral"> = {
  COMPLETED: "green", EXECUTING: "blue", ANALYZING: "blue", PLANNING: "blue",
  TESTING: "blue", UAT: "purple", PAUSED: "amber", BLOCKED: "red",
  FAILED: "red", CANCELLED: "neutral", DRAFT: "neutral",
};

export default async function MissionsPage() {
  let missions;
  try { missions = await listMissions(); }
  catch { return (<><PageHeader title="Mission Control" /><ErrorState title="ไม่มีสิทธิ์ หรือเชื่อมต่อฐานข้อมูลไม่ได้" /></>); }

  return (
    <>
      <PageHeader title="Mission Control" description="Autonomous Delivery Center — งานพัฒนาที่ระบบรันเอง" />
      {missions.length === 0 ? <EmptyState title="ยังไม่มี mission" description="สร้าง mission จาก template หรือหน้า /missions/new" /> : (
        <div className="space-y-2">
          {missions.map((m) => (
            <Link key={m.id} href={`/missions/${m.id}`}>
              <Card className="transition hover:border-[#3ABEF9]/60">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-xs font-bold text-[#3ABEF9]">{m.key}</span>
                      <Badge tone={TONE[m.status] ?? "neutral"}>{m.status.toLowerCase()}</Badge>
                      <Badge tone="neutral">{m.autonomyLevel.replace("_", " ").toLowerCase()}</Badge>
                    </div>
                    <div className="mt-0.5 truncate text-sm font-bold text-[#F4F7FB]">{m.title}</div>
                    <div className="truncate text-[11px] text-[#657A91]">
                      {m._count.requirements} requirements · {m._count.workPackages} work packages · {m._count.agentRuns} agent runs · {m._count.defects} defects
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <div className="tabular-nums text-[#F4F7FB]">
                      ${Number(m.budget?.spentCostUsd ?? 0).toFixed(4)} / ${Number(m.budget?.maxCostUsd ?? 0).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-[#657A91]">iteration {m.iteration}</div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
