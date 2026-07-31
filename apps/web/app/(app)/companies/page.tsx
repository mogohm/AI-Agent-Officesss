import Link from "next/link";
import { listAccessibleCompanies } from "@/lib/data/companies";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

function tone(s: string) {
  return s === "ACTIVE" ? ("green" as const) : s === "PAUSED" ? ("amber" as const) : ("neutral" as const);
}

export default async function CompaniesPage() {
  let companies;
  try {
    companies = await listAccessibleCompanies({ includeArchived: true });
  } catch {
    return (
      <>
        <PageHeader title="Companies" />
        <ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" description="ตรวจสอบ PostgreSQL และ DATABASE_URL" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Companies"
        description="1 บริษัท = 1 ตึก · จัดการบริษัททั้งหมดที่คุณเข้าถึงได้"
        actions={<Button asChild><Link href="/companies/new">+ สร้างบริษัท</Link></Button>}
      />
      {companies.length === 0 ? (
        <EmptyState
          title="ยังไม่มีบริษัท"
          description="สร้างบริษัทแรกเพื่อเริ่มจัดการแผนก, AI workers และโปรเจกต์"
          action={<Button asChild><Link href="/companies/new">+ สร้างบริษัท</Link></Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {companies.map((c) => (
            <Card key={c.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-white">{c.name}</div>
                  <div className="truncate text-xs text-slate-400">{c.legalName ?? ""}</div>
                </div>
                <Badge tone={tone(c.status)}>{c.status.toLowerCase()}</Badge>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-1 text-center text-xs">
                <div><dt className="text-slate-500">Depts</dt><dd className="font-semibold text-slate-200">{formatNumber(c._count.departments)}</dd></div>
                <div><dt className="text-slate-500">Workers</dt><dd className="font-semibold text-slate-200">{formatNumber(c._count.workers)}</dd></div>
                <div><dt className="text-slate-500">Projects</dt><dd className="font-semibold text-slate-200">{formatNumber(c._count.projects)}</dd></div>
              </dl>
              <div className="mt-3 flex gap-2">
                <Button asChild size="sm" className="flex-1"><Link href={`/companies/${c.id}`}>เปิด</Link></Button>
                <Button asChild size="sm" variant="outline"><Link href={`/companies/${c.id}/settings`}>ตั้งค่า</Link></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
