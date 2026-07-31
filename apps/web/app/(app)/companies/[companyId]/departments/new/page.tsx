import { requireCompanyAccess } from "@/lib/rbac";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DepartmentForm } from "@/components/departments/DepartmentForm";

export const dynamic = "force-dynamic";

export default async function NewDepartmentPage({ params }: { params: { companyId: string } }) {
  let company;
  try { ({ company } = await requireCompanyAccess(params.companyId)); }
  catch { return (<><PageHeader title="เพิ่มแผนก" /><ErrorState title="ไม่พบบริษัท หรือไม่มีสิทธิ์" /></>); }
  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: company.name, href: `/companies/${company.id}` }, { label: "Departments", href: `/companies/${company.id}/departments` }, { label: "เพิ่มใหม่" }]} />
      <PageHeader title="เพิ่มแผนกใหม่" description="แผนกใหม่จะกลายเป็นชั้นบนสุดของตึกโดยอัตโนมัติ" />
      <Card><CardContent className="p-6"><DepartmentForm companyId={company.id} mode="create" /></CardContent></Card>
    </>
  );
}
