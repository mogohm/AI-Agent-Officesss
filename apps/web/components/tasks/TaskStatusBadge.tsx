import { Badge } from "@/components/ui/badge";

const MAP: Record<string, "neutral" | "blue" | "green" | "amber" | "purple" | "red"> = {
  DRAFT: "neutral",
  QUEUED: "blue",
  RUNNING: "blue",
  WAITING_APPROVAL: "purple",
  REVISION_REQUIRED: "amber",
  APPROVED: "green",
  COMPLETED: "green",
  FAILED: "red",
  CANCELLED: "neutral",
};

export function TaskStatusBadge({ status }: { status: string }) {
  return <Badge tone={MAP[status] ?? "neutral"}>{status.toLowerCase().replace(/_/g, " ")}</Badge>;
}
