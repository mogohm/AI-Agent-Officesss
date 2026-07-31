import Link from "next/link";
import { listAccessibleCompanies } from "@/lib/data/companies";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { CompanyBuildingCardCompact } from "@/components/companies/CompanyBuildingCard";
import { showTestDataFrom, canToggleTestData } from "@/lib/test-data";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({ searchParams }: { searchParams: { showTestData?: string } }) {
  const showTest = showTestDataFrom(searchParams);
  let companies;
  try {
    companies = await listAccessibleCompanies({ includeArchived: true, showTestData: showTest });
  } catch {
    return (
      <>
        <PageHeader title="บริษัท" />
        <ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" description="ตรวจสอบ PostgreSQL และ DATABASE_URL" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="บริษัท"
        description="1 บริษัท = 1 ตึก · จัดการบริษัททั้งหมดที่คุณเข้าถึงได้"
        actions={
          <>
            {canToggleTestData() ? (
              <Link
                href={showTest ? "/companies" : "/companies?showTestData=1"}
                className={`rounded-md border px-2 py-1 text-[11px] transition ${showTest ? "border-[#F0B84B] text-[#F0B84B]" : "border-[#244768] text-[#657A91] hover:text-[#9DB1C8]"}`}
              >
                แสดงข้อมูลทดสอบ
              </Link>
            ) : null}
            <Button asChild><Link href="/companies/new">+ สร้างบริษัท</Link></Button>
          </>
        }
      />
      {companies.length === 0 ? (
        <EmptyState
          title="ยังไม่มีบริษัท"
          description="สร้างบริษัทแรกเพื่อเริ่มจัดการแผนก, AI workers และโปรเจกต์"
          action={<Button asChild><Link href="/companies/new">+ สร้างบริษัท</Link></Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {companies.map((c) => (
            <CompanyBuildingCardCompact
              key={c.id}
              company={{
                id: c.id, name: c.name, legalName: c.legalName, status: c.status,
                departments: c._count.departments, workers: c._count.workers, projects: c._count.projects,
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
