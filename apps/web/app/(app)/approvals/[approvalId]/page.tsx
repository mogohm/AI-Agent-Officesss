import Link from "next/link";
import { getApproval } from "@/lib/data/approvals";
import { getCurrentUser } from "@/lib/auth-helpers";
import { roleAtLeast } from "@/lib/roles";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApprovalDecision } from "@/components/approvals/ApprovalDecision";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "green" | "red" | "purple" | "neutral"> = { PENDING: "purple", APPROVED: "green", REJECTED: "red", CANCELLED: "neutral", EXPIRED: "neutral" };

function previewText(payload: unknown, run: { responsePayload?: unknown } | null): string {
  const p = payload as { preview?: string } | null;
  if (p?.preview) return p.preview;
  const r = run?.responsePayload as { text?: string } | undefined;
  return r?.text ?? "—";
}

export default async function ApprovalDetailPage({ params }: { params: { approvalId: string } }) {
  let data, user;
  try { [data, user] = await Promise.all([getApproval(params.approvalId), getCurrentUser()]); }
  catch { return (<><PageHeader title="Approval" /><ErrorState title="ไม่พบคำขอ หรือไม่มีสิทธิ์" /></>); }
  const { approval: a, role } = data;
  const selfCreated = !!(a.task.createdById && user && a.task.createdById === user.id);
  const canDecide = a.status === "PENDING" && roleAtLeast(role, "REVIEWER");

  return (
    <>
      <Breadcrumbs items={[{ label: "Approvals", href: "/approvals" }, { label: a.summary }]} />
      <PageHeader title={a.summary} description={`${a.company.name} · ${a.type.toLowerCase()}`}
        actions={<Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{a.status.toLowerCase()}</Badge>} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card><CardHeader><CardTitle>งานที่เกี่ยวข้อง</CardTitle></CardHeader>
            <CardContent>
              <Link href={`/tasks/${a.task.id}`} className="text-sm font-medium text-blue-300 hover:underline">{a.task.title}</Link>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-400">{a.task.instruction}</pre>
            </CardContent></Card>
          <Card><CardHeader><CardTitle>ผลงานที่รออนุมัติ</CardTitle></CardHeader>
            <CardContent><pre className="whitespace-pre-wrap break-words text-xs text-slate-200">{previewText(a.payload, a.taskRun)}</pre></CardContent></Card>
        </div>
        <div className="space-y-4">
          <Card><CardHeader><CardTitle>รายละเอียด</CardTitle></CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-y-2 text-sm">
                <dt className="text-slate-500">ร้องขอโดย</dt><dd className="text-right text-slate-200">{a.requestedByWorker?.name ?? "system"}</dd>
                <dt className="text-slate-500">โมเดล</dt><dd className="text-right text-slate-200">{a.taskRun?.model ?? "—"}</dd>
                <dt className="text-slate-500">Tokens</dt><dd className="text-right text-slate-200">{a.taskRun?.totalTokens ?? 0}</dd>
                <dt className="text-slate-500">ต้นทุน</dt><dd className="text-right text-slate-200">{formatCurrency(Number(a.taskRun?.actualCost ?? 0), a.company.currency)}</dd>
                {a.decidedByUser ? (<><dt className="text-slate-500">ตัดสินโดย</dt><dd className="text-right text-slate-200">{a.decidedByUser.name}</dd></>) : null}
                {a.decisionNote ? (<><dt className="text-slate-500">หมายเหตุ</dt><dd className="text-right text-slate-300">{a.decisionNote}</dd></>) : null}
              </dl>
            </CardContent></Card>
          {canDecide ? (
            <Card><CardHeader><CardTitle>การตัดสินใจ</CardTitle></CardHeader>
              <CardContent><ApprovalDecision approvalId={a.id} selfCreated={selfCreated} /></CardContent></Card>
          ) : a.status === "PENDING" ? (
            <Card><CardContent className="p-4 text-xs text-slate-400">ต้องมีสิทธิ์ Reviewer ขึ้นไปจึงจะตัดสินได้</CardContent></Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
