// no server-only: this module is also imported by the standalone worker process
import type { Prisma } from "@prisma/client";
import { db } from "./db";

export type ActivityInput = {
  companyId?: string | null;
  userId?: string | null;
  workerId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/** Record an activity log entry. Never throws into the caller's happy path. */
export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    await db.activityLog.create({
      data: {
        companyId: input.companyId ?? null,
        userId: input.userId ?? null,
        workerId: input.workerId ?? null,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        action: input.action,
        message: input.message,
        metadata: input.metadata,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    // Logging must not break the mutation it describes.
    console.error("[activity] failed to write log", err);
  }
}
