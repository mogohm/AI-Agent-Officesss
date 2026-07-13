// Static option lists + example content. These mirror the backend enums but
// are duplicated here so dropdowns render instantly without a round-trip.

export const DEPARTMENT_TYPES = [
  "Lobby / Support", "Marketing", "Sales", "HR", "IT / Dev", "Design",
  "Game Studio", "QA / Tester", "Data / Research", "Finance", "Legal",
  "Content", "DevOps", "Product Management", "Customer Service",
];

export const AGENT_ROLES = [
  "Project Manager Agent", "Business Analyst Agent", "System Analyst Agent",
  "Developer Agent", "Frontend Developer Agent", "Backend Developer Agent",
  "Database Agent", "UI/UX Designer Agent", "Game Designer Agent",
  "QA Tester Agent", "DevOps Agent", "Research Agent", "Marketing Agent",
  "Sales Agent", "HR Agent", "Document Agent",
];

export const AGENT_STATUSES = [
  "idle", "thinking", "planning", "coding", "designing", "writing",
  "reviewing", "testing", "meeting", "waiting", "done", "error",
] as const;

export const PROJECT_TYPES = [
  "Web Application", "Mobile App", "Game", "Dashboard", "Automation",
  "Scraper", "AI Tool", "Business System", "Report System",
  "Design Project", "Document Project",
];

export const PROJECT_STATUSES = [
  "draft", "planning", "in_progress", "reviewing", "testing",
  "completed", "archived", "failed", "paused",
] as const;

export const ROOM_STYLES = ["glass-office", "cozy", "lab", "studio", "war-room"];

export const MAX_DEPARTMENTS = 15;

export const ACCENT_CHOICES = [
  "#5B8CFF", "#5BE49B", "#FF7AC6", "#A98BFF", "#FFD166", "#3BE8E0", "#FF9F6B",
];

export const AVATAR_CHOICES = [
  "🧑‍💼", "👨‍💻", "👩‍💻", "👩‍🎨", "🕹️", "🕵️", "📣", "🤝", "🧑‍🔬", "🛠️", "🤖", "🧙",
];

// Example responsibilities shown as one-click suggestions per department type.
export const EXAMPLE_RESPONSIBILITIES: Record<string, string[]> = {
  "IT / Dev": [
    "Develop frontend and backend systems",
    "Design database schema",
    "Build API",
    "Fix bugs",
    "Deploy and maintain systems",
  ],
  Design: [
    "Design UI/UX",
    "Create wireframes",
    "Create visual assets",
    "Create isometric/pixel office assets",
    "Review visual consistency",
  ],
  "Game Studio": [
    "Design gameplay loop",
    "Design economy system",
    "Design character and level concepts",
    "Create game requirement document",
    "Test gameplay ideas",
  ],
  Marketing: [
    "Plan marketing campaigns",
    "Analyze target audience",
    "Write ad copy",
    "Track campaign performance",
  ],
  "QA / Tester": [
    "Write test cases",
    "Build QA checklists",
    "Report and analyze bugs",
    "Verify fixes",
  ],
};

export function exampleResponsibilities(type: string): string[] {
  return EXAMPLE_RESPONSIBILITIES[type] ?? [
    "Define scope and goals",
    "Collaborate with other departments",
    "Deliver high-quality work",
    "Review and improve continuously",
  ];
}
