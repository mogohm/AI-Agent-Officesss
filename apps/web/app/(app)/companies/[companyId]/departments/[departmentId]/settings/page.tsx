import { getDepartment } from "@/lib/data/departments";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DepartmentForm } from "@/components/departments/DepartmentForm";
import { DepartmentArchive } from "@/components/departments/DepartmentArchive";

export const dynamic = "force-dynamic";

export default async function DepartmentSettingsPage({ params }: { params: { companyId: string; departmentId: string } }) {
  let data;
  try { data = await getDepartment(params.companyId, params.departmentId); }
  catch { return (<><PageHeader title="Department Settings" /><ErrorState title="ไม่มีสิทธิ์" /></>); }
  if (!data) return (<><PageHeader title="Department Settings" /><ErrorState title="ไม่พบแผนก" /></>);
  const { company, role, department: d } = data;
  const canManage = role === "OWNER" || role === "ADMIN";

  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: company.name, href: `/companies/${company.id}` }, { label: "Departments", href: `/companies/${company.id}/departments` }, { label: d.name, href: `/companies/${company.id}/departments/${d.id}` }, { label: "ตั้งค่า" }]} />
      <PageHeader title={`ตั้งค่า — ${d.name}`} />
      {!canManage ? <ErrorState title="ต้องเป็น Owner หรือ Admin เพื่อแก้ไข" /> : (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>ข้อมูลแผนก</CardTitle></CardHeader>
            <CardContent>
              <DepartmentForm companyId={company.id} mode="edit" departmentId={d.id}
                defaults={{ name: d.name, description: d.description ?? "", floorType: d.floorType, themeColor: d.themeColor, monthlyBudget: d.monthlyBudget ? Number(d.monthlyBudget) : undefined, systemInstruction: d.systemInstruction ?? "" }} />
            </CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardHeader><CardTitle className="text-red-300">Danger Zone</CardTitle></CardHeader>
            <CardContent><DepartmentArchive companyId={company.id} departmentId={d.id} /></CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
