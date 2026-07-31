"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED", "WAITING_APPROVAL", "REVISION_REQUIRED", "DRAFT"]);

/**
 * Polls the task status endpoint while the task is active (QUEUED/RUNNING) and
 * triggers a server refresh when the status changes. Stops once terminal.
 */
export function TaskLiveRefresh({ taskId, status }: { taskId: string; status: string }) {
  const router = useRouter();
  const last = useRef(status);

  useEffect(() => {
    if (TERMINAL.has(status)) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/status`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const next = json?.data?.status;
        if (alive && next && next !== last.current) { last.current = next; router.refresh(); }
      } catch { /* transient — retry next tick */ }
    };
    const id = setInterval(tick, 2500);
    return () => { alive = false; clearInterval(id); };
  }, [taskId, status, router]);

  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> อัปเดตอัตโนมัติ
    </span>
  );
}
