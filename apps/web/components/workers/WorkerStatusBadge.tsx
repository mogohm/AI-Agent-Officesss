import { Badge } from "@/components/ui/badge";

const MAP: Record<string, "neutral" | "blue" | "green" | "amber" | "purple" | "red"> = {
  OFFLINE: "neutral",
  IDLE: "neutral",
  QUEUED: "blue",
  THINKING: "amber",
  WORKING: "blue",
  WAITING_APPROVAL: "purple",
  COMPLETED: "green",
  ERROR: "red",
};

export function WorkerStatusBadge({ status }: { status: string }) {
  return <Badge tone={MAP[status] ?? "neutral"}>{status.toLowerCase().replace(/_/g, " ")}</Badge>;
}
