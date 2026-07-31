import { listActivity } from "@/lib/data/activity";
import { PageHeader, ErrorState, EmptyState } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { WorkerSprite } from "@/components/office/WorkerSprite";
import { User, Cog } from "lucide-react";

export const dynamic = "force-dynamic";

// action prefix → accent color (semantic)
function accent(action: string): string {
  if (action.includes("completed") || action.includes("approved") || action.includes("created")) return "#35D07F";
  if (action.includes("failed") || action.includes("error") || action.includes("rejected") || action.includes("exceeded")) return "#EF5B69";
  if (action.includes("waiting") || action.includes("approval") || action.includes("revision")) return "#9B6CF6";
  if (action.includes("queued") || action.includes("retry") || action.includes("test")) return "#3ABEF9";
  return "#657A91";
}

export default async function ActivityPage() {
  let logs;
  try { logs = await listActivity(); }
  catch { return (<><PageHeader title="Activity Logs" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }

  return (
    <>
      <PageHeader title="Activity Logs" description="บันทึกการกระทำทั้งหมด (audit trail) — 200 รายการล่าสุด" />
      {logs.length === 0 ? <EmptyState title="ยังไม่มีกิจกรรม" /> : (
        <Card className="p-0">
          <ul className="divide-y divide-[#244768]/30">
            {logs.map((l) => {
              const c = accent(l.action);
              return (
                <li key={l.id} className="flex items-center gap-3 px-3 py-2 transition hover:bg-white/[0.02]">
                  {/* timeline accent + avatar */}
                  <span className="h-8 w-0.5 shrink-0 rounded-full" style={{ background: c }} />
                  <span className="grid h-8 w-8 shrink-0 place-items-center">
                    {l.worker ? (
                      <WorkerSprite worker={{ id: l.id, name: l.worker.name, runtimeStatus: l.worker.runtimeStatus, avatarKey: l.worker.avatarKey ?? undefined, role: l.worker.role }} size={30} />
                    ) : (
                      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#12233A] text-[#9DB1C8] ring-1 ring-[#244768]/70">
                        {l.user ? <User className="h-3.5 w-3.5" /> : <Cog className="h-3.5 w-3.5" />}
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-[#F4F7FB]">{l.message}</div>
                    <div className="truncate text-[10px] text-[#657A91]">
                      {l.user?.name ?? l.worker?.name ?? "system"} · {l.company?.name ?? "—"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: `${c}22`, color: c }}>{l.action}</span>
                  <time className="w-28 shrink-0 text-right text-[10px] tabular-nums text-[#657A91]">{l.createdAt.toLocaleString()}</time>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
