import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  classify, readGitState, isSafeGitRef,
  type GitObservation, type PushState,
} from "@/lib/delivery/git-state";

/**
 * Regression tests for defect DLV-REPORT-001 (WP-002P §1.7).
 *
 * The defect: a report asserted "Not pushed. Master untouched." while the commit
 * was publicly on master. These tests pin two rules — state is derived from
 * observed git output, and unverifiable state is never reported as absence.
 */

const base = (over: Partial<GitObservation> = {}): GitObservation => ({
  localBranch: "work/VISUAL-2026-001/WP-002P",
  localHead: "e781bd1518fbcca1ef77efe72c9365098d80b5e3",
  remoteBranch: null,
  remoteHead: null,
  defaultBranch: "master",
  remoteMasterHead: null,
  remoteVerified: false,
  remoteConfigured: false,
  containedInRemoteMaster: false,
  ahead: 1,
  behind: 0,
  pushAttempted: false,
  pushSucceeded: null,
  verifiedAt: "2026-08-05T00:00:00.000Z",
  ...over,
});

const pushedBranch = (over: Partial<GitObservation> = {}) => base({
  remoteBranch: "origin/work/VISUAL-2026-001/WP-002P",
  remoteHead: "e781bd1518fbcca1ef77efe72c9365098d80b5e3",
  remoteMasterHead: "33307880efad4eefb1edcef66b8592f4b22e9a69",
  remoteVerified: true, remoteConfigured: true, ahead: 0, ...over,
});

const onMaster = (over: Partial<GitObservation> = {}) => base({
  localBranch: "master", remoteBranch: "origin/master",
  remoteHead: "ccc", remoteMasterHead: "cccccccccccccccccccccccccccccccccccccccc",
  remoteVerified: true, remoteConfigured: true,
  containedInRemoteMaster: true, ahead: 0, ...over,
});

describe("the six required regression cases", () => {
  it("1. a local-only commit reports LOCAL_ONLY", () => {
    expect(classify(base()).state).toBe("LOCAL_ONLY");
  });
  it("2. a pushed work branch reports REMOTE_BRANCH_UPDATED", () => {
    const r = classify(pushedBranch());
    expect(r.state).toBe("REMOTE_BRANCH_UPDATED");
    expect(r.summary).toContain("does not contain it");
  });
  it("3. a commit merged into the remote default branch reports MASTER_UPDATED", () => {
    expect(classify(onMaster({ localBranch: "work/x" })).state).toBe("MASTER_UPDATED");
  });
  it("4. a direct master update reports MASTER_UPDATED", () => {
    expect(classify(onMaster()).state).toBe("MASTER_UPDATED");
  });
  it("5. a rejected push reports PUSH_FAILED, never REMOTE_BRANCH_UPDATED", () => {
    const r = classify(pushedBranch({ pushAttempted: true, pushSucceeded: false }));
    expect(r.state).toBe("PUSH_FAILED");
  });
  it("6. a stale or dishonest claim can never override observed state", () => {
    // the exact DLV-REPORT-001 shape: claim says LOCAL_ONLY, git says master has it
    const r = classify(onMaster(), "LOCAL_ONLY");
    expect(r.state).toBe("MASTER_UPDATED");
    expect(r.claimedState).toBe("LOCAL_ONLY");
    expect(r.contradictsClaim).toBe(true);
  });
  it("6b. every claim value is ignored for the same observation", () => {
    const claims: PushState[] = ["LOCAL_ONLY", "REMOTE_BRANCH_UPDATED", "MASTER_UPDATED", "PUSH_FAILED", "UNKNOWN"];
    for (const c of claims) expect(classify(pushedBranch(), c).state, `claim=${c}`).toBe("REMOTE_BRANCH_UPDATED");
    expect(classify(base(), "LOCAL_ONLY").contradictsClaim).toBe(false);
  });
});

describe("public exposure is never understated (B2)", () => {
  it("a rejected push does NOT mask a commit already on the public default branch", () => {
    const r = classify(onMaster({ pushAttempted: true, pushSucceeded: false }));
    // a failed push cannot un-publish a commit someone else merged
    expect(r.state).toBe("MASTER_UPDATED");
    expect(r.summary).toContain("rejected");
    expect(r.summary).toContain("contained in remote master");
  });
  it("PUSH_FAILED still applies when master genuinely lacks the commit", () => {
    expect(classify(pushedBranch({ pushAttempted: true, pushSucceeded: false })).state)
      .toBe("PUSH_FAILED");
  });
  it("pushAttempted with an unknown outcome is not treated as rejected", () => {
    expect(classify(pushedBranch({ pushAttempted: true, pushSucceeded: null })).state).toBe("REMOTE_BRANCH_UPDATED");
  });
});

