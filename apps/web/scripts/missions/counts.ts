import "dotenv/config";
import { PrismaClient } from "@prisma/client";

/** Migration safety check (§13): dump mission counts before and after. */
const prisma = new PrismaClient();
(async () => {
  const m = await prisma.mission.findUnique({
    where: { key: "VISUAL-2026-001" },
    include: { _count: { select: { requirements: true, workPackages: true, checkpoints: true, gateResults: true } } },
  });
  const [criteria, deps, traces] = await Promise.all([
    prisma.acceptanceCriterion.count({ where: { requirement: { mission: { key: "VISUAL-2026-001" } } } }),
    prisma.workPackageDependency.count({ where: { workPackage: { mission: { key: "VISUAL-2026-001" } } } }),
    prisma.requirementTrace.count({ where: { criterion: { requirement: { mission: { key: "VISUAL-2026-001" } } } } }),
  ]);
  console.log(JSON.stringify({
    missionId: m?.id ?? null, status: m?.status ?? null,
    requirements: m?._count.requirements ?? 0, criteria,
    workPackages: m?._count.workPackages ?? 0, dependencies: deps,
    checkpoints: m?._count.checkpoints ?? 0, gateResults: m?._count.gateResults ?? 0, traces,
  }));
  await prisma.$disconnect();
})();
