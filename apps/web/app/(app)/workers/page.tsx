import Link from "next/link";
import { Plus, Cpu } from "lucide-react";
import { listWorkers } from "@/lib/data/workers";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { WorkerStatusBadge } from "@/components/workers/WorkerStatusBadge";
import { WorkerSprite } from "@/components/office/WorkerSprite";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WorkersPage({ searchParams }: { searchParams: { companyId?: string } }) {
  let workers;
  try { workers = await listWorkers({ companyId: searchParams.companyId }); }
  catch { return (<><PageHeader title="AI Workers" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }

  return (
    <>
      <PageHeader
        title="AI Workers"
        description="พนักงาน AI ทั้งหมด · สถานะ runtime อัปเดตจากการรัน task จริง"
        actions={<Button asChild size="sm"><Link href="/workers/new">+ เพิ่ม Worker</Link></Button>}
      />
      {workers.length === 0 ? (
        <EmptyState title="ยังไม่มี AI worker" description="สร้าง worker แล้วมอบหมายให้แผนก/โปรเจกต์"
          action={<Button asChild size="sm"><Link href="/workers/new">+ เพิ่ม Worker</Link></Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {workers.map((w) => {
            const task = w.tasks[0];
            return (
              <div key={w.id} className="flex min-h-[150px] flex-col gap-2 rounded-xl border border-[#244768] bg-[#0E1B2D] p-2.5 transition hover:border-[#3ABEF9]/60">
                <div className="flex items-start gap-2.5">
                  <div className="grid h-[68px] w-[56px] shrink-0 place-items-end rounded-lg bg-gradient-to-b from-[#12233A] to-[#0b1626] ring-1 ring-[#244768]/70">
                    <WorkerSprite worker={{ id: w.id, name: w.name, runtimeStatus: w.runtimeStatus, avatarKey: w.avatarKey, role: w.role, currentTask: task?.title }} size={62} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1.5">
                      <Link href={`/workers/${w.id}`} className="block truncate text-[13px] font-bold text-[#F4F7FB] hover:text-[#3ABEF9]">{w.name}</Link>
                      <WorkerStatusBadge status={w.runtimeStatus} />
                    </div>
                    <div className="truncate text-[11px] text-[#9DB1C8]">{w.role}</div>
                    <div className="truncate text-[10px] text-[#657A91]">{w.department?.name ?? "ไม่มีแผนก"} · {w.company.name}</div>
                    <div className="mt-1 flex items-center gap-1 truncate text-[10px] text-[#9B6CF6]">
                      <Cpu className="h-3 w-3 shrink-0" />
                      <span className="truncate">{w.providerConnection?.providerType?.toLowerCase() ?? "ใช้ค่าเริ่มต้น"}</span>
                    </div>
                  </div>
                </div>

                <div className="truncate rounded-md border border-[#244768]/50 bg-[#12233A]/60 px-2 py-1 text-[10px] text-[#9DB1C8]">
                  {task ? <>กำลังทำ: <span className="text-[#F4F7FB]">{task.title}</span></> : <span className="text-[#657A91]">ว่าง — ไม่มีงานที่กำลังทำ</span>}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-[#244768]/50 pt-1.5 text-[10px]">
                  <span className="text-[#657A91]">เดือนนี้ · <span className="font-semibold tabular-nums text-[#F4F7FB]">{formatCurrency(Number(w.currentMonthCost), w.company.currency ?? "USD")}</span></span>
                  <div className="flex gap-1">
                    <Link href={`/workers/${w.id}`} className="rounded border border-[#244768] px-1.5 py-0.5 text-[#9DB1C8] transition hover:border-[#3ABEF9]/60 hover:text-[#3ABEF9]">เปิด</Link>
                    <Link href={`/workers/${w.id}/settings`} aria-label="ตั้งค่า worker" className="rounded border border-[#244768] px-1.5 py-0.5 text-[#9DB1C8] transition hover:border-[#3ABEF9]/60 hover:text-[#3ABEF9]">⋯</Link>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add-new card lives inside the same grid */}
          <Link href="/workers/new" className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#244768] bg-[#0b1626]/50 text-[#657A91] transition hover:border-[#3ABEF9]/60 hover:text-[#3ABEF9]">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-current"><Plus className="h-5 w-5" /></span>
            <span className="text-xs font-semibold">เพิ่ม AI Worker</span>
          </Link>
        </div>
      )}
    </>
  );
}
