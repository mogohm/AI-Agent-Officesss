import Link from "next/link";
import { getWorker } from "@/lib/data/workers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkerStatusBadge } from "@/components/workers/WorkerStatusBadge";
import { toolRisk } from "@/lib/tools";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WorkerPage({ params }: { params: { workerId: string } }) {
  let data;
  try { data = await getWorker(params.workerId); }
  catch { return (<><PageHeader title="Worker" /><ErrorState title="ไม่พบ worker หรือไม่มีสิทธิ์" /></>); }
  const { worker: w } = data;

  return (
    <>
      <Breadcrumbs items={[{ label: "Workers", href: "/workers" }, { label: w.name }]} />
      <PageHeader
        title={w.name}
        description={`${w.role} · ${w.company.name}${w.department ? " · " + w.department.name : ""}`}
        actions={<><WorkerStatusBadge status={w.runtimeStatus} /><Button asChild variant="outline" size="sm"><Link href={`/workers/${w.id}/settings`}>ตั้งค่า</Link></Button></>}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>System Prompt</CardTitle></CardHeader>
          <CardContent><pre className="whitespace-pre-wrap break-words text-xs text-slate-300">{w.systemPrompt || "— ยังไม่ตั้งค่า —"}</pre></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Config</CardTitle></CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">สถานะธุรกิจ</dt><dd className="text-right text-slate-200">{w.status.toLowerCase()}</dd>
              <dt className="text-slate-500">Temperature</dt><dd className="text-right text-slate-200">{w.temperature}</dd>
              <dt className="text-slate-500">Max tokens</dt><dd className="text-right text-slate-200">{w.maxOutputTokens}</dd>
              <dt className="text-slate-500">งบ/เดือน</dt><dd className="text-right text-slate-200">{w.monthlyBudget ? formatCurrency(Number(w.monthlyBudget), w.company.currency) : "—"}</dd>
              <dt className="text-slate-500">ใช้ไปเดือนนี้</dt><dd className="text-right text-slate-200">{formatCurrency(Number(w.currentMonthCost), w.company.currency)}</dd>
              <dt className="text-slate-500">Tasks</dt><dd className="text-right text-slate-200">{w._count.tasks}</dd>
              <dt className="text-slate-500">ต้องอนุมัติ</dt><dd className="text-right text-slate-200">{w.requiresDefaultApproval ? "ใช่" : "ไม่"}</dd>
            </dl>
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {w.skills.length === 0 ? <span className="text-xs text-slate-500">—</span> : w.skills.map((s) => <Badge key={s} tone="blue">{s}</Badge>)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Tool Permissions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {w.toolPermissions.length === 0 ? <span className="text-xs text-slate-500">—</span> : w.toolPermissions.map((t) => {
              const r = toolRisk(t);
              return <Badge key={t} tone={r === "HIGH" ? "red" : r === "MEDIUM" ? "amber" : "green"}>{t}</Badge>;
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
