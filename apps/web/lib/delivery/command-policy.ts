import path from "node:path";

/**
 * Command allowlist policy (§7/§14). PURE — no execution, no I/O — so every rule
 * is unit-testable and the same policy object is used by the runner and tests.
 *
 * Ported and hardened from the legacy `server/worker/safety.py` allowlist
 * (the one genuinely reusable artefact found in the PHASE 0 audit).
 */

export type PolicyVerdict = { allowed: true } | { allowed: false; reason: string };

/** Read-only executables permitted in this round. */
const ALLOWED_EXECUTABLES = new Set([
  "pwd", "ls", "cat", "file", "find", "git", "node", "npm", "npx", "identify", "python", "python3",
]);

/**
 * Interpreters may only run scripts from these repo-tracked directories. This
 * stops an agent from writing a script into the artifact area and executing it
 * (privilege escalation via the interpreter).
 */
const ALLOWED_SCRIPT_DIRS = ["tools/", "apps/web/scripts/"];

/** git subcommands that cannot mutate the repository or remote. */
const ALLOWED_GIT_SUBCOMMANDS = new Set([
  "status", "rev-parse", "log", "ls-files", "show", "diff", "config", "worktree", "rev-list",
]);

/** git subcommands that are always refused, even if someone adds them upstream. */
const BLOCKED_GIT_SUBCOMMANDS = new Set([
  "push", "reset", "clean", "rebase", "merge", "commit", "am", "cherry-pick",
  "filter-branch", "gc", "prune", "remote", "submodule",
]);

/** npm scripts allowed this round (§7). */
const ALLOWED_NPM_SCRIPTS = new Set(["lint", "typecheck", "test", "build", "verify"]);

