"use client";
// Project Detail — overview, team, task board, timeline, files, VPS workspace + logs.
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Github, Pause, Play, RotateCw } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useUI } from "@/lib/store";
import type { Activity, Agent, Project, ProjectFile, Task } from "@/lib/types";
import { ActivityItem } from "@/components/ActivityItem";
import { AgentSprite } from "@/components/AgentSprite";
import { Badge, Button, Card, EmptyState, ProgressBar } from "@/components/ui";

const TASK_COLUMNS: { key: Task["status"]; label: string; color: string }[] = [
  { key: "backlog", label: "Backlog", color: "#61708F" },
  { key: "in_progress", label: "In Progress", color: "#5BE49B" },
  { key: "review", label: "Review", color: "#A98BFF" },
  { key: "done", label: "Done", color: "#5BE49B" },
];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const projectId = Number(params.id);
  const router = useRouter();
  const pushToast = useUI((s) => s.pushToast);

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [logs, setLogs] = useState<{ ts: string; level: string; line: string }[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const p = await api.getProject(projectId);
      setProject(p);
      const [t, f, a, ag] = await Promise.all([
        api.listTasks(projectId), api.workspaceFiles(projectId),
        api.projectActivities(projectId), api.listAgents(p.company_id),
      ]);
      setTasks(t); setFiles(f); setActivities(a);
      setAgents(ag.filter((x) => p.assigned_agent_ids.includes(x.id)));
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : "Failed to load project", "error");
    }
  }
  useEffect(() => { if (projectId) load(); /* eslint-disable-next-line */ }, [projectId]);

  async function lifecycle(action: "start" | "pause" | "resume") {
    setBusy(true);
    try {
      const fn = action === "start" ? api.startProject : action === "pause" ? api.pauseProject : api.resumeProject;
      await fn(projectId);
      pushToast(`Project ${action}ed`, "success");
      load();
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : "Action failed", "error");
    } finally { setBusy(false); }
  }

  async function provisionWorkspace() {
    setBusy(true);
    try {
      await api.createWorkspace(projectId);
      const [f, l] = await Promise.all([api.workspaceFiles(projectId), api.workspaceLogs(projectId)]);
      setFiles(f); setLogs(l);
      pushToast("Workspace created on VPS (mock)", "success");
      load();
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : "Provision failed", "error");
    } finally { setBusy(false); }
  }

  async function refreshLogs() {
    try { setLogs(await api.workspaceLogs(projectId)); } catch { /* noop */ }
  }
  useEffect(() => { if (projectId) refreshLogs(); /* eslint-disable-next-line */ }, [projectId]);

  if (!project) return <div className="h-96 animate-pulse rounded-xl2 border border-line bg-card" />;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => router.push(`/companies/${project.company_id}`)}><ArrowLeft size={16} /></Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{project.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted">
              <span>{project.type}</span>
              <Badge>{project.status.replace("_", " ")}</Badge>
              <Badge color="#3BE8E0">VPS: {project.vps_status.replace("_", " ")}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {project.status === "in_progress"
            ? <Button variant="secondary" disabled={busy} onClick={() => lifecycle("pause")}><Pause size={16} /> Pause</Button>
            : <Button disabled={busy} onClick={() => lifecycle(project.status === "paused" ? "resume" : "start")}><Play size={16} /> {project.status === "paused" ? "Resume" : "Start"}</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4">
            <div className="mb-2 flex justify-between text-sm"><span className="font-semibold text-ink">Overview</span><span className="text-muted">{project.progress}%</span></div>
            <ProgressBar value={project.progress} />
            <p className="mt-3 text-sm text-muted">{project.description || "No description yet."}</p>
          </Card>

          {/* Task board */}
          <Card className="p-4">
            <div className="mb-3 font-semibold text-ink">Task Board</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {TASK_COLUMNS.map((col) => {
                const items = tasks.filter((t) => t.status === col.key);
                return (
                  <div key={col.key}>
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold" style={{ color: col.color }}>
                      {col.label} <span className="rounded-full bg-surface px-1.5">{items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((t) => (
                        <div key={t.id} className="rounded-lg border border-line bg-surface p-2 text-xs text-ink">{t.title}</div>
                      ))}
                      {items.length === 0 ? <div className="text-[10px] text-faint">—</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Files + workspace */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-ink">Workspace Files</span>
              <Button variant="secondary" disabled={busy} onClick={provisionWorkspace}>Create / Sync Workspace</Button>
            </div>
            {files.length === 0 ? (
              <EmptyState icon="📂" title="No workspace yet" message="Create the VPS workspace to scaffold the file tree." />
            ) : (
              <div className="rounded-xl border border-line bg-base p-3 font-mono text-xs">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 py-0.5">
                    <span>{f.kind === "dir" ? "📁" : "📄"}</span>
                    <span className="text-ink">{f.path}</span>
                    {f.language ? <span className="text-faint">· {f.language}</span> : null}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 text-xs text-faint">📍 {project.workspace_path || "workspace not provisioned"}</div>
          </Card>

          {/* VPS logs */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-semibold text-ink">VPS Logs</span>
              <Button variant="ghost" onClick={refreshLogs}><RotateCw size={14} /> Refresh</Button>
            </div>
            <div className="scroll-slim max-h-48 overflow-y-auto rounded-xl border border-line bg-base p-3 font-mono text-xs">
              {logs.length === 0 ? <div className="text-faint">No logs yet.</div> : logs.map((l, i) => (
                <div key={i} className={l.level === "warn" ? "text-amber" : l.level === "error" ? "text-[#FF6B7A]" : "text-muted"}>
                  [{l.level}] {l.line}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 font-semibold text-ink">Assigned Team</div>
            {agents.length === 0 ? <div className="text-sm text-faint">No agents assigned.</div> : (
              <div className="flex flex-wrap gap-3">
                {agents.map((a) => <AgentSprite key={a.id} agent={a} size={44} />)}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <div className="mb-1 font-semibold text-ink">GitHub</div>
            <div className="flex items-center gap-2 text-sm text-muted">
              <Github size={16} />
              {project.github_repo_url ? <a href={project.github_repo_url} className="text-neon">{project.github_repo_url}</a> : <span className="text-faint">Not connected (future)</span>}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 font-semibold text-ink">Activity Timeline</div>
            {activities.length === 0 ? <div className="text-sm text-faint">No activity yet.</div> : (
              <div>{activities.map((a, i) => <ActivityItem key={a.id} activity={a} last={i === activities.length - 1} />)}</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
