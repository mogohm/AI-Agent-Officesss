import { db } from "@/lib/db";

/**
 * Mission activity events (§11/§24). Persisted first — the SSE stream is derived
 * from these rows, so a reconnecting client can replay from `seq` and never
 * depends on live delivery.
 */
export type MissionEventType =
  | "mission.updated" | "work_package.started" | "work_package.updated"
  | "agent.started" | "agent.tool.started" | "agent.tool.completed"
  | "agent.completed" | "agent.failed" | "evidence.created"
  | "quality_gate.updated" | "worker.heartbeat";

export async function emit(missionId: string, type: MissionEventType, payload: Record<string, unknown> = {}): Promise<void> {
  try {
    await db.missionEvent.create({ data: { missionId, type, payload: payload as object } });
  } catch {
    // never let telemetry break execution
  }
}

export async function readEvents(missionId: string, afterSeq = 0n, take = 200) {
  return db.missionEvent.findMany({
    where: { missionId, seq: { gt: afterSeq } },
    orderBy: { seq: "asc" },
    take,
  });
}
