import "dotenv/config";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { rebuildManifest, buildEvidenceIndex } from "@/lib/delivery/agents/asset-manifest";
import { layout } from "@/lib/delivery/workspace";

/**
 * missions:rebuild-asset-manifest — reconstruct generation-manifest.json from
 * durable records + filesystem verification (§2). Read-only with respect to the
 * assets themselves; it only regenerates the projection.
 */
const MISSION = process.env.MISSION_KEY ?? "VISUAL-2026-001";
const WP = process.env.WP_KEY ?? "WP-002";
const prisma = new PrismaClient();

(async () => {
  const mission = await prisma.mission.findUniqueOrThrow({ where: { key: MISSION } });
  const wp = await prisma.workPackage.findFirstOrThrow({ where: { missionId: mission.id, key: WP } });
  const ws = await prisma.repositoryWorkspace.findFirst({ where: { missionId: mission.id, kind: "worktree", workPackageKey: WP } });
  const worktreePath = ws?.path ?? path.join(layout(MISSION).worktrees, WP);

  const { manifest, jsonPath } = await rebuildManifest({
    missionId: mission.id, missionKey: MISSION, workPackageId: wp.id, workPackageKey: WP,
    worktreePath, repositoryCommit: ws?.headSha ?? null,
  });

  const i = manifest.integrity;
  console.log(`manifest      : ${jsonPath}`);
  console.log(`required      : ${i.requiredAssets}`);
  console.log(`entries       : ${i.manifestEntries}`);
  console.log(`filesystem    : ${i.filesystemAssets}`);
  console.log(`reconstructed : ${i.reconstructedEntries}`);
  console.log(`missingFiles  : ${i.missingFiles.length ? i.missingFiles.join(", ") : "none"}`);
  console.log(`orphanFiles   : ${i.orphanFiles.length ? i.orphanFiles.join(", ") : "none"}`);
  console.log(`integrity     : ${i.integrityStatus}`);

  const idx = await buildEvidenceIndex(MISSION, WP);
  console.log(`evidence      : ${idx.items.filter((x) => x.exists).length}/${idx.items.length} present (complete=${idx.complete})`);
  for (const m of idx.items.filter((x) => !x.exists)) console.log(`  MISSING: ${m.path}`);
  await prisma.$disconnect();
})();
