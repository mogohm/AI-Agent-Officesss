import { execFile } from "node:child_process";

/**
 * Truthful Git push-state reporting (WP-002P §1.7).
 *
 * Defect DLV-REPORT-001: commit c92e444's message asserted "Not pushed. Master
 * untouched." That was true when authored on a work branch and became false when
 * master was later fast-forwarded — a mutable runtime fact frozen into immutable
 * text.
 *
 * Two rules follow, and both are enforced here:
 *   1. State is DERIVED FROM OBSERVED GIT OUTPUT, never from a claim.
 *   2. What could not be verified is reported as UNVERIFIED, never as absence.
 *      Silently downgrading "I could not reach the remote" into "master does not
 *      contain it" would recreate the original defect from the other side.
 */

export type PushState =
  | "LOCAL_ONLY" // no remote configured, or the remote branch lacks the commit
  | "REMOTE_BRANCH_UPDATED" // the remote tracking branch contains the commit
  | "MASTER_UPDATED" // the remote default branch contains the commit
  | "PUSH_FAILED" // a push was attempted and failed, and master lacks the commit
  | "UNKNOWN";  // a remote exists but could not be read — assert nothing

export type GitObservation = {
  localBranch: string;
  localHead: string;
  remoteBranch: string | null;
  remoteHead: string | null;
  /** Name of the default branch this observation was checked against. */
  defaultBranch: string;
  /** Default-branch tip from a live `ls-remote`. Null when unread or malformed. */
  remoteMasterHead: string | null;
  /** True only when `ls-remote` actually returned a valid sha. */
  remoteVerified: boolean;
  /** False when the repository has no remotes at all. */
  remoteConfigured: boolean;
  containedInRemoteMaster: boolean;
  /** Null when the ahead/behind query failed — unknown, not zero. */
  ahead: number | null;
  behind: number | null;
  pushAttempted: boolean;
  pushSucceeded: boolean | null;
  verifiedAt: string;
};

export type GitStateReport = GitObservation & {
  state: PushState;
  /** Human-safe summary; the only string a report should quote. */
  summary: string;
  contradictsClaim: boolean;
  claimedState: PushState | null;
};

const SHA = /^[0-9a-f]{40}$/;

/**
 * Pure classifier. Observation always wins: `claimedState` is recorded and
 * compared, never consulted when deciding `state`.
 *
 * Order matters. Containment in the public default branch is checked FIRST,
 * because a failed push does not un-publish a commit someone else already
 * merged — reporting PUSH_FAILED there would understate public exposure.
 */
export function classify(o: GitObservation, claimedState: PushState | null = null): GitStateReport {
  const short = o.localHead ? o.localHead.slice(0, 7) : "(no commit)";
  const rejected = o.pushAttempted && o.pushSucceeded === false;
  let state: PushState;
  let summary: string;

  if (o.containedInRemoteMaster && o.remoteVerified) {
    state = "MASTER_UPDATED";
    summary = `${short} is contained in remote ${o.defaultBranch}`
      + (rejected ? " (a push was also attempted and rejected)" : "");
  } else if (rejected) {
    state = "PUSH_FAILED";
    summary = `push of ${short} was attempted and rejected`;
  } else if (o.remoteConfigured && !o.remoteVerified) {
    // never convert "could not verify" into "not on master"
    state = "UNKNOWN";
    summary = `${short}: remote ${o.defaultBranch} could not be read — public state unverified`;
  } else if (o.remoteBranch !== null && o.remoteHead !== null && o.ahead === 0) {
    state = "REMOTE_BRANCH_UPDATED";
    summary = `${short} is on ${o.remoteBranch}; remote ${o.defaultBranch} does not contain it`;
  } else {
    state = "LOCAL_ONLY";
    summary = o.ahead === null
      ? `${short} exists locally; divergence from the remote is unknown`
      : `${short} exists locally only (ahead ${o.ahead})`;
  }

  return {
    ...o,
    state,
    summary,
    claimedState,
    contradictsClaim: claimedState !== null && claimedState !== state,
  };
}

// ------------------------------------------------------------------ git I/O

/**
 * Reject anything git could read as an option. Without this, a caller-supplied
 * remote such as `--upload-pack=<cmd>` becomes arbitrary command execution.
 */
