import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/** Show the most recent agent runs, failed jobs and blocked tool calls. */
const prisma = new PrismaClient();
(async () => {
  const runs = await prisma.agentRun.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
  console.log("--- agent runs ---");
  for (const r of runs) console.log(`${r.role} ${r.status} $${Number(r.costUsd).toFixed(4)} :: ${(r.outputSummary ?? r.error ?? "").slice(0, 160)}`);

  const jobs = await prisma.queueJob.findMany({ orderBy: { updatedAt: "desc" }, take: 5 });
  console.log("--- jobs ---");
  for (const j of jobs) console.log(`${j.status} a${j.attempt} ${j.jobKey} :: ${(j.lastError ?? "").slice(0, 180)}`);

  const tools = await prisma.agentToolExecution.findMany({ orderBy: { startedAt: "desc" }, take: 8 });
  console.log("--- tool executions ---");
  for (const t of tools) console.log(`${t.executable} ${t.args.slice(0, 3).join(" ")} exit=${t.exitCode} blocked=${t.blocked} ${(t.blockReason ?? t.stderrTail ?? "").slice(0, 140)}`);
  await prisma.$disconnect();
})();
