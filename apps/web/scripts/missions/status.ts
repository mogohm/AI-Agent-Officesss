import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { selectSchedulable, findDependencyCycle, detectDeadlock, type SchedulableWorkPackage } from "@/lib/delivery/work-package-state";
import { evaluateSafety } from "@/lib/delivery/loop-safety";

/**
 * Read-only mission inspector. Runs the real orchestrator domain logic against
 * persisted state — the same functions the worker will call in phase 3.
 */
const KEY = process.argv[2] ?? "VISUAL-2026-001";
const prisma = new PrismaClient();

async function main() {
  const mission = await prisma.mission.findUnique({
    where: { key: KEY },
    include: {
      budget: true,
      workPackages: { include: { dependsOn: true }, orderBy: { key: "asc" } },
      gateResults: { orderBy: { evaluatedAt: "desc" } },
      _count: { select: { requirements: true, checkpoints: true, defects: true, agentRuns: true } },
    },
  });
  if (!mission) { console.error(`mission ${KEY} not found`); process.exit(1); }

  const packages: SchedulableWorkPackage[] = mission.workPackages.map((w) => ({
    id: w.key, status: w.status, role: w.role,
    dependsOnIds: w.dependsOn.map((d) => mission.workPackages.find((x) => x.id === d.dependsOnId)?.key ?? d.dependsOnId),
    attemptCount: w.attemptCount, maxAttempts: w.maxAttempts,
  }));

  const cycle = findDependencyCycle(packages);
  const eligible = selectSchedulable(packages, {
    maxWriters: mission.budget?.maxParallelWriters ?? 2,
    maxReaders: mission.budget?.maxParallelReaders ?? 4,
  });
  const elapsedMin = mission.startedAt ? (Date.now() - mission.startedAt.getTime()) / 60000 : 0;
  const safety = evaluateSafety({
    spentCostUsd: Number(mission.budget?.spentCostUsd ?? 0), maxCostUsd: Number(mission.budget?.maxCostUsd ?? 25),
    spentTokens: mission.budget?.spentTokens ?? 0, maxTokens: mission.budget?.maxTokens ?? 5_000_000,
    elapsedMin, maxDurationMin: mission.budget?.maxDurationMin ?? 480,
    iteration: mission.iteration, maxIterations: mission.maxIterations,
    identicalFailureStreak: 0, maxIdenticalFailures: mission.budget?.maxIdenticalFailures ?? 2,
    defectAttempts: 0, maxAttemptsPerDefect: mission.budget?.maxAttemptsPerDefect ?? 5,
    turnsWithoutProgress: 0, maxTurnsWithoutProgress: 3,
  });

  console.log(`mission      : ${mission.key} — ${mission.title}`);
  console.log(`status       : ${mission.status} (autonomy ${mission.autonomyLevel}, iteration ${mission.iteration})`);
  console.log(`requirements : ${mission._count.requirements}   checkpoints: ${mission._count.checkpoints}   defects: ${mission._count.defects}   agentRuns: ${mission._count.agentRuns}`);
  console.log(`budget       : $${Number(mission.budget?.spentCostUsd ?? 0).toFixed(4)} / $${Number(mission.budget?.maxCostUsd ?? 0).toFixed(2)}`);
  console.log(`dep cycle    : ${cycle ? cycle.join(" -> ") : "none"}`);
  console.log(`deadlock     : ${detectDeadlock(packages)}`);
  console.log(`safety       : ${safety ? `${safety.reason} — ${safety.detail}` : "ok"}`);
  console.log(`eligible now : ${eligible.length ? eligible.map((e) => e.id).join(", ") : "(none)"}`);
  console.log("gates        :");
  for (const g of mission.gateResults) console.log(`  ${g.kind.padEnd(20)} ${g.status}${g.blockingReasons.length ? " — " + g.blockingReasons.join("; ") : ""}`);
  console.log("packages     :");
  for (const w of mission.workPackages) {
    const deps = w.dependsOn.map((d) => mission.workPackages.find((x) => x.id === d.dependsOnId)?.key).filter(Boolean);
    console.log(`  ${w.key} ${w.status.padEnd(9)} ${w.role.padEnd(14)} ${deps.length ? "after " + deps.join("+") : ""}`);
  }
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
