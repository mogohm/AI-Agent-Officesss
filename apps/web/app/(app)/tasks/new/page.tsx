import Link from "next/link";
import { listAccessibleCompanies } from "@/lib/data/companies";
import { getTaskFormData } from "@/lib/data/tasks";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/tasks/TaskForm";

export const dynamic = "force-dynamic";

export default async function NewTaskPage({ searchParams }: { searchParams: { companyId?: string; projectId?: string; workerId?: string } }) {
  const companyId = searchParams.companyId;
  if (!companyId) {
    let companies;
    try { companies = await listAccessibleCompanies(); } catch { return (<><PageHeader title="สร้างงาน" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }
    return (
      <>
        <PageHeader title="เลือกบริษัท" description="งานต้องอยู่ในบริษัท — เลือกก่อน" />
        {companies.length === 0 ? <EmptyState title="ยังไม่มีบริษัท" /> : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => <Button key={c.id} asChild variant="secondary" className="justify-start"><Link href={`/tasks/new?companyId=${c.id}`}>{c.name}</Link></Button>)}
          </div>
        )}
      </>
    );
  }
  let form;
  try { form = await getTaskFormData(companyId); }
  catch { return (<><PageHeader title="สร้างงาน" /><ErrorState title="ไม่พบบริษัท หรือไม่มีสิทธิ์" /></>); }
  return (
    <>
      <Breadcrumbs items={[{ label: "Tasks", href: "/tasks" }, { label: "สร้างใหม่" }]} />
      <PageHeader title="สร้างงานใหม่" />
      <Card><CardContent className="p-6">
        <TaskForm companyId={companyId} projects={form.projects} departments={form.departments} workers={form.workers}
          defaults={{ projectId: searchParams.projectId ?? "", workerId: searchParams.workerId ?? "" }} />
      </CardContent></Card>
    </>
  );
}
