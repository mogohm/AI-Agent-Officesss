import Link from "next/link";
import { listDepartments } from "@/lib/data/departments";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DepartmentList } from "@/components/departments/DepartmentList";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage({ params }: { params: { companyId: string } }) {
  let data;
  try { data = await listDepartments(params.companyId); }
  catch { return (<><PageHeader title="Departments" /><ErrorState title="ไม่พบบริษัท หรือไม่มีสิทธิ์" /></>); }
  const { company, role, departments } = data;
  const canManage = role === "OWNER" || role === "ADMIN";

  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: company.name, href: `/companies/${company.id}` }, { label: "Departments" }]} />
      <PageHeader
        title="Department Management"
        description={`${departments.length}/15 ชั้น · เรียงจากชั้นบนลงล่าง · ${canManage ? "ใช้ปุ่มลูกศรจัดลำดับ" : "อ่านอย่างเดียว"}`}
        actions={canManage ? <Button asChild size="sm"><Link href={`/companies/${company.id}/departments/new`}>+ เพิ่มแผนก</Link></Button> : undefined}
      />
      <Card>
        <CardContent className="p-4">
          {departments.length === 0 ? (
            <EmptyState title="ยังไม่มีแผนก" action={canManage ? <Button asChild size="sm"><Link href={`/companies/${company.id}/departments/new`}>+ เพิ่มแผนก</Link></Button> : undefined} />
          ) : (
            <DepartmentList
              companyId={company.id}
              canManage={canManage}
              initial={departments.map((d) => ({ id: d.id, name: d.name, floorType: d.floorType, themeColor: d.themeColor, floorOrder: d.floorOrder, workers: d._count.workers }))}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
