import Link from "next/link";
import { getCompanyDetail } from "@/lib/data/companies";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { OfficeTower } from "@/components/office/OfficeTower";
import { WorkerSprite } from "@/components/office/WorkerSprite";

export const dynamic = "force-dynamic";

function tone(s: string) {
  return s === "ACTIVE" || s === "COMPLETED" ? ("green" as const)
    : s === "PAUSED" || s === "PLANNING" ? ("amber" as const)
    : s === "DRAFT" ? ("neutral" as const) : ("blue" as const);
}

export default async function CompanyPage({ params }: { params: { companyId: string } }) {
  let data;
  try {
    data = await getCompanyDetail(params.companyId);
  } catch (err) {
    const forbidden = (err as { code?: string })?.code === "FORBIDDEN";
    return (
      <>
        <PageHeader title="Company" />
        <ErrorState title={forbidden ? "ไม่มีสิทธิ์เข้าถึงบริษัทนี้" : "ไม่พบบริษัท หรือเชื่อมต่อฐานข้อมูลไม่ได้"} />
      </>
    );
  }
  const { company, departments, workers, projects, recentActivity } = data;

  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: company.name }]} />
      <PageHeader
        title={company.name}
        description={company.legalName ?? undefined}
        actions={
          <>
            <Badge tone={tone(company.status)}>{company.status.toLowerCase()}</Badge>
            <Button asChild variant="secondary" size="sm"><Link href={`/companies/${company.id}/departments/new`}>+ เพิ่มแผนก</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`/companies/${company.id}/settings`}>ตั้งค่า</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Office / floors (interactive tower lands here in Phase 3) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>บริษัทที่เลือก: {company.name}</CardTitle>
              <p className="mt-0.5 text-[11px] text-[#657A91]">คลิกชั้นเพื่อจัดการแผนก</p>
            </div>
            <span className="rounded-full border border-[#244768] bg-[#12233A] px-2.5 py-1 text-[11px] font-semibold text-[#9DB1C8]">
              สูงสุด 15 แผนก / {departments.length} ชั้น
            </span>
          </CardHeader>
          <CardContent>
            {departments.length === 0 ? (
              <EmptyState title="ยังไม่มีแผนก" description="เพิ่มแผนกแรก — แต่ละแผนกจะเป็นชั้นในตึก"
                action={<Button asChild size="sm"><Link href={`/companies/${company.id}/departments/new`}>+ เพิ่มแผนก</Link></Button>} />
            ) : (
              <div className="scroll-slim overflow-x-auto">
                <OfficeTower
                  companyId={company.id}
                  companyName={company.name}
                  departments={departments.map((d) => ({ id: d.id, name: d.name, floorOrder: d.floorOrder, floorType: d.floorType, themeColor: d.themeColor }))}
                  workers={workers.map((w) => ({ id: w.id, name: w.name, departmentId: w.departmentId, runtimeStatus: w.runtimeStatus, avatarKey: w.avatarKey, role: w.role }))}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Department Management</CardTitle>
              <Button asChild size="sm" className="h-7 px-2 text-xs"><Link href={`/companies/${company.id}/departments/new`}>+ เพิ่ม</Link></Button>
            </CardHeader>
            <CardContent>
              {departments.length === 0 ? <p className="text-xs text-[#657A91]">ยังไม่มีแผนก</p> : (
                <ul className="space-y-1">
                  {[...departments].sort((a, b) => b.floorOrder - a.floorOrder).map((d) => (
                    <li key={d.id} className="flex items-center gap-2 rounded-md border border-[#244768]/60 bg-[#12233A]/60 px-2 py-1.5 text-xs">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded font-bold text-white" style={{ background: d.themeColor }}>{d.floorOrder}</span>
                      <Link href={`/companies/${company.id}/departments/${d.id}`} className="flex-1 truncate font-medium text-[#F4F7FB] hover:text-[#3ABEF9]">{d.name}</Link>
                      <Link href={`/companies/${company.id}/departments/${d.id}/settings`} className="text-[#657A91] hover:text-[#3ABEF9]">แก้ไข</Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Company Summary</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-slate-500">Departments</dt><dd className="text-right text-slate-200">{departments.length}</dd>
                <dt className="text-slate-500">AI Workers</dt><dd className="text-right text-slate-200">{workers.length}</dd>
                <dt className="text-slate-500">งบต่อเดือน</dt><dd className="text-right text-slate-200">{company.monthlyBudget ? formatCurrency(Number(company.monthlyBudget), company.currency) : "—"}</dd>
                <dt className="text-slate-500">Timezone</dt><dd className="text-right text-slate-200">{company.timezone}</dd>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between"><CardTitle>Recent Projects</CardTitle>
              <Button asChild variant="ghost" size="sm"><Link href={`/companies/${company.id}/projects`}>ทั้งหมด</Link></Button>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? <p className="text-xs text-slate-500">ยังไม่มีโปรเจกต์</p> : (
                <ul className="space-y-1.5">
                  {projects.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link href={`/companies/${company.id}/projects/${p.id}`} className="truncate text-slate-200 hover:text-white">{p.name}</Link>
                      <Badge tone={tone(p.status)}>{p.status.toLowerCase()}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Workers */}
      <Card className="mt-4">
        <CardHeader className="flex-row items-center justify-between"><CardTitle>AI Workers</CardTitle>
          <Button asChild variant="secondary" size="sm"><Link href={`/workers/new?companyId=${company.id}`}>+ เพิ่ม Worker</Link></Button>
        </CardHeader>
        <CardContent>
          {workers.length === 0 ? <p className="text-xs text-slate-500">ยังไม่มี AI worker</p> : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {workers.map((w) => (
                <Link key={w.id} href={`/workers/${w.id}`} className="flex items-center gap-3 rounded-md border border-[#244768]/70 bg-[#0e1b2d] px-3 py-2 transition hover:border-[#3ABEF9]/50">
                  <WorkerSprite worker={{ id: w.id, name: w.name, runtimeStatus: w.runtimeStatus, avatarKey: w.avatarKey, role: w.role }} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-100">{w.name}</span>
                    <span className="block truncate text-xs text-slate-500">{w.role} · {w.department?.name ?? "ไม่มีแผนก"}</span>
                  </span>
                  <Badge tone={w.runtimeStatus === "WORKING" || w.runtimeStatus === "THINKING" ? "blue" : w.runtimeStatus === "ERROR" ? "red" : w.runtimeStatus === "WAITING_APPROVAL" ? "purple" : "neutral"}>{w.runtimeStatus.toLowerCase()}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
