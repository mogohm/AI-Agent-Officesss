import { getProject, getProjectFormData } from "@/lib/data/projects";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/ProjectForm";

export const dynamic = "force-dynamic";

export default async function ProjectSettingsPage({ params }: { params: { companyId: string; projectId: string } }) {
  let data, form;
  try { data = await getProject(params.companyId, params.projectId); form = await getProjectFormData(params.companyId); }
  catch { return (<><PageHeader title="Project Settings" /><ErrorState title="ไม่มีสิทธิ์" /></>); }
  if (!data) return (<><PageHeader title="Project Settings" /><ErrorState title="ไม่พบโปรเจกต์" /></>);
  const { company, role, project: p } = data;
  const canManage = ["OWNER", "ADMIN", "MANAGER"].includes(role);

  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: company.name, href: `/companies/${company.id}` }, { label: "Projects", href: `/companies/${company.id}/projects` }, { label: p.name, href: `/companies/${company.id}/projects/${p.id}` }, { label: "ตั้งค่า" }]} />
      <PageHeader title={`ตั้งค่า — ${p.name}`} />
      {!canManage ? <ErrorState title="ต้องเป็น Manager ขึ้นไปเพื่อแก้ไข" /> : (
        <Card><CardHeader><CardTitle>ข้อมูลโปรเจกต์</CardTitle></CardHeader><CardContent>
          <ProjectForm mode="edit" companyId={company.id} projectId={p.id} departments={form.departments} workers={form.workers}
            defaults={{
              name: p.name, description: p.description ?? "", priority: p.priority,
              targetDate: p.targetDate ? p.targetDate.toISOString().slice(0, 10) : "",
              monthlyBudget: p.monthlyBudget ? Number(p.monthlyBudget) : undefined,
              departmentIds: p.departmentLinks.map((l) => l.departmentId),
              workerIds: p.workerLinks.map((l) => l.workerId),
            }} />
        </CardContent></Card>
      )}
    </>
  );
}
