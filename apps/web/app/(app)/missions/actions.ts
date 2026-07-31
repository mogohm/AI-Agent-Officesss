"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireDelivery } from "@/lib/data/missions";
import { transitionMission } from "@/lib/delivery/orchestrator";
import { enqueue, jobKeys, cancelMissionJobs } from "@/lib/delivery/queue";
import { toSafeError } from "@/lib/errors";
import { ok, fail, type ApiResult } from "@/lib/result";

/**
 * Mission control actions (§3). Server-authorized and idempotent. The web app
 * NEVER executes work — it only records intent and enqueues a durable job that
 * the persistent worker picks up.
 */

async function resolve(missionId: string) {
  return db.mission.findFirstOrThrow({
    where: { OR: [{ id: missionId }, { key: missionId }] },
    select: { id: true, key: true, status: true, iteration: true },
  });
}

export async function startMission(missionId: string): Promise<ApiResult<{ status: string }>> {
  try {
    const { userId } = await requireDelivery("mission.start");
    const m = await resolve(missionId);
    if (m.status !== "DRAFT" && m.status !== "PAUSED") {
      return fail("INVALID_STATE", `mission อยู่ในสถานะ ${m.status} — เริ่มใหม่ไม่ได้`);
    }
    await transitionMission({ missionId: m.id, to: "ANALYZING", reason: "started by owner from Mission Control", userId });
    await enqueue({
      jobKey: jobKeys.orchestrate(m.id, m.iteration),
      queue: "MISSION_ORCHESTRATION",
      payload: { missionId: m.id },
      missionId: m.id,
      correlationId: `${m.key}:start:${m.iteration}`,
    });
    revalidatePath(`/missions/${m.id}`); revalidatePath("/missions");
    return ok({ status: "ANALYZING" });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

export async function pauseMission(missionId: string): Promise<ApiResult<{ cancelledJobs: number }>> {
  try {
    const { userId } = await requireDelivery("mission.pause");
    const m = await resolve(missionId);
    // stop scheduling new work; in-flight jobs finish and are re-queued by policy
    const cancelledJobs = await cancelMissionJobs(m.id);
    await transitionMission({ missionId: m.id, to: "PAUSED", reason: "paused by owner", userId });
    revalidatePath(`/missions/${m.id}`); revalidatePath("/missions");
    return ok({ cancelledJobs });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

export async function resumeMission(missionId: string): Promise<ApiResult<{ status: string }>> {
  try {
    const { userId } = await requireDelivery("mission.start");
    const m = await resolve(missionId);
    if (m.status !== "PAUSED" && m.status !== "BLOCKED") {
      return fail("INVALID_STATE", `mission อยู่ในสถานะ ${m.status} — resume ไม่ได้`);
    }
    // consistency check: any work package left mid-flight returns to READY
    await db.workPackage.updateMany({
      where: { missionId: m.id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
      data: { status: "READY" },
    });
    await transitionMission({ missionId: m.id, to: "EXECUTING", reason: "resumed by owner", userId });
    await enqueue({
      jobKey: jobKeys.orchestrate(m.id, m.iteration + 1),
      queue: "MISSION_ORCHESTRATION",
      payload: { missionId: m.id },
      missionId: m.id,
      correlationId: `${m.key}:resume:${m.iteration + 1}`,
    });
    revalidatePath(`/missions/${m.id}`); revalidatePath("/missions");
    return ok({ status: "EXECUTING" });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}

export async function cancelMission(missionId: string): Promise<ApiResult<{ cancelledJobs: number }>> {
  try {
    const { userId } = await requireDelivery("mission.cancel");
    const m = await resolve(missionId);
    const cancelledJobs = await cancelMissionJobs(m.id);
    // evidence is preserved: nothing is deleted, only statuses change
    await db.agentRun.updateMany({ where: { missionId: m.id, status: { in: ["PENDING", "RUNNING"] } }, data: { status: "CANCELLED", completedAt: new Date() } });
    await transitionMission({ missionId: m.id, to: "CANCELLED", reason: "cancelled by owner", userId });
    revalidatePath(`/missions/${m.id}`); revalidatePath("/missions");
    return ok({ cancelledJobs });
  } catch (err) { const s = toSafeError(err); return fail(s.code, s.message); }
}
