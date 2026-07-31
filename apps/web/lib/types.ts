// Domain types — mirror the FastAPI models/schemas one-to-one.

export type CompanyStatus = "active" | "paused" | "archived";

export interface Company {
  id: number;
  name: string;
  description: string;
  emoji: string;
  status: CompanyStatus;
  theme_color: string;
}

export interface CompanyOverview extends Company {
  department_count: number;
  project_count: number;
}

export interface Department {
  id: number;
  company_id: number;
  name: string;
  type: string;
  floor_number: number;
  job_description: string;
  responsibilities: string[];
  theme_color: string;
  room_style: string;
  assigned_ai_model_id: number | null;
  status: string;
}

export type AIProvider = "openai" | "anthropic" | "google" | "local" | "image";

export interface AIModel {
  id: number;
  provider: AIProvider;
  model_name: string;
  display_name: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  best_for: string[];
  cost_level: string;
  speed_level: string;
  quality_level: string;
  context_length: number;
  supports_text: boolean;
  supports_image: boolean;
  supports_code: boolean;
  supports_file: boolean;
  status: string;
}

export interface Recommendation {
  department_type: string;
  reason: string;
  recommended_model_ids: number[];
  recommended_providers: string[];
}

export type AgentStatus =
  | "idle" | "thinking" | "planning" | "coding" | "designing" | "writing"
  | "reviewing" | "testing" | "meeting" | "waiting" | "done" | "error";

export interface Agent {
  id: number;
  company_id: number;
  department_id: number | null;
  assigned_ai_model_id: number | null;
  name: string;
  role: string;
  skills: string[];
  personality: string;
  avatar: string;
  accent: string;
  status: AgentStatus;
  current_task: string;
  animation_state: string;
}

export type ProjectStatus =
  | "draft" | "planning" | "in_progress" | "reviewing" | "testing"
  | "completed" | "archived" | "failed" | "paused";

export interface Project {
  id: number;
  company_id: number;
  name: string;
  description: string;
  type: string;
  status: ProjectStatus;
  priority: "low" | "medium" | "high";
  assigned_department_ids: number[];
  assigned_agent_ids: number[];
  workspace_path: string;
  github_repo_url: string;
  vps_status: string;
  progress: number;
  created_at?: string;
  updated_at?: string;
}

export interface Task {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: "backlog" | "in_progress" | "review" | "done";
  assignee_agent_id: number | null;
  priority: string;
}

export interface ProjectFile {
  id: number;
  project_id: number;
  path: string;
  kind: "file" | "dir";
  language: string;
  preview: string;
  size_bytes: number;
}

export interface Activity {
  id: number;
  company_id: number | null;
  project_id: number | null;
  department_id: number | null;
  agent_id: number | null;
  action: string;
  status: string;
  message: string;
  related_file: string;
  created_at: string;
}

export interface CommandResult {
  id: number;
  company_id: number | null;
  text: string;
  detected_intent: string;
  response: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface MetaOptions {
  max_departments: number;
  department_types: string[];
  agent_roles: string[];
  agent_statuses: AgentStatus[];
  project_types: string[];
  project_statuses: ProjectStatus[];
  idle_activities: string[];
}

export interface ServerStatus {
  online: boolean;
  region: string;
  uptime_hours: number;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  companies: number;
  projects: number;
  workspaces_total: number;
  workspaces_running: number;
}
