// no server-only: this module is also imported by the standalone worker process
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { getAdapter } from "./adapters";
import type { AIProviderAdapter, ProviderCredentials } from "./types";
import { ProviderConnectionError } from "@/lib/errors";
import type { ProviderType } from "@prisma/client";

export type ResolvedExecution = {
  connectionId: string;
  adapter: AIProviderAdapter;
  model: string;
  providerType: ProviderType;
};

function creds(conn: { encryptedCredentials: string | null; baseUrl: string | null; organizationId: string | null }): ProviderCredentials {
  return {
    apiKey: conn.encryptedCredentials ? decryptSecret(conn.encryptedCredentials) : undefined,
    baseUrl: conn.baseUrl ?? undefined,
    organizationId: conn.organizationId ?? undefined,
  };
}

/**
 * Resolve which provider connection + model to use for a task, following the
 * hierarchy: task override → worker → department default → any company
 * connection. Returns a ready-to-use adapter (credentials decrypted server-side).
 */
export async function resolveExecution(taskId: string): Promise<ResolvedExecution> {
  const task = await db.agentTask.findUnique({
    where: { id: taskId },
    include: {
      worker: { include: { department: true } },
      department: true,
      company: true,
    },
  });
  if (!task) throw new ProviderConnectionError("ไม่พบงาน");

  const dept = task.department ?? task.worker?.department ?? null;
  const connectionId =
    task.providerOverrideId ||
    task.worker?.providerConnectionId ||
    dept?.defaultProviderId ||
    (await db.providerConnection.findFirst({ where: { companyId: task.companyId, status: "CONNECTED" }, select: { id: true } }))?.id ||
    (await db.providerConnection.findFirst({ where: { companyId: null, status: "CONNECTED" }, select: { id: true } }))?.id;

  if (!connectionId) throw new ProviderConnectionError("ไม่มี provider connection ที่พร้อมใช้งาน — ตั้งค่าใน Settings › Providers");

  const conn = await db.providerConnection.findUnique({ where: { id: connectionId } });
  if (!conn) throw new ProviderConnectionError("provider connection หาย");

  // Model: task override → worker model → department default → provider's first active model.
  let modelKey = task.modelOverride || undefined;
  if (!modelKey && task.worker?.modelId) modelKey = (await db.providerModel.findUnique({ where: { id: task.worker.modelId } }))?.modelKey;
  if (!modelKey && dept?.defaultModelId) modelKey = (await db.providerModel.findUnique({ where: { id: dept.defaultModelId } }))?.modelKey;
  if (!modelKey) modelKey = (await db.providerModel.findFirst({ where: { providerType: conn.providerType, isActive: true }, orderBy: { displayName: "asc" } }))?.modelKey;
  if (!modelKey) throw new ProviderConnectionError("ไม่พบโมเดลสำหรับ provider นี้");

  return { connectionId: conn.id, adapter: getAdapter(conn.providerType, creds(conn)), model: modelKey, providerType: conn.providerType };
}
