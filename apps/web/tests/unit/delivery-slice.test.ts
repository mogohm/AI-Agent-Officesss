import { describe, it, expect } from "vitest";
import { validateCommand, isInsideWorkspace, buildChildEnv, redact } from "@/lib/delivery/command-policy";
import { jobKeys } from "@/lib/delivery/queue";
import { getTemplate, render, TEMPLATES } from "@/lib/delivery/prompts/registry";
import { readImageMeta, aspectRatio } from "@/lib/delivery/image-meta";
import { assetAuditSchema } from "@/lib/delivery/agents/asset-audit";
import { computeCost, PRICING } from "@/lib/delivery/providers";

const WS = "/ws/missions/VISUAL-2026-001";
const ok = (o: Partial<Parameters<typeof validateCommand>[0]> = {}) =>
  validateCommand({ executable: "git", args: ["status"], cwd: `${WS}/base`, workspaceRoot: WS, ...o });

// ------------------------------------------------------- command allowlist
describe("command allowlist", () => {
  it("allows read-only git", () => {
    expect(ok().allowed).toBe(true);
    expect(ok({ args: ["ls-files", "apps/web/public/assets"] }).allowed).toBe(true);
    expect(ok({ args: ["rev-parse", "HEAD"] }).allowed).toBe(true);
  });

  it("blocks mutating git subcommands", () => {
    for (const sub of ["push", "reset", "clean", "commit", "rebase"]) {
      const v = ok({ args: [sub] });
      expect(v.allowed, `git ${sub}`).toBe(false);
    }
  });

  it("blocks destructive executables outright", () => {
    for (const exe of ["rm", "sudo", "curl", "wget", "bash", "chmod", "docker"]) {
      expect(ok({ executable: exe, args: [] }).allowed, exe).toBe(false);
    }
  });

  it("blocks shell chaining and command substitution", () => {
    expect(ok({ args: ["status", "; rm -rf /"] }).allowed).toBe(false);
    expect(ok({ args: ["status", "$(whoami)"] }).allowed).toBe(false);
    expect(ok({ args: ["status", "`id`"] }).allowed).toBe(false);
    expect(ok({ args: ["status", "a && b"] }).allowed).toBe(false);
  });

  it("blocks output redirection", () => {
    expect(ok({ args: ["status", ">>/etc/passwd"] }).allowed).toBe(false);
  });

  it("blocks parent-directory traversal in arguments", () => {
    expect(ok({ executable: "cat", args: ["../../../etc/passwd"] }).allowed).toBe(false);
  });

  it("blocks access to ssh material and env files", () => {
    expect(ok({ executable: "cat", args: ["~/.ssh/id_rsa"] }).allowed).toBe(false);
    expect(ok({ executable: "cat", args: [".env"] }).allowed).toBe(false);
    expect(ok({ executable: "cat", args: ["apps/web/.env.local"] }).allowed).toBe(false);
  });

  it("blocks a cwd outside the workspace", () => {
    expect(ok({ cwd: "/etc" }).allowed).toBe(false);
    expect(ok({ cwd: `${WS}/../escape` }).allowed).toBe(false);
  });

  it("blocks an absolute argument path outside the workspace", () => {
    expect(ok({ executable: "ls", args: ["/etc"] }).allowed).toBe(false);
  });

  it("rejects an executable given as a path", () => {
    expect(ok({ executable: "/usr/bin/git", args: ["status"] }).allowed).toBe(false);
  });

  it("only allows npm scripts on the allowlist", () => {
    expect(ok({ executable: "npm", args: ["run", "lint"] }).allowed).toBe(true);
    expect(ok({ executable: "npm", args: ["run", "deploy"] }).allowed).toBe(false);
    expect(ok({ executable: "npm", args: ["install"] }).allowed).toBe(false);
  });

  it("restricts git worktree to add/list/remove", () => {
    expect(ok({ args: ["worktree", "add", `${WS}/worktrees/WP-001`, "HEAD"] }).allowed).toBe(true);
    expect(ok({ args: ["worktree", "prune"] }).allowed).toBe(false);
  });
});

// ------------------------------------------------------------ path jail
describe("workspace path jail", () => {
  it("accepts paths inside the workspace", () => {
    expect(isInsideWorkspace(WS, `${WS}/base/apps`)).toBe(true);
    expect(isInsideWorkspace(WS, "base/apps")).toBe(true);
    expect(isInsideWorkspace(WS, WS)).toBe(true);
  });
  it("rejects escapes", () => {
    expect(isInsideWorkspace(WS, "../../etc")).toBe(false);
    expect(isInsideWorkspace(WS, `${WS}/../../etc/passwd`)).toBe(false);
    expect(isInsideWorkspace(WS, "/etc/passwd")).toBe(false);
  });
});

