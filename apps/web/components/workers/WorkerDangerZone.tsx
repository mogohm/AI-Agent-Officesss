"use client";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { pauseWorker, resumeWorker, archiveWorker } from "@/app/(app)/workers/actions";

export function WorkerDangerZone({ workerId, status }: { workerId: string; status: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  return (
    <div className="flex flex-wrap gap-2">
      {status === "ACTIVE" ? (
        <ConfirmButton variant="secondary" size="sm" title="พัก worker นี้?" confirmLabel="พัก"
          onConfirm={async () => { await pauseWorker(workerId); refresh(); }}>พัก</ConfirmButton>
      ) : status === "PAUSED" ? (
        <ConfirmButton variant="success" size="sm" title="เปิด worker นี้?" confirmLabel="เปิด"
          onConfirm={async () => { await resumeWorker(workerId); refresh(); }}>เปิด</ConfirmButton>
      ) : null}
      {status !== "ARCHIVED" ? (
        <ConfirmButton variant="destructive" size="sm" title="เก็บ worker เข้าคลัง?"
          description="ประวัติ tasks/usage จะไม่ถูกลบ" confirmLabel="Archive"
          onConfirm={async () => { await archiveWorker(workerId); router.push("/workers"); router.refresh(); }}>Archive</ConfirmButton>
      ) : null}
    </div>
  );
}
