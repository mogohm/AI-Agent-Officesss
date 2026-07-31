// Tool permission catalog + risk classification. High-risk tools require
// human approval by default (enforced in the worker/approval flow).
export type ToolRisk = "LOW" | "MEDIUM" | "HIGH";

export type ToolDef = { key: string; label: string; risk: ToolRisk };

export const TOOLS: ToolDef[] = [
  { key: "web_search", label: "Web Search", risk: "LOW" },
  { key: "file_read", label: "File Read", risk: "LOW" },
  { key: "database_read", label: "Database Read", risk: "LOW" },
  { key: "code_read", label: "Code Read", risk: "LOW" },
  { key: "calendar_read", label: "Calendar Read", risk: "LOW" },
  { key: "file_write", label: "File Write", risk: "MEDIUM" },
  { key: "database_write", label: "Database Write", risk: "MEDIUM" },
  { key: "code_write", label: "Code Write", risk: "MEDIUM" },
  { key: "email_draft", label: "Email Draft", risk: "MEDIUM" },
  { key: "calendar_write", label: "Calendar Write", risk: "MEDIUM" },
  { key: "image_generation", label: "Image Generation", risk: "MEDIUM" },
  { key: "email_send", label: "Email Send", risk: "HIGH" },
  { key: "shell_command", label: "Shell Command", risk: "HIGH" },
  { key: "deploy", label: "Deploy", risk: "HIGH" },
];

export const TOOL_KEYS = TOOLS.map((t) => t.key);
export const TOOL_MAP = new Map(TOOLS.map((t) => [t.key, t]));

export function toolRisk(key: string): ToolRisk {
  return TOOL_MAP.get(key)?.risk ?? "MEDIUM";
}

export function requiresApproval(toolKey: string): boolean {
  return toolRisk(toolKey) === "HIGH";
}

// Not exposed as a selectable permission in the first production release.
export const DISALLOWED_TOOLS = new Set<string>([]);

export const AVATAR_TEMPLATES = ["dev-a", "dev-b", "designer", "marketer", "sales", "hr", "pm", "qa"] as const;