// ----------------------------------------------------------- env + redact
describe("secret handling", () => {
  it("does not leak parent secrets into the child env", () => {
    const env = buildChildEnv({ PATH: "/usr/bin", OPENAI_API_KEY: "sk-secret", DATABASE_URL: "postgres://u:p@h/db" });
    expect(env.PATH).toBe("/usr/bin");
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.DATABASE_URL).toBeUndefined();
  });

  it("redacts api keys, tokens, DSNs and private keys", () => {
    expect(redact("key sk-abcdefghijklmnop12345")).not.toContain("abcdefghijklmnop");
    expect(redact("ghp_abcdefghijklmnopqrst1234")).toContain("REDACTED");
    expect(redact("postgres://user:hunter2@host/db")).not.toContain("hunter2");
    expect(redact('{"api_key": "verysecretvalue123"}')).not.toContain("verysecretvalue123");
    expect(redact("-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----")).not.toContain("abc");
  });
});

// -------------------------------------------------------- deterministic IDs
describe("deterministic job ids", () => {
  it("produces a stable key for the same inputs", () => {
    expect(jobKeys.orchestrate("m1", 0)).toBe(jobKeys.orchestrate("m1", 0));
    expect(jobKeys.agentExecute("run1")).toBe("agent:run1:execute");
  });
  it("differs per iteration so a new turn is a new job", () => {
    expect(jobKeys.orchestrate("m1", 0)).not.toBe(jobKeys.orchestrate("m1", 1));
  });
});

// ------------------------------------------------------------- prompts
describe("prompt registry", () => {
  it("exposes the required templates", () => {
    for (const k of ["mission-manager", "requirement-analysis", "architecture-analysis", "asset-audit"]) {
      expect(TEMPLATES.some((t) => t.key === k), k).toBe(true);
    }
  });

  it("renders variables and produces a stable hash", () => {
    const t = getTemplate("asset-audit");
    const a = render(t, { reference: "ref.png", assets: "[]" });
    const b = render(t, { reference: "ref.png", assets: "[]" });
    expect(a.hash).toBe(b.hash);
    expect(a.user).toContain("ref.png");
  });

  it("changes the hash when input changes", () => {
    const t = getTemplate("asset-audit");
    expect(render(t, { reference: "a", assets: "[]" }).hash).not.toBe(render(t, { reference: "b", assets: "[]" }).hash);
  });

  it("fails loudly on a missing variable instead of rendering a blank", () => {
    const t = getTemplate("asset-audit");
    expect(() => render(t, { reference: "x" } as Record<string, string>)).toThrow(/missing variable/);
  });

  it("rejects an unknown template or version", () => {
    expect(() => getTemplate("nope")).toThrow();
    expect(() => getTemplate("asset-audit", "9.9.9")).toThrow();
  });
});

// ---------------------------------------------------------- image parsing
describe("image metadata", () => {
  it("parses a PNG header deterministically", () => {
    const buf = Buffer.alloc(32);
    buf.write("\x89PNG\r\n\x1a\n", 0, "binary");
    buf.writeUInt32BE(1920, 16); buf.writeUInt32BE(1080, 20); buf.writeUInt8(6, 25);
    const m = readImageMeta(buf);
    expect(m).toEqual({ width: 1920, height: 1080, hasAlpha: true, format: "png" });
  });

  it("returns null for non-image data instead of guessing", () => {
    expect(readImageMeta(Buffer.from("not an image at all really"))).toBeNull();
  });

  it("computes aspect ratio", () => {
    expect(aspectRatio(1600, 600)).toBe(2.667);
    expect(aspectRatio(10, 0)).toBe(0);
  });
});

// --------------------------------------------------------- artifact schema
describe("WP-001 artifact schema", () => {
  const valid = {
    repositoryCommit: "abc123", reference: { path: "r.png", exists: true, width: 10, height: 10 },
    assets: [{
      path: "a.webp", category: "floor" as const, exists: true, width: 1600, height: 600,
      aspectRatio: 2.667, hasAlpha: true, suspectedBakedCharacters: false, confidence: 0.8,
      styleCompatible: true, issues: [], recommendedAction: "retain" as const,
    }],
    summary: { total: 1, retain: 1, replace: 0, regenerate: 0, manualInspection: 0 },
  };

  it("accepts a well-formed audit", () => {
    expect(assetAuditSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing repository commit", () => {
    expect(assetAuditSchema.safeParse({ ...valid, repositoryCommit: "" }).success).toBe(false);
  });

  it("rejects an out-of-range confidence", () => {
    const bad = { ...valid, assets: [{ ...valid.assets[0], confidence: 1.7 }] };
    expect(assetAuditSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown recommendedAction", () => {
    const bad = { ...valid, assets: [{ ...valid.assets[0], recommendedAction: "delete" }] };
    expect(assetAuditSchema.safeParse(bad).success).toBe(false);
  });
});

// ------------------------------------------------------------------ cost
describe("provider cost", () => {
  it("computes cost from published pricing", () => {
    const c = computeCost("gpt-4o-mini", 1000, 1000);
    expect(c).toBeCloseTo(PRICING["gpt-4o-mini"].in + PRICING["gpt-4o-mini"].out, 8);
  });
  it("returns zero for an unknown model rather than inventing a price", () => {
    expect(computeCost("unknown-model", 1000, 1000)).toBe(0);
  });
});
