import { db } from "@/lib/db";
import { canPerform } from "./roles";
import type { DeliveryRole } from "@prisma/client";

/**
 * Owner-authorized mission duration extension (Stage A).
 *
 * The TIME_EXCEEDED block is legitimate — it is never bypassed or silently
 * reset. Only an explicit, audited OWNER decision raises the limit, and elapsed
 * time and historical timestamps are left untouched.
 */

export class DurationExtensionDenied extends Error {
  constructor(public readonly role: DeliveryRole) {
    super(`role ${role} is not authorised to extend mission duration`);
    this.name = "DurationExtensionDenied";
  }
}

export const REQUIRED_EXTENSION_REASON =
  "WP-001 and WP-002 passed their quality gates. Owner authorizes additional time " +
  "for delivery hardening, restricted frontend execution, QA and UAT preparation.";

/** Only OWNER may extend; DELIVERY_MANAGER explicitly may not. */
export function canExtendDuration(role: DeliveryRole): boolean {
  return role === "OWNER" && canPerform(role, "mission.start");
}

export async function extendMissionDuration(input: {
  missionKey: string;
  newDurationLimitMinutes: number;
  actorRole: DeliveryRole;
  actorUserId: string;
  reason: string;
  correlationId: string;
}) {
  if (!canExtendDuration(input.actorRole)) throw new DurationExtensionDenied(input.actorRole);

  const mission = await db.mission.findUniqueOrThrow({
    where: { key: input.missionKey },
    include: { budget: true },
  });
  const previous = mission.budget?.maxDurationMin ?? 480;
  if (input.newDurationLimitMinutes <= previous) {
    throw new Error(`new limit ${input.newDurationLimitMinutes} must exceed the current ${previous}`);
  }

  // elapsed is derived from startedAt and is NEVER rewritten
  const elapsedMinutesAtApproval = mission.startedAt
    ? Math.round((Date.now() - mission.startedAt.getTime()) / 60000)
    : 0;

  await db.missionBudget.update({
    where: { missionId: mission.id },
    data: { maxDurationMin: input.newDurationLimitMinutes },
  });

  const record = {
    missionId: mission.id,
    previousDurationLimitMinutes: previous,
    newDurationLimitMinutes: input.newDurationLimitMinutes,
    elapsedMinutesAtApproval,
    approvedByUserId: input.actorUserId,
    reason: input.reason,
    createdAt: new Date().toISOString(),
    correlationId: input.correlationId,
  };

  await db.missionAuditLog.create({
    data: {
      missionId: mission.id, userId: input.actorUserId,
      action: "MISSION_DURATION_EXTENDED", entityType: "mission", entityId: mission.id,
      fromState: `maxDurationMin=${previous}`, toState: `maxDurationMin=${input.newDurationLimitMinutes}`,
      reason: input.reason, evidence: record as object,
    },
  });

  // clear ONLY a TIME_EXCEEDED block; every other safety reason stays in force
  let cleared = false;
  if (mission.status === "BLOCKED" && mission.blockedReason === "TIME_EXCEEDED"
      && elapsedMinutesAtApproval < input.newDurationLimitMinutes) {
    await db.mission.update({
      where: { id: mission.id },
      data: { status: "EXECUTING", blockedReason: "NONE", blockedDetail: null },
    });
    cleared = true;
  }

  return { ...record, timeExceededCleared: cleared };
}
