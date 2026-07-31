import { getProjectFormData } from "@/lib/data/projects";
import { requireCompanyAccess } from "@/lib/rbac";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/ProjectForm";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({ params }: { params: { companyId: string } }) {
  let company, data;
  try { ({ company } = await requireCompanyAccess(params.companyId)); data = await getProjectFormData(params.companyId); }
  catch { return (<><PageHeader title="สร้างโปรเจกต์" /><ErrorState title="ไม่พบบริษัท หรือไม่มีสิทธิ์" /></>); }
  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: company.name, href: `/companies/${company.id}` }, { label: "Projects", href: `/companies/${company.id}/projects` }, { label: "สร้างใหม่" }]} />
      <PageHeader title="สร้างโปรเจกต์ใหม่" />
      <Card><CardContent className="p-6">
        <ProjectForm mode="create" companyId={company.id} departments={data.departments} workers={data.workers} />
      </CardContent></Card>
    </>
  );
}
