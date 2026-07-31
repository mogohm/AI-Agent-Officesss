import { PageHeader } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyForm } from "@/components/companies/CompanyForm";

export default function NewCompanyPage() {
  return (
    <>
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: "สร้างใหม่" }]} />
      <PageHeader title="สร้างบริษัทใหม่" description="กรอกข้อมูลเพื่อสร้างบริษัท (คุณจะเป็น Owner โดยอัตโนมัติ)" />
      <Card>
        <CardContent className="p-6">
          <CompanyForm mode="create" />
        </CardContent>
      </Card>
    </>
  );
}
