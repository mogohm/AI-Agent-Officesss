import { spawn, type ChildProcess } from "node:child_process";
import { db } from "@/lib/db";
import { validateCommand, buildChildEnv, redact } from "./command-policy";
import { DEFAULT_LIMITS } from "./loop-safety";

/**
 * Safe command runner. The ONLY place in the codebase that spawns a process.
 * Never imported by the web app — worker-side only (enforced structurally by
 * living under lib/delivery and only being imported from worker/delivery).
 */

export type RunResult = {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
  blocked?: string;
};

const MAX_OUTPUT = 200_000; // cap persisted output (§14 output size limit)

export async function runCommand(opts: {
  executable: string;
  args: string[];
  cwd: string;
  workspaceRoot: string;
  missionId: string;
  agentRunId?: string;
  toolName?: string;
  timeoutMs?: number;
}): Promise<RunResult> {
  const started = Date.now();
  const verdict = validateCommand(opts);

  if (!verdict.allowed) {
    // A refused command is still auditable evidence (§12: invalid command is
    // rejected AND audited).
    await db.agentToolExecution.create({
      data: {
        missionId: opts.missionId, agentRunId: opts.agentRunId ?? null,
        toolName: opts.toolName ?? "shell", executable: opts.executable, args: opts.args,
        cwd: opts.cwd, blocked: true, blockReason: verdict.reason, completedAt: new Date(), durationMs: 0,
      },
    });
    return { ok: false, exitCode: null, stdout: "", stderr: "", timedOut: false, durationMs: 0, blocked: verdict.reason };
  }

  const timeoutMs = Math.min(opts.timeoutMs ?? DEFAULT_LIMITS.maxShellCommandMs, DEFAULT_LIMITS.maxShellCommandMs);
  const exec = await db.agentToolExecution.create({
    data: {
      missionId: opts.missionId, agentRunId: opts.agentRunId ?? null,
      toolName: opts.toolName ?? "shell", executable: opts.executable, args: opts.args, cwd: opts.cwd,
    },
  });

  const result = await new Promise<RunResult>((resolve) => {
    // shell:false — arguments are passed as an array, so shell metacharacters
    // in an argument can never be interpreted (defence in depth with the policy).
    const child: ChildProcess = spawn(opts.executable, opts.args, {
      cwd: opts.cwd,
      env: buildChildEnv(process.env) as NodeJS.ProcessEnv,
      shell: false,
      windowsHide: true,
    });

    let stdout = "", stderr = "", timedOut = false, settled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill("SIGKILL"); } catch { /* already gone */ }
    }, timeoutMs);

    child.stdout?.on("data", (d: Buffer) => { if (stdout.length < MAX_OUTPUT) stdout += d.toString(); });
    child.stderr?.on("data", (d: Buffer) => { if (stderr.length < MAX_OUTPUT) stderr += d.toString(); });

    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: !timedOut && exitCode === 0,
        exitCode, timedOut,
        stdout: redact(stdout.slice(0, MAX_OUTPUT)),
        stderr: redact(stderr.slice(0, MAX_OUTPUT)),
        durationMs: Date.now() - started,
      });
    };

    child.on("error", (err: Error) => { stderr += String(err); finish(null); });
    child.on("close", (code: number | null) => finish(code));
  });

  await db.agentToolExecution.update({
    where: { id: exec.id },
    data: {
      exitCode: result.exitCode, timedOut: result.timedOut, durationMs: result.durationMs,
      stdoutTail: result.stdout.slice(-8000), stderrTail: result.stderr.slice(-8000),
      completedAt: new Date(),
    },
  });

  return result;
}