/** Substrings that indicate shell metacharacter injection or exfiltration. */
const FORBIDDEN_ARG_PATTERNS: [RegExp, string][] = [
  [/[;&|]{1,2}/, "shell chaining is not permitted"],
  [/`|\$\(/, "command substitution is not permitted"],
  [/>\s*\/|>>/, "output redirection is not permitted"],
  [/\.\.(\/|\\)/, "parent-directory traversal is not permitted"],
  [/~(\/|\\)?\.ssh/, "access to ssh material is not permitted"],
  [/(^|\/|\\)\.env(\.|$)/, "access to environment files is not permitted"],
  [/\bsudo\b/, "sudo is not permitted"],
  [/\bcurl\b|\bwget\b/, "network fetch is not permitted"],
  [/--force|-f\b(?!ormat)/, "force flags are not permitted"],
];

/** Executables that must never run, regardless of context. */
const BLOCKED_EXECUTABLES = new Set([
  "sudo", "su", "rm", "rmdir", "del", "chmod", "chown", "curl", "wget", "ssh",
  "scp", "nc", "ncat", "bash", "sh", "zsh", "cmd", "powershell", "pwsh", "docker", "kubectl",
]);

/**
 * Resolve a path and assert it stays inside the workspace jail (threat T2).
 * Uses path.resolve + relative so symlink-ish `..` tricks cannot escape.
 */
export function isInsideWorkspace(workspaceRoot: string, candidate: string): boolean {
  const root = path.resolve(workspaceRoot);
  const target = path.resolve(root, candidate);
  const rel = path.relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

export function validateCommand(input: {
  executable: string;
  args: string[];
  cwd: string;
  workspaceRoot: string;
}): PolicyVerdict {
  const exe = input.executable.trim();
  const base = path.basename(exe).replace(/\.(exe|cmd|bat|ps1)$/i, "").toLowerCase();

  if (!exe) return { allowed: false, reason: "empty executable" };
  if (exe !== base && (exe.includes("/") || exe.includes("\\"))) {
    return { allowed: false, reason: "executable must be a bare command name, not a path" };
  }
  if (BLOCKED_EXECUTABLES.has(base)) return { allowed: false, reason: `executable '${base}' is blocked` };
  if (!ALLOWED_EXECUTABLES.has(base)) return { allowed: false, reason: `executable '${base}' is not on the allowlist` };

  // cwd must be inside the mission workspace
  if (!isInsideWorkspace(input.workspaceRoot, input.cwd)) {
    return { allowed: false, reason: "cwd escapes the mission workspace" };
  }

  for (const arg of input.args) {
    for (const [re, reason] of FORBIDDEN_ARG_PATTERNS) {
      if (re.test(arg)) return { allowed: false, reason: `${reason} (argument: ${arg.slice(0, 40)})` };
    }
    // absolute path arguments must also stay inside the jail
    if (path.isAbsolute(arg) && !isInsideWorkspace(input.workspaceRoot, arg)) {
      return { allowed: false, reason: `argument path escapes the workspace: ${arg.slice(0, 60)}` };
    }
  }

  if (base === "git") {
    const sub = input.args.find((a) => !a.startsWith("-"))?.toLowerCase();
    if (!sub) return { allowed: false, reason: "git requires a subcommand" };
    if (BLOCKED_GIT_SUBCOMMANDS.has(sub)) return { allowed: false, reason: `git ${sub} is blocked` };
    if (!ALLOWED_GIT_SUBCOMMANDS.has(sub)) return { allowed: false, reason: `git ${sub} is not on the allowlist` };
    if (sub === "worktree") {
      const action = input.args[input.args.indexOf(sub) + 1];
      if (!["add", "list", "remove"].includes(action ?? "")) {
        return { allowed: false, reason: `git worktree ${action ?? "?"} is not permitted` };
      }
    }
  }

  if (base === "python" || base === "python3" || base === "node") {
    const script = input.args[0];
    if (!script || script.startsWith("-")) {
      return { allowed: false, reason: `${base} requires an approved script path as the first argument` };
    }
    const normalised = script.replace(/\\/g, "/");
    // the script must live in a repo-tracked tools/scripts directory…
    const rel = path.isAbsolute(normalised)
      ? path.relative(path.resolve(input.workspaceRoot), path.resolve(normalised)).replace(/\\/g, "/")
      : normalised;
    if (!ALLOWED_SCRIPT_DIRS.some((d) => rel.includes(d))) {
      return { allowed: false, reason: `${base} may only run scripts under ${ALLOWED_SCRIPT_DIRS.join(" or ")} (got ${rel.slice(0, 60)})` };
    }
    if (!/\.(py|mjs|cjs|js)$/.test(rel)) {
      return { allowed: false, reason: "interpreter script must be a .py/.js/.mjs/.cjs file" };
    }
  }

  if (base === "npm" || base === "npx") {
    const isRun = input.args[0] === "run";
    if (!isRun) return { allowed: false, reason: "only 'npm run <script>' is permitted" };
    const script = input.args[1];
    if (!script || !ALLOWED_NPM_SCRIPTS.has(script)) {
      return { allowed: false, reason: `npm script '${script ?? "?"}' is not on the allowlist` };
    }
  }

  return { allowed: true };
}

/**
 * Environment allowlist for child processes (threat T3): the child never sees
 * the parent's secrets.
 */
export function buildChildEnv(base: Record<string, string | undefined>, extra: Record<string, string> = {}): Record<string, string> {
  const ALLOWED = ["PATH", "HOME", "USERPROFILE", "SystemRoot", "TEMP", "TMP", "LANG", "TZ", "APPDATA", "ComSpec"];
  const env: Record<string, string> = {};
  for (const k of ALLOWED) if (base[k]) env[k] = base[k]!;
  env.CI = "1";
  env.NODE_ENV = "test";
  return { ...env, ...extra };
}

/** Redact secrets before anything is persisted or streamed (threat T3). */
export function redact(text: string): string {
  return text
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, "sk-***REDACTED***")
    .replace(/(gh[pousr]_[A-Za-z0-9]{16,})/g, "***REDACTED_GITHUB_TOKEN***")
    .replace(/(-----BEGIN [A-Z ]*PRIVATE KEY-----)[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----)/g, "$1***REDACTED***$2")
    .replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/gi, "$1***REDACTED***$2")
    .replace(/((?:api[_-]?key|token|password|secret)["'\s:=]+)([^\s"',}]{8,})/gi, "$1***REDACTED***");
}
