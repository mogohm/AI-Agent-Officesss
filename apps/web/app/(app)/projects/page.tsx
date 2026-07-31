import Link from "next/link";
import { listProjects } from "@/lib/data/projects";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { WorkerSprite } from "@/components/office/WorkerSprite";
import { PROJECT_STATUS, PROJECT_PRIORITY } from "@/lib/validation/project";
import type { ProjectStatus, ProjectPriority } from "@prisma/client";

export const dynamic = "force-dynamic";

function tone(s: string) {
  return s === "ACTIVE" || s === "COMPLETED" ? ("green" as const)
    : s === "PLANNING" || s === "PAUSED" ? ("amber" as const)
    : s === "CRITICAL" || s === "HIGH" ? ("red" as const) : ("neutral" as const);
}

export default async function ProjectsPage({ searchParams }: { searchParams: { status?: string; priority?: string; q?: string } }) {
  let projects;
  try {
    projects = await listProjects({
      status: PROJECT_STATUS.includes(searchParams.status as ProjectStatus) ? (searchParams.status as ProjectStatus) : undefined,
      priority: PROJECT_PRIORITY.includes(searchParams.priority as ProjectPriority) ? (searchParams.priority as ProjectPriority) : undefined,
      q: searchParams.q,
    });
  } catch { return (<><PageHeader title="Projects" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }

  return (
    <>
      <PageHeader title="Projects" description="โปรเจกต์ทั้งหมดในบริษัทที่คุณเข้าถึงได้" />
      <Card className="mb-4">
        <CardContent className="p-3">
          <form className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1"><Input name="q" defaultValue={searchParams.q ?? ""} placeholder="ค้นหาชื่อโปรเจกต์…" /></div>
            <Select name="status" defaultValue={searchParams.status ?? ""} className="w-40">
              <option value="">ทุกสถานะ</option>
              {PROJECT_STATUS.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
            </Select>
            <Select name="priority" defaultValue={searchParams.priority ?? ""} className="w-40">
              <option value="">ทุกความสำคัญ</option>
              {PROJECT_PRIORITY.map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}
            </Select>
            <Button type="submit" size="sm">กรอง</Button>
          </form>
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <EmptyState title="ไม่พบโปรเจกต์" description="สร้างโปรเจกต์จากหน้าบริษัท" />
      ) : (
        <Card>
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#244768]/60 text-left text-[11px] uppercase text-[#657A91]">
                  <th className="px-4 py-2.5 font-medium">Project</th>
                  <th className="px-3 py-2.5 font-medium">Departments</th>
                  <th className="px-3 py-2.5 font-medium">Workers</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Priority</th>
                  <th className="px-4 py-2.5 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-[#244768]/30 hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <Link href={`/companies/${p.companyId}/projects/${p.id}`} className="font-semibold text-[#F4F7FB] hover:text-[#3ABEF9]">{p.name}</Link>
                      <div className="text-[11px] text-[#657A91]">{p.company.name} · {p._count.tasks} tasks</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {p.departmentLinks.length === 0 ? <span className="text-[11px] text-[#657A91]">—</span> :
                          p.departmentLinks.map((dl) => (
                            <span key={dl.department.id} className="rounded px-1.5 py-0.5 text-[10px] font-medium text-white" style={{ background: `${dl.department.themeColor}cc` }}>{dl.department.name}</span>
                          ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {p.workerLinks.length === 0 ? <span className="text-[11px] text-[#657A91]">—</span> : (
                        <div className="flex items-center -space-x-1.5">
                          {p.workerLinks.map((wl) => (
                            <div key={wl.worker.id} className="rounded-full ring-2 ring-[#0e1b2d]" title={wl.worker.name}>
                              <WorkerSprite worker={{ id: wl.worker.id, name: wl.worker.name, runtimeStatus: wl.worker.runtimeStatus, avatarKey: wl.worker.avatarKey ?? undefined, role: wl.worker.role }} size={28} />
                            </div>
                          ))}
                          {p._count.workerLinks > 6 ? <span className="pl-2.5 text-[11px] text-[#9DB1C8]">+{p._count.workerLinks - 6}</span> : null}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5"><Badge tone={tone(p.status)}>{p.status.toLowerCase()}</Badge></td>
                    <td className="px-3 py-2.5"><Badge tone={tone(p.priority)}>{p.priority.toLowerCase()}</Badge></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-[#3478F6] to-[#3ABEF9]" style={{ width: `${p.progress}%` }} /></div>
                        <span className="text-xs tabular-nums text-[#9DB1C8]">{p.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
