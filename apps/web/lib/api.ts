// Typed API client for the FastAPI backend.
// Base URL is configurable; defaults to the local dev server.

import type {
  Activity, Agent, AIModel, Company, CompanyOverview, CommandResult,
  Department, MetaOptions, Project, ProjectFile, Recommendation,
  ServerStatus, Task,
} from "./types";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const body = (data: unknown) => JSON.stringify(data);

export const api = {
  // --- meta / server ---
  metaOptions: () => request<MetaOptions>("/api/meta/options"),
  serverStatus: () => request<ServerStatus>("/api/server/status"),

  // --- companies ---
  listCompanies: () => request<CompanyOverview[]>("/api/companies"),
  getCompany: (id: number) => request<Company>(`/api/companies/${id}`),
  createCompany: (data: Partial<Company>) =>
    request<Company>("/api/companies", { method: "POST", body: body(data) }),
  updateCompany: (id: number, data: Partial<Company>) =>
    request<Company>(`/api/companies/${id}`, { method: "PUT", body: body(data) }),
  deleteCompany: (id: number) =>
    request<void>(`/api/companies/${id}`, { method: "DELETE" }),

  // --- departments ---
  listDepartments: (companyId: number) =>
    request<Department[]>(`/api/companies/${companyId}/departments`),
  createDepartment: (companyId: number, data: Partial<Department>) =>
    request<Department>(`/api/companies/${companyId}/departments`, { method: "POST", body: body(data) }),
  updateDepartment: (id: number, data: Partial<Department>) =>
    request<Department>(`/api/departments/${id}`, { method: "PUT", body: body(data) }),
  departmentUsage: (id: number) =>
    request<{ agents: number; projects: number }>(`/api/departments/${id}/usage`),
  deleteDepartment: (id: number) =>
    request<void>(`/api/departments/${id}`, { method: "DELETE" }),

  // --- ai models ---
  listModels: () => request<AIModel[]>("/api/ai-models"),
  recommendModel: (departmentType: string) =>
    request<Recommendation>(`/api/ai-models/recommend?department_type=${encodeURIComponent(departmentType)}`),

  // --- agents ---
  listAgents: (companyId: number) =>
    request<Agent[]>(`/api/companies/${companyId}/agents`),
  createAgent: (companyId: number, data: Partial<Agent>) =>
    request<Agent>(`/api/companies/${companyId}/agents`, { method: "POST", body: body(data) }),
  updateAgent: (id: number, data: Partial<Agent>) =>
    request<Agent>(`/api/agents/${id}`, { method: "PUT", body: body(data) }),
  deleteAgent: (id: number) => request<void>(`/api/agents/${id}`, { method: "DELETE" }),

  // --- projects ---
  listProjects: (companyId: number) =>
    request<Project[]>(`/api/companies/${companyId}/projects`),
  getProject: (id: number) => request<Project>(`/api/projects/${id}`),
  createProject: (companyId: number, data: Partial<Project>) =>
    request<Project>(`/api/companies/${companyId}/projects`, { method: "POST", body: body(data) }),
  updateProject: (id: number, data: Partial<Project>) =>
    request<Project>(`/api/projects/${id}`, { method: "PUT", body: body(data) }),
  deleteProject: (id: number) => request<void>(`/api/projects/${id}`, { method: "DELETE" }),
  startProject: (id: number) => request<Project>(`/api/projects/${id}/start`, { method: "POST" }),
  pauseProject: (id: number) => request<Project>(`/api/projects/${id}/pause`, { method: "POST" }),
  resumeProject: (id: number) => request<Project>(`/api/projects/${id}/resume`, { method: "POST" }),

  // --- tasks ---
  listTasks: (projectId: number) => request<Task[]>(`/api/projects/${projectId}/tasks`),

  // --- workspace / vps ---
  createWorkspace: (projectId: number) =>
    request<unknown>(`/api/projects/${projectId}/workspace/create`, { method: "POST" }),
  workspaceFiles: (projectId: number) =>
    request<ProjectFile[]>(`/api/projects/${projectId}/workspace/files`),
  workspaceLogs: (projectId: number) =>
    request<{ ts: string; level: string; line: string }[]>(`/api/projects/${projectId}/workspace/logs`),
  runCommand: (projectId: number, command: string) =>
    request<{ status: string; stdout: string; stderr: string; exit_code: number }>(
      `/api/projects/${projectId}/workspace/run-command`,
      { method: "POST", body: body({ command }) },
    ),

  // --- activities ---
  listActivities: (limit = 50) => request<Activity[]>(`/api/activities?limit=${limit}`),
  projectActivities: (projectId: number) =>
    request<Activity[]>(`/api/projects/${projectId}/activities`),

  // --- commands ---
  sendCommand: (text: string, companyId?: number) =>
    request<CommandResult>("/api/commands", {
      method: "POST",
      body: body({ text, company_id: companyId ?? null }),
    }),
  commandHistory: () => request<CommandResult[]>("/api/commands/history"),
};

export function activitiesSocketUrl(): string {
  return `${API_BASE.replace(/^http/, "ws")}/ws/activities`;
}