export function isSafeGitRef(value: string): boolean {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 255
    && !value.startsWith("-")
    && /^[A-Za-z0-9._@:\/\\-]+$/.test(value);
}

type GitResult = { ok: boolean; out: string };

/**
 * Argument vectors are fixed by this module; the only caller-influenced values
 * (`remote`, `defaultBranch`) are validated by `isSafeGitRef` before arriving.
 * Never a shell — `execFile`, no interpolation.
 */
function git(args: string[], cwd: string, timeoutMs = 20_000): Promise<GitResult> {
  return new Promise((resolve) => {
    execFile("git", args, {
      cwd, windowsHide: true, maxBuffer: 8 << 20, timeout: timeoutMs,
      // never block a report on an interactive credential prompt
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_ASKPASS: "echo", GCM_INTERACTIVE: "never" },
    }, (err, stdout) => resolve({ ok: !err, out: (stdout ?? "").trim() }));
  });
}

/**
 * Observe real state. Every field comes from a git invocation performed NOW.
 * Failures degrade to "unknown" (null / false), never to a confident negative.
 */
export async function readGitState(opts: {
  cwd: string;
  remote?: string;
  defaultBranch?: string;
  pushAttempted?: boolean;
  pushSucceeded?: boolean | null;
  now?: () => string;
}): Promise<GitObservation> {
  const { cwd } = opts;
  const remote = opts.remote ?? "origin";
  const defaultBranch = opts.defaultBranch ?? "master";
  if (!isSafeGitRef(remote)) throw new Error(`unsafe remote: ${remote}`);
  if (!isSafeGitRef(defaultBranch)) throw new Error(`unsafe defaultBranch: ${defaultBranch}`);

  const localBranch = (await git(["rev-parse", "--abbrev-ref", "HEAD"], cwd)).out || "HEAD";
  const localHead = (await git(["rev-parse", "HEAD"], cwd)).out;
  const upstream = await git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"], cwd);
  const remoteBranch = upstream.ok && upstream.out ? upstream.out : null;
  const remoteHead = remoteBranch ? (await git(["rev-parse", remoteBranch], cwd)).out || null : null;

  // unknown divergence stays null — a failed query must not read as "ahead 0"
  let ahead: number | null = null, behind: number | null = null;
  if (remoteBranch) {
    const counts = await git(["rev-list", "--left-right", "--count", "@{u}...HEAD"], cwd);
    if (counts.ok && /^\d+\s+\d+$/.test(counts.out)) {
      const [b, a] = counts.out.split(/\s+/);
      behind = Number(b); ahead = Number(a);
    }
  }

  const remotes = await git(["remote"], cwd);
  const remoteConfigured = remotes.ok && remotes.out.length > 0;

  // live remote read — a stale local ref must never decide public state
  const ls = await git(["ls-remote", remote, `refs/heads/${defaultBranch}`], cwd);
  const candidate = ls.ok ? (ls.out.split(/\s+/)[0] ?? "") : "";
  const remoteMasterHead = SHA.test(candidate) ? candidate : null;
  const remoteVerified = ls.ok && remoteMasterHead !== null;

  let containedInRemoteMaster = false;
  if (remoteVerified && localHead) {
    await git(["fetch", remote, defaultBranch, "--quiet"], cwd);
    // `rev-list --count <master>..<head>` is 0 exactly when master contains head.
    // Deliberately not `merge-base --is-ancestor`: a non-zero exit would need an
    // exit-code test, and an unresolvable ref must stay conservative here.
    const missing = await git(["rev-list", "--count", `${remoteMasterHead}..${localHead}`], cwd);
    containedInRemoteMaster = missing.ok && missing.out === "0";
  }

  return {
    localBranch, localHead, remoteBranch, remoteHead,
    defaultBranch, remoteMasterHead, remoteVerified, remoteConfigured,
    containedInRemoteMaster, ahead, behind,
    pushAttempted: opts.pushAttempted ?? false,
    pushSucceeded: opts.pushSucceeded ?? null,
    verifiedAt: (opts.now ?? (() => new Date().toISOString()))(),
  };
}

/** Convenience: observe then classify in one step. */
export async function reportGitState(
  opts: Parameters<typeof readGitState>[0] & { claimedState?: PushState | null },
): Promise<GitStateReport> {
  return classify(await readGitState(opts), opts.claimedState ?? null);
}
