// UI helpers: status colors, department icons, idle-activity labels.
import type { AgentStatus } from "./types";

export const STATUS_COLOR: Record<AgentStatus, string> = {
  idle: "#61708F",
  thinking: "#3BE8E0",
  planning: "#5B8CFF",
  coding: "#5BE49B",
  designing: "#FF7AC6",
  writing: "#A98BFF",
  reviewing: "#FFD166",
  testing: "#FF9F6B",
  meeting: "#5B8CFF",
  waiting: "#9AA7C7",
  done: "#5BE49B",
  error: "#FF6B7A",
};

export const STATUS_ICON: Record<AgentStatus, string> = {
  idle: "💤", thinking: "💭", planning: "🗺️", coding: "⌨️", designing: "🎨",
  writing: "✍️", reviewing: "🔍", testing: "🧪", meeting: "📋", waiting: "⏳",
  done: "✅", error: "⚠️",
};

// Emoji per department type — used for the floor label + room vibe.
export const DEPARTMENT_ICON: Record<string, string> = {
  "Lobby / Support": "🛎️",
  Marketing: "📣",
  Sales: "🤝",
  HR: "🧑‍💼",
  "IT / Dev": "💻",
  Design: "🎨",
  "Game Studio": "🕹️",
  "QA / Tester": "🧪",
  "Data / Research": "🔬",
  Finance: "💰",
  Legal: "⚖️",
  Content: "📝",
  DevOps: "🛠️",
  "Product Management": "📊",
  "Customer Service": "☎️",
};

// What an agent visually "does" while working, per department type.
export const WORK_ACTION: Record<string, string> = {
  Marketing: "reviewing campaign charts",
  Sales: "talking to a customer",
  HR: "reading a resume",
  "IT / Dev": "typing code on the monitor",
  Design: "sketching UI on a tablet",
  "QA / Tester": "checking the test checklist",
  "Product Management": "managing the board",
  "Game Studio": "designing the gameplay loop",
  "Data / Research": "analyzing data",
};

export function departmentIcon(type: string): string {
  return DEPARTMENT_ICON[type] ?? "🏢";
}

export function providerBadge(provider: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    openai: { label: "OpenAI", color: "#5BE49B" },
    anthropic: { label: "Anthropic", color: "#FF9F6B" },
    google: { label: "Google", color: "#5B8CFF" },
    local: { label: "Local LLM", color: "#9AA7C7" },
    image: { label: "Image AI", color: "#FF7AC6" },
  };
  return map[provider] ?? { label: provider, color: "#9AA7C7" };
}
