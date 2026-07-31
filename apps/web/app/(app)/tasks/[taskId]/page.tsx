import Link from "next/link";
import { getTask } from "@/lib/data/tasks";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { TaskActions } from "@/components/tasks/TaskActions";
import { TaskLiveRefresh } from "@/components/tasks/TaskLiveRefresh";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function runTone(s: string) {
  return s === "SUCCEEDED" ? ("green" as const) : s === "FAILED" || s === "TIMED_OUT" ? ("red" as const) : s === "RUNNING" ? ("blue" as const) : ("neutral" as const);
}

export default async function TaskPage({ params }: { params: { taskId: string } }) {
  let data;
  try { data = await getTask(params.taskId); }
  catch { return (<><PageHeader title="Task" /><ErrorState title="ไม่พบงาน หรือไม่มีสิทธิ์" /></>); }
  const { task: t, role } = data;
  const canOperate = ["OWNER", "ADMIN", "MANAGER", "OPERATOR"].includes(role);

  return (
    <>
      <Breadcrumbs items={[{ label: "Tasks", href: "/tasks" }, { label: t.title }]} />
      <PageHeader
        title={t.title}
        description={`${t.company.name}${t.project ? " · " + t.project.name : ""}${t.worker ? " · " + t.worker.name : ""}`}
        actions={<>
          <TaskStatusBadge status={t.status} />
          <Badge tone={t.priority === "URGENT" || t.priority === "HIGH" ? "red" : "neutral"}>{t.priority.toLowerCase()}</Badge>
          <TaskLiveRefresh taskId={t.id} status={t.status} />
          {canOperate ? <TaskActions taskId={t.id} status={t.status} /> : null}
        </>}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card><CardHeader><CardTitle>คำสั่งงาน</CardTitle></CardHeader>
            <CardContent><pre className="whitespace-pre-wrap break-words text-xs text-slate-300">{t.instruction}</pre></CardContent></Card>
          {t.outputJson ? (
            <Card><CardHeader><CardTitle>ผลงาน (Output)</CardTitle></CardHeader>
              <CardContent><pre className="whitespace-pre-wrap break-words text-xs text-slate-300">{JSON.stringify(t.outputJson, null, 2)}</pre></CardContent></Card>
          ) : null}
          {t.errorJson ? (
            <Card className="border-red-500/20"><CardHeader><CardTitle className="text-red-300">Error</CardTitle></CardHeader>
              <CardContent><pre className="whitespace-pre-wrap break-words text-xs text-red-300">{JSON.stringify(t.errorJson, null, 2)}</pre></CardContent></Card>
          ) : null}
          <Card><CardHeader><CardTitle>Run History ({t.runs.length})</CardTitle></CardHeader>
            <CardContent>
              {t.runs.length === 0 ? <p className="text-xs text-slate-500">ยังไม่มีการรัน</p> : (
                <ul className="space-y-1.5">
                  {t.runs.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-white/10 px-3 py-2 text-xs">
                      <span className="text-slate-400">Attempt #{r.attemptNumber} · {r.model ?? "—"}</span>
                      <span className="text-slate-500">{r.totalTokens} tok · {formatCurrency(Number(r.actualCost), t.company.currency)}</span>
                      <Badge tone={runTone(r.status)}>{r.status.toLowerCase()}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent></Card>
        </div>
        <div className="space-y-4">
          <Card><CardHeader><CardTitle>รายละเอียด</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-slate-500">ต้องอนุมัติ</dt><dd className="text-right text-slate-200">{t.requiresApproval ? "ใช่" : "ไม่"}</dd>
                <dt className="text-slate-500">Retry</dt><dd className="text-right text-slate-200">{t.retryCount}/{t.maxRetries}</dd>
                <dt className="text-slate-500">Timeout</dt><dd className="text-right text-slate-200">{t.timeoutSeconds}s</dd>
                <dt className="text-slate-500">ต้นทุนจริง</dt><dd className="text-right text-slate-200">{formatCurrency(Number(t.actualCost), t.company.currency)}</dd>
              </dl>
            </CardContent></Card>
          {t.approvals.length > 0 ? (
            <Card><CardHeader><CardTitle>Approvals</CardTitle></CardHeader>
              <CardContent><ul className="space-y-1.5">
                {t.approvals.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-xs">
                    <Link href={`/approvals/${a.id}`} className="truncate text-slate-300 hover:text-white">{a.summary}</Link>
                    <Badge tone={a.status === "APPROVED" ? "green" : a.status === "REJECTED" ? "red" : "purple"}>{a.status.toLowerCase()}</Badge>
                  </li>
                ))}
              </ul></CardContent></Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
