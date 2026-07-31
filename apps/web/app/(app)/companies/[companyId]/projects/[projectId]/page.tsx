import Link from "next/link";
import { getProject } from "@/lib/data/projects";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectStatusControl } from "@/components/projects/ProjectStatusControl";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: { companyId: string; projectId: string } }) {
  let data;
  try { data = await getProject(params.companyId, params.projectId); }
  catch { return (<><PageHeader title="Project" /><ErrorState title="ไม่มีสิทธิ์" /></>); }
  if (!data) return (<><PageHeader title="Project" /><ErrorState title="ไม่พบโปรเจกต์" /></>);
  const { company, role, project: p } = data;
  const canManage = ["OWNER", "ADMIN", "MANAGER"].includes(role);

  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: company.name, href: `/companies/${company.id}` }, { label: "Projects", href: `/companies/${company.id}/projects` }, { label: p.name }]} />
      <PageHeader
        title={p.name}
        description={p.description ?? undefined}
        actions={
          <>
            <Badge tone={p.priority === "CRITICAL" || p.priority === "HIGH" ? "red" : "neutral"}>{p.priority.toLowerCase()}</Badge>
            {canManage ? <ProjectStatusControl companyId={company.id} projectId={p.id} status={p.status} /> : <Badge tone="blue">{p.status.toLowerCase()}</Badge>}
            <Button asChild variant="outline" size="sm"><Link href={`/companies/${company.id}/projects/${p.id}/settings`}>ตั้งค่า</Link></Button>
          </>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between"><CardTitle>Tasks</CardTitle>
            <Button asChild variant="secondary" size="sm"><Link href={`/tasks/new?companyId=${company.id}&projectId=${p.id}`}>+ Task</Link></Button>
          </CardHeader>
          <CardContent>
            {p.tasks.length === 0 ? <EmptyState title="ยังไม่มี task" /> : (
              <ul className="space-y-1.5">
                {p.tasks.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tasks/${t.id}`} className="flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 hover:bg-white/5">
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{t.title}</span>
                      <span className="text-xs text-slate-500">{t.worker?.name ?? "—"}</span>
                      <TaskStatusBadge status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>แผนกที่เกี่ยวข้อง</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {p.departmentLinks.length === 0 ? <span className="text-xs text-slate-500">—</span> : p.departmentLinks.map((l) => <Badge key={l.departmentId} tone="blue">{l.department.name}</Badge>)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Workers</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-1.5">
              {p.workerLinks.length === 0 ? <span className="text-xs text-slate-500">—</span> : p.workerLinks.map((l) => (
                <Link key={l.workerId} href={`/workers/${l.workerId}`}><Badge tone="purple">{l.worker.name}</Badge></Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
