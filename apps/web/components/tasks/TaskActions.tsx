"use client";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { queueTask, cancelTask, retryTask } from "@/app/(app)/tasks/actions";

export function TaskActions({ taskId, status }: { taskId: string; status: string }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const canQueue = status === "DRAFT" || status === "REVISION_REQUIRED";
  const canCancel = ["DRAFT", "QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(status);
  const canRetry = status === "FAILED";

  return (
    <div className="flex flex-wrap gap-2">
      {canQueue ? (
        <ConfirmButton size="sm" title="เข้าคิวงานนี้?" description="worker จะรับงานไปทำตามคิว" confirmLabel="เข้าคิว"
          onConfirm={async () => { await queueTask(taskId); refresh(); }}>เข้าคิว (Queue)</ConfirmButton>
      ) : null}
      {canRetry ? (
        <ConfirmButton size="sm" variant="secondary" title="ลองงานนี้ใหม่?" confirmLabel="ลองใหม่"
          onConfirm={async () => { await retryTask(taskId); refresh(); }}>ลองใหม่ (Retry)</ConfirmButton>
      ) : null}
      {canCancel ? (
        <ConfirmButton size="sm" variant="destructive" title="ยกเลิกงานนี้?" confirmLabel="ยกเลิก"
          onConfirm={async () => { await cancelTask(taskId); refresh(); }}>ยกเลิก</ConfirmButton>
      ) : null}
    </div>
  );
}
