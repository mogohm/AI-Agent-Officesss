"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startMission, pauseMission, resumeMission, cancelMission } from "@/app/(app)/missions/actions";

type Result = { success: boolean; error?: { message: string } };

/**
 * Mission control buttons. They only record intent — the persistent worker does
 * the work, so nothing here ever fakes progress.
 */
export function MissionControls({ missionId, status, canOperate }: { missionId: string; status: string; canOperate: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      setMsg(r.success ? "ส่งคำสั่งแล้ว — worker จะรับงานไปทำ" : (r.error?.message ?? "ทำรายการไม่สำเร็จ"));
      router.refresh();
    });

  if (!canOperate) return <span className="text-[11px] text-[#657A91]">ต้องมีสิทธิ์ DELIVERY_MANAGER ขึ้นไปจึงจะสั่งงานได้</span>;

  const canStart = status === "DRAFT";
  const canResume = status === "PAUSED" || status === "BLOCKED";
  const canPause = !["DRAFT", "PAUSED", "CANCELLED", "COMPLETED"].includes(status);
  const canCancel = !["CANCELLED", "COMPLETED"].includes(status);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canStart ? <Button size="sm" disabled={pending} onClick={() => run(() => startMission(missionId))}>▶ Start Mission</Button> : null}
      {canResume ? <Button size="sm" disabled={pending} onClick={() => run(() => resumeMission(missionId))}>▶ Resume</Button> : null}
      {canPause ? <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => pauseMission(missionId))}>⏸ Pause</Button> : null}
      {canCancel ? <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => cancelMission(missionId))}>■ Cancel</Button> : null}
      {msg ? <span className="text-[11px] text-[#9DB1C8]">{msg}</span> : null}
    </div>
  );
}
