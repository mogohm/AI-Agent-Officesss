import Link from "next/link";
import { getDepartment } from "@/lib/data/departments";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkerSprite } from "@/components/office/WorkerSprite";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { floorModule } from "@/lib/office-assets";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DepartmentPage({ params }: { params: { companyId: string; departmentId: string } }) {
  let data;
  try { data = await getDepartment(params.companyId, params.departmentId); }
  catch { return (<><PageHeader title="Department" /><ErrorState title="ไม่มีสิทธิ์เข้าถึง" /></>); }
  if (!data) return (<><PageHeader title="Department" /><ErrorState title="ไม่พบแผนก" /></>);
  const { company, department: d } = data;
  const shown = d.workers.slice(0, 8);

  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: company.name, href: `/companies/${company.id}` }, { label: "Departments", href: `/companies/${company.id}/departments` }, { label: d.name }]} />
      <PageHeader
        title={d.name}
        description={d.description ?? undefined}
        actions={
          <>
            <span className="grid h-7 w-7 place-items-center rounded font-bold text-white" style={{ background: d.themeColor }}>{d.floorOrder}</span>
            <Badge tone="blue">{d.floorType.toLowerCase()}</Badge>
            <Button asChild variant="secondary" size="sm"><Link href={`/workers/new?companyId=${company.id}&departmentId=${d.id}`}>+ เพิ่ม Worker</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`/companies/${company.id}/departments/${d.id}/settings`}>ตั้งค่า</Link></Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
        {/* ---- pixel-art workspace ---- */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-[#244768]">
            <div className="office-room relative h-[360px] w-full overflow-hidden">
              <img src={floorModule(d.floorType, d.name)} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-[center_44%]" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70" />
              <div className="absolute left-3 top-3 flex items-center gap-2">
                <span className="rounded bg-black/60 px-2.5 py-1 text-sm font-bold text-white backdrop-blur-sm">{d.name}</span>
                <span className="rounded bg-black/45 px-2 py-0.5 text-[11px] text-slate-200">{d.workers.length} workers · ชั้น {d.floorOrder}</span>
              </div>
              {/* live roster on the floor */}
              <div className="absolute inset-x-0 bottom-0 flex items-end gap-1 px-3 pb-2">
                {shown.length === 0 ? (
                  <span className="mb-2 rounded bg-black/50 px-2 py-0.5 text-xs text-slate-300">ยังไม่มี worker ในห้องนี้</span>
                ) : shown.map((w) => <WorkerSprite key={w.id} worker={{ id: w.id, name: w.name, runtimeStatus: w.runtimeStatus, avatarKey: w.avatarKey, role: w.role }} size={70} />)}
              </div>
            </div>
          </div>

          {/* ---- current tasks table ---- */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Current Tasks</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link href={`/tasks/new?companyId=${company.id}&departmentId=${d.id}`}>+ งานใหม่</Link></Button>
            </CardHeader>
            <CardContent className="p-0">
              {d.tasks.length === 0 ? <div className="p-4"><EmptyState title="ยังไม่มีงานในแผนกนี้" /></div> : (
                <div className="scroll-slim overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[11px] uppercase text-[#657A91]">
                      <tr className="border-b border-[#244768]/60">
                        <th className="px-4 py-2 font-medium">Task</th>
                        <th className="px-2 py-2 font-medium">Worker</th>
                        <th className="px-2 py-2 font-medium">Status</th>
                        <th className="px-2 py-2 font-medium">Priority</th>
                        <th className="px-4 py-2 text-right font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.tasks.map((t) => (
                        <tr key={t.id} className="border-b border-[#244768]/30 hover:bg-white/[0.02]">
                          <td className="px-4 py-2"><Link href={`/tasks/${t.id}`} className="font-medium text-[#F4F7FB] hover:text-[#3ABEF9]">{t.title}</Link></td>
                          <td className="px-2 py-2">
                            {t.worker ? (
                              <span className="flex items-center gap-1.5">
                                <WorkerSprite worker={{ id: t.id, name: t.worker.name, runtimeStatus: t.worker.runtimeStatus, avatarKey: t.worker.avatarKey ?? undefined, role: t.worker.role }} size={26} />
                                <span className="truncate text-[#9DB1C8]">{t.worker.name}</span>
                              </span>
                            ) : <span className="text-[#657A91]">—</span>}
                          </td>
                          <td className="px-2 py-2"><TaskStatusBadge status={t.status} /></td>
                          <td className="px-2 py-2"><Badge tone={t.priority === "URGENT" || t.priority === "HIGH" ? "red" : "neutral"}>{t.priority.toLowerCase()}</Badge></td>
                          <td className="px-4 py-2 text-right text-[#657A91]">{t.createdAt.toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ---- info + roster ---- */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Department Info</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-[#657A91]">ชั้น</dt><dd className="text-right text-[#F4F7FB]">{d.floorOrder}</dd>
                <dt className="text-[#657A91]">ประเภท</dt><dd className="text-right text-[#F4F7FB]">{d.floorType.toLowerCase()}</dd>
                <dt className="text-[#657A91]">Workers</dt><dd className="text-right text-[#F4F7FB]">{d.workers.length}</dd>
                <dt className="text-[#657A91]">Tasks</dt><dd className="text-right text-[#F4F7FB]">{d._count.tasks}</dd>
                <dt className="text-[#657A91]">งบต่อเดือน</dt><dd className="text-right text-[#F4F7FB]">{d.monthlyBudget ? formatCurrency(Number(d.monthlyBudget), company.currency) : "—"}</dd>
                <dt className="text-[#657A91]">สถานะ</dt><dd className="text-right text-[#F4F7FB]">{d.status.toLowerCase()}</dd>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Workers ({d.workers.length})</CardTitle></CardHeader>
            <CardContent>
              {d.workers.length === 0 ? <EmptyState title="ยังไม่มี worker" /> : (
                <ul className="space-y-1.5">
                  {d.workers.map((w) => (
                    <li key={w.id}>
                      <Link href={`/workers/${w.id}`} className="flex items-center gap-3 rounded-md border border-[#244768]/60 bg-[#12233A]/50 px-2.5 py-1.5 transition hover:border-[#3ABEF9]/50">
                        <WorkerSprite worker={{ id: w.id, name: w.name, runtimeStatus: w.runtimeStatus, avatarKey: w.avatarKey, role: w.role }} size={34} />
                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#F4F7FB]">{w.name}</span><span className="block truncate text-xs text-[#657A91]">{w.role}</span></span>
                        <Badge tone={w.runtimeStatus === "WORKING" || w.runtimeStatus === "THINKING" ? "blue" : w.runtimeStatus === "ERROR" ? "red" : "neutral"}>{w.runtimeStatus.toLowerCase()}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
