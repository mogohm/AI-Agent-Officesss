import Link from "next/link";
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
  catch { return (<><PageHeader title="Workers" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }

  return (
    <>
      <PageHeader
        title="AI Workers"
        description="พนักงาน AI ทั้งหมด · สถานะ runtime อัปเดตจากการรัน task"
        actions={<Button asChild size="sm"><Link href="/workers/new">+ เพิ่ม Worker</Link></Button>}
      />
      {workers.length === 0 ? (
        <EmptyState title="ยังไม่มี AI worker" description="สร้าง worker แล้วมอบหมายให้แผนก/โปรเจกต์"
          action={<Button asChild size="sm"><Link href="/workers/new">+ เพิ่ม Worker</Link></Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {workers.map((w) => (
            <div key={w.id} className="flex flex-col gap-2 rounded-xl border border-[#244768] bg-[#0E1B2D] p-3 transition hover:border-[#3ABEF9]/50">
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#0b1626] ring-1 ring-[#244768]/70">
                  <WorkerSprite worker={{ id: w.id, name: w.name, runtimeStatus: w.runtimeStatus, avatarKey: w.avatarKey, role: w.role }} size={48} />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/workers/${w.id}`} className="block truncate text-sm font-bold text-[#F4F7FB] hover:underline">{w.name}</Link>
                  <div className="truncate text-xs text-[#9DB1C8]">{w.role}</div>
                  <div className="truncate text-[11px] text-[#657A91]">{w.company.name} · {w.department?.name ?? "ไม่มีแผนก"}</div>
                </div>
                <WorkerStatusBadge status={w.runtimeStatus} />
              </div>
              <div className="flex items-center justify-between border-t border-[#244768]/50 pt-2 text-[11px]">
                <span className="text-[#657A91]">เดือนนี้ · <span className="font-semibold text-[#F4F7FB]">{formatCurrency(Number(w.currentMonthCost), w.company.currency ?? "USD")}</span></span>
                <Button asChild size="sm" variant="outline"><Link href={`/workers/${w.id}`}>เปิด</Link></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
