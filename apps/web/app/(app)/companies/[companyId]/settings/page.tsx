import { getCompanyDetail } from "@/lib/data/companies";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { CompanyDangerZone } from "@/components/companies/CompanyDangerZone";

export const dynamic = "force-dynamic";

export default async function CompanySettingsPage({ params }: { params: { companyId: string } }) {
  let data;
  try {
    data = await getCompanyDetail(params.companyId);
  } catch {
    return (<><PageHeader title="Company Settings" /><ErrorState title="ไม่พบบริษัท หรือไม่มีสิทธิ์" /></>);
  }
  const { company, role } = data;
  const canManage = role === "OWNER" || role === "ADMIN";

  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: company.name, href: `/companies/${company.id}` }, { label: "ตั้งค่า" }]} />
      <PageHeader title={`ตั้งค่า — ${company.name}`} />
      {!canManage ? (
        <ErrorState title="ต้องเป็น Owner หรือ Admin เพื่อแก้ไข" />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>ข้อมูลบริษัท</CardTitle></CardHeader>
            <CardContent>
              <CompanyForm
                mode="edit"
                companyId={company.id}
                defaults={{
                  name: company.name,
                  legalName: company.legalName ?? "",
                  description: company.description ?? "",
                  currency: company.currency,
                  timezone: company.timezone,
                  monthlyBudget: company.monthlyBudget ? Number(company.monthlyBudget) : undefined,
                }}
              />
            </CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardHeader><CardTitle className="text-red-300">Danger Zone</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-slate-400">พัก / เก็บเข้าคลัง — ไม่มีการลบถาวรเพื่อรักษาประวัติ</p>
              <CompanyDangerZone companyId={company.id} status={company.status} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
