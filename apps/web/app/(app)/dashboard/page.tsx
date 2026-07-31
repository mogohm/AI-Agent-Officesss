import Link from "next/link";
import { Building2, Layers as LayersIcon, Bot, Wifi, Briefcase, ShieldCheck, AlertTriangle, DollarSign } from "lucide-react";
import { getDashboardMetrics, getCompanyOverview } from "@/lib/data/dashboard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { CompanyBuildingCard } from "@/components/companies/CompanyBuildingCard";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let metrics, companies;
  try {
    [metrics, companies] = await Promise.all([getDashboardMetrics(), getCompanyOverview()]);
  } catch (err) {
    return (
      <>
        <PageHeader title="Dashboard" description="ภาพรวมระบบ AI Agent Office" />
        <ErrorState
          title="เชื่อมต่อฐานข้อมูลไม่ได้"
          description="ตรวจสอบ DATABASE_URL และว่า PostgreSQL ทำงานอยู่ (เช่น docker compose up db) แล้วรัน migrate/seed"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description="ภาพรวมทุกบริษัทที่คุณเข้าถึงได้" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <MetricCard icon={Building2} label="Companies" value={metrics.companies} tone="blue" />
        <MetricCard icon={LayersIcon} label="Departments" value={metrics.departments} tone="slate" />
        <MetricCard icon={Bot} label="AI Workers" value={metrics.workers} tone="purple" />
        <MetricCard icon={Wifi} label="Online" value={metrics.onlineWorkers} tone="green" />
        <MetricCard icon={Briefcase} label="Active Tasks" value={metrics.activeTasks} tone="blue" />
        <MetricCard icon={ShieldCheck} label="Waiting Approval" value={metrics.waitingApprovals} tone="amber" />
        <MetricCard icon={AlertTriangle} label="Failed Tasks" value={metrics.failedTasks} tone="red" />
        <MetricCard icon={DollarSign} label="This Month" value={formatCurrency(metrics.monthCost)} tone="green" />
      </div>

      <section className="mt-5">
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#3ABEF9]" />
            <h2 className="text-sm font-bold text-[#F4F7FB]">หน้ารวมบริษัท</h2>
            <span className="text-[11px] text-[#657A91]">1 ตึก = 1 บริษัท</span>
          </div>
          <Button asChild variant="outline" size="sm"><Link href="/companies">จัดการบริษัท</Link></Button>
        </div>
        {companies.length === 0 ? (
          <EmptyState
            title="ยังไม่มีบริษัท"
            description="สร้างบริษัทแรกเพื่อเริ่มจัดการแผนกและ AI workers"
            action={<Button asChild><Link href="/companies/new">+ สร้างบริษัท</Link></Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {companies.map((c, i) => (
              <CompanyBuildingCard
                key={c.id}
                selected={i === 0}
                company={{ id: c.id, name: c.name, legalName: c.legalName, status: c.status, departments: c.departments, workers: c.workers, activeTasks: c.activeTasks }}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
