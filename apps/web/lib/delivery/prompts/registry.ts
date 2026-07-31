import { createHash } from "node:crypto";
import type { AgentRoleKind } from "@prisma/client";

/**
 * Versioned prompt registry (§9/§18). Prompts are data with an id + version, so
 * every AgentRun records exactly which prompt produced its output and the
 * rendered prompt can be hashed for reproducibility.
 *
 * Chain-of-thought is never requested and never stored — only structured output.
 */

export type PromptTemplate = {
  key: string;
  version: string;
  role: AgentRoleKind;
  variables: string[];
  system: string;
  user: string;
};

export const TEMPLATES: PromptTemplate[] = [
  {
    key: "mission-manager", version: "1.0.0", role: "MISSION_MANAGER",
    variables: ["missionTitle", "instruction", "packages"],
    system: "You are the mission manager for an autonomous software delivery system. You never edit code. You select the next eligible work package and summarise mission state. Respond only with JSON.",
    user: "Mission: {{missionTitle}}\nInstruction: {{instruction}}\nEligible packages:\n{{packages}}\n\nReturn JSON: {\"nextPackageKey\": string|null, \"rationale\": string}",
  },
  {
    key: "requirement-analysis", version: "1.0.0", role: "REQUIREMENT",
    variables: ["instruction", "constraints"],
    system: "You convert an owner instruction into structured, objectively measurable requirements. Every acceptance criterion must state HOW it is verified. Respond only with JSON.",
    user: "Instruction: {{instruction}}\nConstraints:\n{{constraints}}\n\nReturn JSON: {\"requirements\":[{\"key\":string,\"title\":string,\"criteria\":[{\"key\":string,\"statement\":string,\"measurement\":string}]}]}",
  },
  {
    key: "architecture-analysis", version: "1.0.0", role: "ARCHITECT",
    variables: ["repoSummary", "requirements"],
    system: "You are a software architect. You decompose work into independent packages with explicit dependencies. You avoid unnecessary rewrites. Respond only with JSON.",
    user: "Repository summary:\n{{repoSummary}}\nRequirements:\n{{requirements}}\n\nReturn JSON: {\"packages\":[{\"key\":string,\"title\":string,\"role\":string,\"dependsOn\":string[],\"risk\":\"LOW\"|\"MEDIUM\"|\"HIGH\"}]}",
  },
  {
    key: "asset-audit", version: "1.0.0", role: "UX_VISUAL",
    variables: ["reference", "assets"],
    system: [
      "You are a pixel-art visual asset auditor for an isometric office management UI.",
      "You receive DETERMINISTIC file metadata that was measured by the system (path, bytes, width, height, aspect ratio, alpha).",
      "You must NOT invent dimensions — use the measured values exactly as given.",
      "For qualities that cannot be measured deterministically (whether human characters are drawn into the background art, whether the art matches the reference style), you must express uncertainty:",
      "set suspectedBakedCharacters true/false AND give a confidence between 0 and 1, and justify it from the file path, naming convention and category.",
      "Never claim certainty you do not have. Respond only with JSON.",
    ].join(" "),
    user: [
      "Reference image: {{reference}}",
      "",
      "Measured assets (JSON):",
      "{{assets}}",
      "",
      'Return JSON exactly: {"assets":[{"path":string,"category":"building"|"floor"|"worker"|"reference"|"other","suspectedBakedCharacters":boolean,"confidence":number,"styleCompatible":boolean,"issues":string[],"recommendedAction":"retain"|"replace"|"regenerate"|"inspect","reasoning":string}]}',
      "",
      "Guidance: assets under a characters/ or sprites/ path are worker sprites (characters are expected there — that is NOT a baked-character defect).",
      "Assets used as room/floor backgrounds must contain furniture only; if the filename or path suggests a populated room (e.g. 'module-ref', 'tower-master', 'floor-module'), flag suspectedBakedCharacters with an appropriate confidence.",
      "Files named '*-band' or containing 'empty' are more likely to be people-free.",
    ].join("\n"),
  },
];

export function getTemplate(key: string, version?: string): PromptTemplate {
  const candidates = TEMPLATES.filter((t) => t.key === key);
  if (candidates.length === 0) throw new Error(`unknown prompt template: ${key}`);
  if (version) {
    const exact = candidates.find((t) => t.version === version);
    if (!exact) throw new Error(`unknown prompt version: ${key}@${version}`);
    return exact;
  }
  return candidates.sort((a, b) => b.version.localeCompare(a.version))[0];
}

/** Substitute {{vars}}; missing variables are an error, not a silent blank. */
export function render(t: PromptTemplate, vars: Record<string, string>): { system: string; user: string; hash: string } {
  const apply = (s: string) =>
    s.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
      if (!(name in vars)) throw new Error(`prompt ${t.key}@${t.version} missing variable: ${name}`);
      return vars[name];
    });
  const system = apply(t.system);
  const user = apply(t.user);
  const hash = createHash("sha256").update(`${t.key}@${t.version}\n${system}\n${user}`).digest("hex");
  return { system, user, hash };
}