describe("unverifiable remote is never reported as absence (B3)", () => {
  it("a configured but unreadable remote reports UNKNOWN", () => {
    const r = classify(base({
      remoteBranch: "origin/master", remoteHead: "aaa",
      remoteConfigured: true, remoteVerified: false, ahead: 0,
    }));
    expect(r.state).toBe("UNKNOWN");
    // must NOT assert the thing DLV-REPORT-001 got wrong
    expect(r.summary).not.toContain("does not contain");
    expect(r.summary).toContain("unverified");
  });
  it("containment is ignored unless the remote was actually verified", () => {
    const r = classify(base({
      containedInRemoteMaster: true, remoteVerified: false, remoteConfigured: true,
    }));
    expect(r.state).not.toBe("MASTER_UPDATED");
  });
  it("a repository with no remote at all is definitively LOCAL_ONLY", () => {
    expect(classify(base({ remoteConfigured: false })).state).toBe("LOCAL_ONLY");
  });

  it("6c. an unknown remote state is never reported as a success state", () => {
    const r = classify(base({
      remoteConfigured: true, remoteVerified: false,
      remoteBranch: "origin/master", remoteHead: "aaa", ahead: 0,
    }));
    expect(r.state).toBe("UNKNOWN");
    for (const success of ["REMOTE_BRANCH_UPDATED", "MASTER_UPDATED"]) {
      expect(r.state, `must not claim ${success}`).not.toBe(success);
    }
    expect(r.remoteVerified).toBe(false);
  });
});

describe("conservative degradation on unknown values", () => {
  it("unknown divergence never reads as ahead-0 / REMOTE_BRANCH_UPDATED", () => {
    const r = classify(pushedBranch({ ahead: null, behind: null }));
    expect(r.state).toBe("LOCAL_ONLY");
    expect(r.summary).toContain("divergence from the remote is unknown");
  });
  it("a commit ahead of its upstream is not reported as REMOTE_BRANCH_UPDATED", () => {
    for (const ahead of [1, 5, 99]) {
      expect(classify(pushedBranch({ ahead })).state, `ahead=${ahead}`).toBe("LOCAL_ONLY");
    }
  });
});

describe("argument-injection hardening (B1)", () => {
  it("rejects option-like and shell-ish remote values", () => {
    for (const bad of [
      "--upload-pack=touch /tmp/pwned", "--exec=whoami", "-o", "--",
      "ext::sh -c whoami", "a b", "a;b", "a|b", "a$(b)", "a`b`", "", "\n",
    ]) expect(isSafeGitRef(bad), bad).toBe(false);
  });
  it("accepts ordinary remote names, paths and URLs", () => {
    for (const ok of [
      "origin", "upstream", "https://github.com/mogohm/AI-Agent-Officesss.git",
      "git@github.com:mogohm/AI-Agent-Officesss.git", "/tmp/origin.git",
      "C:\\repos\\origin.git", "master", "main", "release/1.0",
    ]) expect(isSafeGitRef(ok), ok).toBe(true);
  });
  it("readGitState refuses an unsafe remote or defaultBranch instead of executing it", async () => {
    await expect(readGitState({ cwd: process.cwd(), remote: "--upload-pack=whoami" }))
      .rejects.toThrow(/unsafe remote/);
    await expect(readGitState({ cwd: process.cwd(), defaultBranch: "--exec=whoami" }))
      .rejects.toThrow(/unsafe defaultBranch/);
  });
});

