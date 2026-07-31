import Link from "next/link";
import { listApprovals } from "@/lib/data/approvals";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ApprovalStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "green" | "red" | "purple" | "neutral"> = { PENDING: "purple", APPROVED: "green", REJECTED: "red", CANCELLED: "neutral", EXPIRED: "neutral" };
const FILTERS: { label: string; value?: ApprovalStatus }[] = [
  { label: "รออนุมัติ", value: "PENDING" }, { label: "อนุมัติแล้ว", value: "APPROVED" }, { label: "ปฏิเสธ", value: "REJECTED" }, { label: "ทั้งหมด" },
];

export default async function ApprovalsPage({ searchParams }: { searchParams: { status?: string } }) {
  const status = (["PENDING", "APPROVED", "REJECTED", "CANCELLED", "EXPIRED"].includes(searchParams.status ?? "") ? searchParams.status : "PENDING") as ApprovalStatus | undefined;
  let approvals;
  try { approvals = await listApprovals(status ? { status } : undefined); }
  catch { return (<><PageHeader title="Approvals" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }

  return (
    <>
      <PageHeader title="Approvals" description="อนุมัติผลงาน AI ก่อนดำเนินการจริง — ผู้สร้างงานอนุมัติเองไม่ได้" />
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (status ?? undefined) === f.value || (!status && !f.value);
          return <Link key={f.label} href={f.value ? `/approvals?status=${f.value}` : "/approvals?status=ALL"} className={`rounded-full px-3 py-1 text-xs ${active ? "bg-blue-500 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}>{f.label}</Link>;
        })}
      </div>
      {approvals.length === 0 ? <EmptyState title="ไม่มีคำขออนุมัติ" /> : (
        <div className="space-y-2">
          {approvals.map((a) => (
            <Link key={a.id} href={`/approvals/${a.id}`}>
              <Card className="transition hover:bg-white/[0.03]">
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{a.summary}</div>
                    <div className="text-xs text-slate-400">{a.company.name} · {a.type.toLowerCase()} · {a.requestedByWorker?.name ?? "system"}</div>
                  </div>
                  <Badge tone={STATUS_TONE[a.status] ?? "neutral"}>{a.status.toLowerCase()}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
