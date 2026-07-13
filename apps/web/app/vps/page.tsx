"use client";
// VPS Workspace + Server Monitor — mock infrastructure view.
import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { api } from "@/lib/api";
import type { ServerStatus } from "@/lib/types";
import { Button, Card, ProgressBar } from "@/components/ui";

function Gauge({ label, percent, color }: { label: string; percent: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted"><span>{label}</span><span>{percent}%</span></div>
      <ProgressBar value={percent} color={color} />
    </div>
  );
}

const ALLOWLIST = ["npm install", "npm run build", "npm run test", "python script.py", "git status", "git add", "git commit", "git push", "ls", "cat", "mkdir", "touch"];
const BLOCKLIST = ["rm -rf /", "shutdown", "reboot", "sudo", "useradd", "chmod 777 /", "curl … | bash"];

export default function VPSPage() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try { setStatus(await api.serverStatus()); } catch { /* backend offline */ } finally { setLoading(false); }
  }
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">VPS · Server Monitor</h1>
          <p className="text-sm text-muted">Where backend, AI workers, workspaces, logs & file generation run. (mock)</p>
        </div>
        <Button variant="secondary" disabled={loading} onClick={load}><RotateCw size={16} /> Refresh</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-semibold text-ink">Server Status</span>
            <span className="inline-flex items-center gap-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${status?.online ? "bg-lime animate-pulseSoft" : "bg-[#FF6B7A]"}`} />
              {status?.online ? "Online" : "Offline"} · {status?.region ?? "—"}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Gauge label="CPU" percent={status?.cpu_percent ?? 0} color="#5B8CFF" />
            <Gauge label="Memory" percent={status?.memory_percent ?? 0} color="#A98BFF" />
            <Gauge label="Disk" percent={status?.disk_percent ?? 0} color="#3BE8E0" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Uptime", `${status?.uptime_hours ?? 0}h`],
              ["Companies", status?.companies ?? 0],
              ["Projects", status?.projects ?? 0],
              ["Workspaces", `${status?.workspaces_running ?? 0}/${status?.workspaces_total ?? 0}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-surface p-3 text-center">
                <div className="text-lg font-bold text-ink">{value}</div>
                <div className="text-xs text-muted">{label}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2 font-semibold text-ink">Workspace Model</div>
          <div className="rounded-xl border border-line bg-base p-3 font-mono text-xs text-muted">
            /workspaces/companies/<br />
            &nbsp;&nbsp;company-a/project-alpha/<br />
            &nbsp;&nbsp;company-a/project-beta/<br />
            &nbsp;&nbsp;company-b/game-city-builder/
          </div>
          <div className="mt-3 text-xs text-faint">Each project gets an isolated workspace: /src /docs /assets /tests /logs /output + README.md, project.json</div>
        </Card>

        {/* Command safety */}
        <Card className="p-4">
          <div className="mb-2 font-semibold text-lime">✅ Allowed commands</div>
          <div className="flex flex-wrap gap-1">
            {ALLOWLIST.map((c) => <span key={c} className="rounded-md bg-lime/10 px-2 py-0.5 font-mono text-[11px] text-lime">{c}</span>)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 font-semibold text-[#FF6B7A]">⛔ Blocked commands</div>
          <div className="flex flex-wrap gap-1">
            {BLOCKLIST.map((c) => <span key={c} className="rounded-md bg-[#FF6B7A]/10 px-2 py-0.5 font-mono text-[11px] text-[#FF6B7A]">{c}</span>)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-2 font-semibold text-ink">Capabilities (prepared)</div>
          <ul className="space-y-1 text-xs text-muted">
            {["Create workspace", "Read / write / update / delete files", "Run allowed commands", "Run build", "Run test", "Read logs"].map((c) => (
              <li key={c}>▸ {c}</li>
            ))}
          </ul>
          <div className="mt-2 text-[11px] text-faint">MVP: mock responses only — no real shell execution.</div>
        </Card>
      </div>
    </div>
  );
}