// -------------------------------------------------------------- real git I/O
describe("readGitState against a real repository", () => {
  let tmp = "", origin = "", work = "";
  const g = (cwd: string, ...a: string[]) =>
    execFileSync("git", a, { cwd, encoding: "utf8", windowsHide: true }).trim();

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gitstate-"));
    origin = path.join(tmp, "origin.git");
    work = path.join(tmp, "work");
    execFileSync("git", ["init", "--bare", "-q", "-b", "master", origin], { windowsHide: true });
    execFileSync("git", ["clone", "-q", origin, work], { windowsHide: true });
    g(work, "config", "user.email", "t@test.invalid");
    g(work, "config", "user.name", "t");
    fs.writeFileSync(path.join(work, "a.txt"), "1\n");
    g(work, "add", "-A"); g(work, "commit", "-q", "-m", "base");
    g(work, "push", "-q", "origin", "master");
  });
  afterAll(() => { if (tmp) fs.rmSync(tmp, { recursive: true, force: true }); });

  it("reports LOCAL_ONLY for a branch with no upstream, with divergence unknown", async () => {
    g(work, "checkout", "-q", "-b", "feature");
    fs.writeFileSync(path.join(work, "b0.txt"), "0\n");
    g(work, "add", "-A"); g(work, "commit", "-q", "-m", "feature 0");

    const r = classify(await readGitState({ cwd: work, remote: "origin" }));
    expect(r.state).toBe("LOCAL_ONLY");
    expect(r.remoteBranch).toBeNull();
    // no upstream means divergence is genuinely unknown, not zero
    expect(r.ahead).toBeNull();
    expect(r.containedInRemoteMaster).toBe(false);
    expect(r.remoteVerified).toBe(true);
  });

  it("reports REMOTE_BRANCH_UPDATED once the work branch is on the remote", async () => {
    g(work, "push", "-q", "-u", "origin", "feature");
    const r = classify(await readGitState({ cwd: work, remote: "origin" }));
    expect(r.state).toBe("REMOTE_BRANCH_UPDATED");
    expect(r.ahead).toBe(0);
    expect(r.behind).toBe(0);
    expect(r.remoteBranch).toContain("feature");
  });

  it("counts ahead and behind in the correct order", async () => {
    for (const n of [1, 2, 3]) {
      fs.writeFileSync(path.join(work, `b${n}.txt`), `${n}\n`);
      g(work, "add", "-A"); g(work, "commit", "-q", "-m", `feature ${n}`);
    }
    const r = classify(await readGitState({ cwd: work, remote: "origin" }));
    // a swapped parse would report behind=3 / ahead=0 and wrongly say REMOTE_BRANCH_UPDATED
    expect(r.ahead).toBe(3);
    expect(r.behind).toBe(0);
    expect(r.state).toBe("LOCAL_ONLY");
    g(work, "push", "-q", "origin", "feature");
  });

  it("reports MASTER_UPDATED once the remote default branch contains the commit", async () => {
    const head = g(work, "rev-parse", "HEAD");
    g(work, "checkout", "-q", "master");
    g(work, "merge", "-q", "--ff-only", "feature");
    g(work, "push", "-q", "origin", "master");
    const r = classify(await readGitState({ cwd: work, remote: "origin" }));
    expect(r.localHead).toBe(head);
    expect(r.containedInRemoteMaster).toBe(true);
    expect(r.state).toBe("MASTER_UPDATED");
  });

  it("derives containment from the live remote, not a stale local ref", async () => {
    const other = path.join(tmp, "other");
    execFileSync("git", ["clone", "-q", origin, other], { windowsHide: true });
    g(other, "config", "user.email", "t@test.invalid");
    g(other, "config", "user.name", "t");
    fs.writeFileSync(path.join(other, "c.txt"), "3\n");
    g(other, "add", "-A"); g(other, "commit", "-q", "-m", "remote advance");
    g(other, "push", "-q", "origin", "master");

    const stale = g(work, "rev-parse", "origin/master");
    const observed = await readGitState({ cwd: work, remote: "origin" });
    expect(observed.remoteMasterHead).not.toBe(stale);
    expect(observed.remoteMasterHead).toBe(g(other, "rev-parse", "HEAD"));
    expect(classify(observed).state).toBe("MASTER_UPDATED");
  });

  it("reports UNKNOWN — not absence — when the remote is unreachable", async () => {
    const broken = path.join(tmp, "broken");
    execFileSync("git", ["clone", "-q", origin, broken], { windowsHide: true });
    g(broken, "remote", "set-url", "origin", path.join(tmp, "does-not-exist.git"));
    const r = classify(await readGitState({ cwd: broken, remote: "origin" }));
    expect(r.remoteVerified).toBe(false);
    expect(r.remoteConfigured).toBe(true);
    expect(r.state).toBe("UNKNOWN");
    expect(r.summary).not.toContain("does not contain");
  });

  it("survives an empty repository with no remote", async () => {
    const bare = path.join(tmp, "empty");
    fs.mkdirSync(bare, { recursive: true });
    execFileSync("git", ["init", "-q", "-b", "master", bare], { windowsHide: true });
    const r = classify(await readGitState({ cwd: bare, remote: "origin" }));
    expect(r.remoteConfigured).toBe(false);
    expect(r.state).toBe("LOCAL_ONLY");
    expect(typeof r.summary).toBe("string");
  });
});
