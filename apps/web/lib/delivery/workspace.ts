import fs from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { runCommand } from "./command-runner";

/**
 * Mission workspace + git worktree isolation (§6/§12).
 *
 *   workspaces/missions/<KEY>/base/            single clone
 *                            worktrees/<WP>/   one per work package
 *                            artifacts/<WP>/   evidence
 *                            logs/
 *
 * Never touches the production checkout, never writes to master.
 */

export function missionRoot(missionKey: string): string {
  const repoRoot = path.resolve(process.cwd(), "..", "..");
  return path.join(repoRoot, "workspaces", "missions", missionKey);
}

export const layout = (missionKey: string) => {
  const root = missionRoot(missionKey);
  return {
    root,
    base: path.join(root, "base"),
    worktrees: path.join(root, "worktrees"),
    artifacts: path.join(root, "artifacts"),
    logs: path.join(root, "logs"),
  };
};

async function exists(p: string): Promise<boolean> {
  try { await fs.access(p); return true; } catch { return false; }
}

/**
 * Prepare the mission's base checkout. Uses the local repository as the clone
 * source when available so the slice does not require network/GitHub
 * credentials (which are a later phase); falls back to the remote URL.
 */
export async function prepareBaseWorkspace(opts: {
  missionId: string;
  missionKey: string;
  repositoryUrl: string;
  baseBranch: string;
}): Promise<{ path: string; headSha: string | null; source: "local" | "remote" }> {
  const l = layout(opts.missionKey);
  await fs.mkdir(l.worktrees, { recursive: true });
  await fs.mkdir(l.artifacts, { recursive: true });
  await fs.mkdir(l.logs, { recursive: true });

  const localRepo = path.resolve(process.cwd(), "..", "..");
  const source: "local" | "remote" = (await exists(path.join(localRepo, ".git"))) ? "local" : "remote";

  if (!(await exists(path.join(l.base, ".git")))) {
    await fs.mkdir(l.root, { recursive: true });
    // git clone is intentionally NOT routed through the allowlisted runner:
    // it is a privileged setup step performed by the worker itself, with a
    // fixed argument vector (no agent input can reach it).
    const { execFile } = await import("node:child_process");
    const src = source === "local" ? localRepo : opts.repositoryUrl;
    await new Promise<void>((resolve, reject) => {
      execFile("git", ["clone", "--no-hardlinks", src, l.base], { windowsHide: true }, (err) =>
        err ? reject(err) : resolve());
    });
  }

  const head = await runCommand({
    executable: "git", args: ["rev-parse", "HEAD"], cwd: l.base,
    workspaceRoot: l.root, missionId: opts.missionId, toolName: "workspace.headSha",
  });
  const headSha = head.ok ? head.stdout.trim() : null;

  await db.repositoryWorkspace.upsert({
    where: { missionId_path: { missionId: opts.missionId, path: l.base } },
    update: { headSha, branch: opts.baseBranch, clean: true },
    create: { missionId: opts.missionId, kind: "base", path: l.base, branch: opts.baseBranch, headSha },
  });

  return { path: l.base, headSha, source };
}

/**
 * Create an isolated read-only worktree for a work package. Detached HEAD, so
 * nothing can accidentally commit to a branch during a read-only round.
 */
export async function createWorktree(opts: {
  missionId: string;
  missionKey: string;
  workPackageKey: string;
  ref?: string;
}): Promise<{ path: string; headSha: string | null }> {
  const l = layout(opts.missionKey);
  const wtPath = path.join(l.worktrees, opts.workPackageKey);

  if (!(await exists(wtPath))) {
    const add = await runCommand({
      executable: "git",
      args: ["worktree", "add", "--detach", wtPath, opts.ref ?? "HEAD"],
      cwd: l.base, workspaceRoot: l.root, missionId: opts.missionId, toolName: "workspace.worktreeAdd",
    });
    if (!add.ok) throw new Error(`worktree creation failed: ${add.blocked ?? add.stderr.slice(0, 300)}`);
  }

  const head = await runCommand({
    executable: "git", args: ["rev-parse", "HEAD"], cwd: wtPath,
    workspaceRoot: l.root, missionId: opts.missionId, toolName: "workspace.worktreeSha",
  });
  const headSha = head.ok ? head.stdout.trim() : null;

  await db.repositoryWorkspace.upsert({
    where: { missionId_path: { missionId: opts.missionId, path: wtPath } },
    update: { headSha, clean: true },
    create: { missionId: opts.missionId, kind: "worktree", workPackageKey: opts.workPackageKey, path: wtPath, headSha },
  });

  return { path: wtPath, headSha };
}

/** Artifact directory for a work package (the only writable location). */
export async function artifactDir(missionKey: string, workPackageKey: string): Promise<string> {
  const dir = path.join(layout(missionKey).artifacts, workPackageKey);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function writeArtifact(missionKey: string, workPackageKey: string, name: string, content: string): Promise<string> {
  const dir = await artifactDir(missionKey, workPackageKey);
  const target = path.join(dir, name);
  // artifacts may only be written inside the mission's artifact directory
  if (!path.resolve(target).startsWith(path.resolve(dir))) throw new Error("artifact path escapes artifact directory");
  await fs.writeFile(target, content, "utf8");
  return target;
}
