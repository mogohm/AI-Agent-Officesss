import { spawn, execFile, type ChildProcess } from "node:child_process";

/**
 * Process-tree lifecycle (§4). The recurring defect was that stopping an
 * `npm run` wrapper left its `tsx` child alive serving stale code.
 *
 * Fix: spawn in its own process group (detached), record the pid/pgid, and on
 * stop terminate the whole TREE — never every node process on the machine.
 */

export type ManagedProcess = {
  child: ChildProcess;
  pid: number;
  /** On POSIX the process-group id equals the detached child's pid. */
  pgid: number | null;
  startedAt: Date;
};

export function spawnManaged(command: string, args: string[], opts: { cwd: string; env?: NodeJS.ProcessEnv }): ManagedProcess {
  const child = spawn(command, args, {
    cwd: opts.cwd,
    env: opts.env,
    shell: false,
    windowsHide: true,
    // POSIX: new process group so we can signal the whole tree.
    // Windows: detached creates a new process group for taskkill /T.
    detached: true,
  });
  if (!child.pid) throw new Error(`failed to spawn ${command}`);
  return { child, pid: child.pid, pgid: process.platform === "win32" ? null : child.pid, startedAt: new Date() };
}

/** Kill a whole process tree, targeting ONLY the recorded pid. */
export async function killTree(pid: number, opts: { graceMs?: number } = {}): Promise<{ terminated: boolean; escalated: boolean }> {
  const grace = opts.graceMs ?? 5000;
  let escalated = false;

  if (process.platform === "win32") {
    // taskkill /T kills the tree rooted at this pid only.
    await new Promise<void>((resolve) => execFile("taskkill", ["/pid", String(pid), "/T"], () => resolve()));
    if (await stillAlive(pid, grace)) {
      escalated = true;
      await new Promise<void>((resolve) => execFile("taskkill", ["/pid", String(pid), "/T", "/F"], () => resolve()));
    }
  } else {
    // negative pid = the process group created by detached spawn
    try { process.kill(-pid, "SIGTERM"); } catch { /* already gone */ }
    if (await stillAlive(pid, grace)) {
      escalated = true;
      try { process.kill(-pid, "SIGKILL"); } catch { /* already gone */ }
    }
  }
  return { terminated: !(await isAlive(pid)), escalated };
}

export function isAlive(pid: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (process.platform === "win32") {
      execFile("tasklist", ["/FI", `PID eq ${pid}`, "/NH"], (_e, stdout) => resolve(String(stdout).includes(String(pid))));
    } else {
      try { process.kill(pid, 0); resolve(true); } catch { resolve(false); }
    }
  });
}

async function stillAlive(pid: number, waitMs: number): Promise<boolean> {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    if (!(await isAlive(pid))) return false;
    await new Promise((r) => setTimeout(r, 250));
  }
  return isAlive(pid);
}

/**
 * Worker identity lock (§4): refuse to start a second instance with the same
 * identity while an existing heartbeat is fresh, so two workers cannot claim
 * the same leases.
 */
export function isHeartbeatStale(lastSeenAt: Date, staleAfterMs = 40_000): boolean {
  return Date.now() - lastSeenAt.getTime() > staleAfterMs;
}

export function buildWorkerIdentity(base: string, commit: string | null): string {
  return commit ? `${base}@${commit.slice(0, 8)}` : base;
}
