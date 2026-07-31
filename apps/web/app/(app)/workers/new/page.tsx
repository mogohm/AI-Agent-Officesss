import Link from "next/link";
import { listAccessibleCompanies } from "@/lib/data/companies";
import { getWorkerFormData } from "@/lib/data/workers";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WorkerForm } from "@/components/workers/WorkerForm";

export const dynamic = "force-dynamic";

export default async function NewWorkerPage({ searchParams }: { searchParams: { companyId?: string; departmentId?: string } }) {
  const companyId = searchParams.companyId;

  if (!companyId) {
    let companies;
    try { companies = await listAccessibleCompanies(); } catch { return (<><PageHeader title="เพิ่ม Worker" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }
    return (
      <>
        <Breadcrumbs items={[{ label: "Workers", href: "/workers" }, { label: "เพิ่มใหม่" }]} />
        <PageHeader title="เลือกบริษัท" description="Worker ต้องสังกัดบริษัท — เลือกบริษัทก่อน" />
        {companies.length === 0 ? <EmptyState title="ยังไม่มีบริษัท" action={<Button asChild size="sm"><Link href="/companies/new">+ สร้างบริษัท</Link></Button>} /> : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <Button key={c.id} asChild variant="secondary" className="justify-start">
                <Link href={`/workers/new?companyId=${c.id}`}>{c.name}</Link>
              </Button>
            ))}
          </div>
        )}
      </>
    );
  }

  let form;
  try { form = await getWorkerFormData(companyId); }
  catch { return (<><PageHeader title="เพิ่ม Worker" /><ErrorState title="ไม่พบบริษัท หรือไม่มีสิทธิ์" /></>); }

  return (
    <>
      <Breadcrumbs items={[{ label: "Workers", href: "/workers" }, { label: "เพิ่มใหม่" }]} />
      <PageHeader title="เพิ่ม AI Worker" />
      <Card><CardContent className="p-6">
        <WorkerForm mode="create" companyId={companyId} departments={form.departments} models={form.models}
          defaults={{ departmentId: searchParams.departmentId ?? "" }} />
      </CardContent></Card>
    </>
  );
}
