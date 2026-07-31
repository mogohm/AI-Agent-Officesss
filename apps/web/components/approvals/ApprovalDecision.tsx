"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { approveApproval, rejectApproval, requestRevision } from "@/app/(app)/approvals/actions";

/**
 * Decision panel. Disabled entirely when `selfCreated` — the API rejects
 * self-approval too, but hiding the controls makes the rule visible.
 */
export function ApprovalDecision({ approvalId, selfCreated }: { approvalId: string; selfCreated: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (selfCreated) {
    return <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">คุณเป็นผู้สร้างงานนี้ จึงไม่สามารถอนุมัติเองได้ — ต้องให้ผู้อื่นตรวจ</p>;
  }

  const run = (fn: () => Promise<{ success: boolean; error?: { message: string } }>) =>
    start(async () => { setErr(null); const r = await fn(); if (!r.success) setErr(r.error?.message ?? "ทำรายการไม่สำเร็จ"); else router.refresh(); });

  return (
    <div className="space-y-3">
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="หมายเหตุการตัดสินใจ (บังคับสำหรับขอแก้ไข)"
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-400" />
      {err ? <p className="text-xs text-red-400">{err}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => approveApproval(approvalId, note))}>อนุมัติ</Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => requestRevision(approvalId, note))}>ขอแก้ไข</Button>
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => rejectApproval(approvalId, note))}>ปฏิเสธ</Button>
      </div>
    </div>
  );
}
