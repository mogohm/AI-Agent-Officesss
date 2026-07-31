import { db } from "@/lib/db";
import { resolveExecution } from "@/lib/ai-core/resolve";
import { computeCost } from "@/lib/pricing";
import { logActivity } from "@/lib/activity";
import { logger } from "@/lib/logger";
import { startOfMonth } from "@/lib/date";
import { Prisma } from "@prisma/client";

/**
 * Execute a single QUEUED task end-to-end. Idempotent lock via a conditional
 * update, so two workers never run the same task. Records a TaskRun + usage,
 * drives the task/worker state machine, handles timeout, retry and approval.
 */
export async function executeQueuedTask(taskId: string): Promise<"ran" | "skipped"> {
  // ---- lock (QUEUED → RUNNING atomically) ----
  const lock = await db.agentTask.updateMany({ where: { id: taskId, status: "QUEUED" }, data: { status: "RUNNING", startedAt: new Date() } });
  if (lock.count === 0) return "skipped";

  const task = await db.agentTask.findUnique({ where: { id: taskId }, include: { worker: true } });
  if (!task) return "skipped";
  const workerId = task.workerId;

  // ---- budget guard ----
  // Only enforce when a POSITIVE budget is set. Note: Prisma Decimal(0) is a
  // truthy object, so `budget &&` would wrongly fire at zero — compare numbers.
  const usageAgg = await db.usageRecord.aggregate({ where: { companyId: task.companyId, recordedAt: { gte: startOfMonth() } }, _sum: { totalCost: true } });
  const company = await db.company.findUnique({ where: { id: task.companyId }, select: { monthlyBudget: true } });
  const monthlyBudget = Number(company?.monthlyBudget ?? 0);
  if (monthlyBudget > 0 && Number(usageAgg._sum.totalCost ?? 0) >= monthlyBudget) {
    await db.agentTask.update({ where: { id: taskId }, data: { status: "FAILED", failedAt: new Date(), errorJson: { code: "BUDGET_EXCEEDED", message: "งบประมาณบริษัทเดือนนี้เต็ม" } } });
    if (workerId) await db.aIWorker.update({ where: { id: workerId }, data: { runtimeStatus: "IDLE" } });
    await logActivity({ companyId: task.companyId, workerId, entityType: "task", entityId: taskId, action: "budget.exceeded", message: "งบเต็ม — งานถูกบล็อก" });
    return "ran";
  }

  if (workerId) await db.aIWorker.update({ where: { id: workerId }, data: { runtimeStatus: "WORKING", lastActiveAt: new Date() } });
  const attemptNumber = (await db.taskRun.count({ where: { taskId } })) + 1;
  const run = await db.taskRun.create({ data: { taskId, attemptNumber, workerId, status: "RUNNING", queuedAt: task.scheduledAt, startedAt: new Date() } });
  const t0 = Date.now();

  try {
    const resolved = await resolveExecution(taskId);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), task.timeoutSeconds * 1000);
    let resp;
    try {
      resp = await resolved.adapter.execute({
        model: resolved.model,
        systemPrompt: task.worker?.systemPrompt ?? undefined,
        userPrompt: task.instruction,
        temperature: task.worker?.temperature,
        maxOutputTokens: task.worker?.maxOutputTokens,
        signal: ctrl.signal,
      });
    } finally { clearTimeout(timer); }

    const price = await db.providerModel.findFirst({ where: { providerType: resolved.providerType, modelKey: resolved.model } });
    const cost = computeCost(resp.promptTokens, resp.completionTokens, Number(price?.inputPer1k ?? 0), Number(price?.outputPer1k ?? 0));
    const durationMs = Date.now() - t0;
    const needsApproval = task.requiresApproval;

    await db.$transaction(async (tx) => {
      await tx.taskRun.update({
        where: { id: run.id },
        data: {
          status: "SUCCEEDED", model: resolved.model, providerConnectionId: resolved.connectionId,
          responsePayload: { text: resp.text.slice(0, 20000) },
          promptTokens: resp.promptTokens, completionTokens: resp.completionTokens, totalTokens: resp.totalTokens,
          actualCost: new Prisma.Decimal(cost.totalCost), completedAt: new Date(), durationMs,
        },
      });
      await tx.usageRecord.create({
        data: {
          companyId: task.companyId, departmentId: task.departmentId, projectId: task.projectId, workerId, taskId, taskRunId: run.id,
          providerType: resolved.providerType, model: resolved.model,
          promptTokens: resp.promptTokens, completionTokens: resp.completionTokens, totalTokens: resp.totalTokens,
          inputCost: new Prisma.Decimal(cost.inputCost), outputCost: new Prisma.Decimal(cost.outputCost), totalCost: new Prisma.Decimal(cost.totalCost),
        },
      });
      await tx.agentTask.update({
        where: { id: taskId },
        data: {
          status: needsApproval ? "WAITING_APPROVAL" : "COMPLETED",
          outputJson: { text: resp.text.slice(0, 20000) },
          actualCost: { increment: new Prisma.Decimal(cost.totalCost) },
          completedAt: needsApproval ? null : new Date(),
        },
      });
      if (workerId) {
        await tx.aIWorker.update({ where: { id: workerId }, data: { runtimeStatus: needsApproval ? "WAITING_APPROVAL" : "IDLE", currentMonthCost: { increment: new Prisma.Decimal(cost.totalCost) } } });
      }
      if (needsApproval) {
        await tx.approval.create({
          data: {
            companyId: task.companyId, taskId, taskRunId: run.id, type: "TASK_OUTPUT", status: "PENDING",
            requestedByWorkerId: workerId, summary: `อนุมัติผลงาน: ${task.title}`,
            payload: { preview: resp.text.slice(0, 2000) },
          },
        });
      }
    });

    await logActivity({ companyId: task.companyId, workerId, entityType: "task", entityId: taskId, action: needsApproval ? "task.waiting_approval" : "task.completed", message: needsApproval ? `รอการอนุมัติ: ${task.title}` : `เสร็จงาน: ${task.title}`, metadata: { tokens: resp.totalTokens, cost: cost.totalCost } });
    logger.info("task executed", { taskId, action: "task.completed", durationMs, companyId: task.companyId });
    return "ran";
  } catch (err) {
    const message = err instanceof Error ? err.message : "execution failed";
    const canRetry = task.retryCount < task.maxRetries;
    await db.taskRun.update({ where: { id: run.id }, data: { status: "FAILED", errorPayload: { message: message.slice(0, 1000) }, completedAt: new Date(), durationMs: Date.now() - t0 } });
    await db.agentTask.update({
      where: { id: taskId },
      data: { status: canRetry ? "QUEUED" : "FAILED", retryCount: { increment: 1 }, failedAt: canRetry ? null : new Date(), errorJson: { message: message.slice(0, 1000) }, ...(canRetry ? { scheduledAt: new Date(Date.now() + 5000) } : {}) },
    });
    if (workerId) await db.aIWorker.update({ where: { id: workerId }, data: { runtimeStatus: canRetry ? "QUEUED" : "ERROR" } });
    await logActivity({ companyId: task.companyId, workerId, entityType: "task", entityId: taskId, action: canRetry ? "task.retry_scheduled" : "task.failed", message: `${task.title}: ${message.slice(0, 120)}` });
    logger.error("task failed", { taskId, action: "task.failed", companyId: task.companyId });
    return "ran";
  }
}
