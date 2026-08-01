import Link from "next/link";
import { getMission, currentDeliveryRole } from "@/lib/data/missions";
import { canPerform } from "@/lib/delivery/roles";
import { PageHeader, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MissionControls } from "@/components/missions/MissionControls";
import { EvidenceStatusSummary } from "@/components/missions/EvidenceStatus";

export const dynamic = "force-dynamic";

const TONE: Record<string, "green" | "amber" | "red" | "blue" | "purple" | "neutral"> = {
  COMPLETED: "green", PASSED: "green", EXECUTING: "blue", ANALYZING: "blue", RUNNING: "blue",
  IN_PROGRESS: "blue", UAT: "purple", PAUSED: "amber", BLOCKED: "red", FAILED: "red",
  CANCELLED: "neutral", DRAFT: "neutral", BACKLOG: "neutral", READY: "amber",
  SUCCEEDED: "green", PENDING: "amber", ASSIGNED: "blue",
};

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-[#657A91]">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums text-[#F4F7FB]">{value}</div>
      {sub ? <div className="text-[10px] text-[#657A91]">{sub}</div> : null}
    </CardContent></Card>
  );
}

export default async function MissionDetailPage({ params }: { params: { missionId: string } }) {
  let data, role;
  try { [data, role] = await Promise.all([getMission(params.missionId), currentDeliveryRole()]); }
  catch { return (<><PageHeader title="Mission" /><ErrorState title="ไม่พบ mission หรือไม่มีสิทธิ์" /></>); }
  const { mission: m, stats, workers, evidence } = data;
  const canOperate = canPerform(role.role, "mission.start");
  const coverage = stats.tracesTotal > 0 ? Math.round((stats.tracesSatisfied / stats.tracesTotal) * 100) : 0;

  return (
    <>
      <Breadcrumbs items={[{ label: "Mission Control", href: "/missions" }, { label: m.key }]} />
      <PageHeader
        title={m.title}
        description={`${m.key} · ${m.repositoryUrl.replace("https://github.com/", "")} @ ${m.baseBranch}`}
        actions={<>
          <Badge tone={TONE[m.status] ?? "neutral"}>{m.status.toLowerCase()}</Badge>
          <Badge tone="neutral">{m.autonomyLevel.replace("_", " ").toLowerCase()}</Badge>
        </>}
      />

      {m.status === "BLOCKED" ? (
        <div className="mb-3 rounded-lg border border-[#EF5B69]/40 bg-[#2a1418] px-4 py-3">
          <div className="text-sm font-bold text-[#EF5B69]">BLOCKED — {m.blockedReason}</div>
          <div className="mt-0.5 text-xs text-[#9DB1C8]">{m.blockedDetail}</div>
        </div>
      ) : null}

      <div className="mb-3"><MissionControls missionId={m.id} status={m.status} canOperate={canOperate} /></div>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-7">
        <Stat label="Iteration" value={m.iteration} sub={`max ${m.maxIterations}`} />
        <Stat label="Elapsed" value={`${stats.elapsedMin}m`} sub={m.startedAt ? "since start" : "not started"} />
        <Stat label="Budget" value={`$${Number(m.budget?.spentCostUsd ?? 0).toFixed(4)}`} sub={`of $${Number(m.budget?.maxCostUsd ?? 0).toFixed(2)}`} />
        <Stat label="Requirements" value={m.requirements.length} sub={`${stats.criteriaTotal} criteria`} />
        <Stat label="Coverage" value={`${coverage}%`} sub={`${stats.tracesSatisfied}/${stats.tracesTotal} traced`} />
        <Stat label="Agent runs" value={m.agentRuns.length} sub={`${stats.activeRuns} active · ${stats.failedRuns} failed`} />
        <Stat label="Tool calls" value={stats.toolCount} sub={`${m._count.checkpoints} checkpoints`} />
      </div>

      {evidence ? (
        <Card className="mb-4">
          <CardHeader><CardTitle>หลักฐาน Canonical Baseline (WP-002)</CardTitle></CardHeader>
          <CardContent><EvidenceStatusSummary {...evidence} /></CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Work packages ({m.workPackages.length})</CardTitle>
              <span className="text-[11px] text-[#657A91]">{Object.entries(stats.wpByStatus).map(([k, v]) => `${k.toLowerCase()} ${v}`).join(" · ")}</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="scroll-slim overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase text-[#657A91]">
                    <tr className="border-b border-[#244768]/60">
                      <th className="px-4 py-2">WP</th><th className="px-2 py-2">Title</th>
                      <th className="px-2 py-2">Role</th><th className="px-2 py-2">Status</th><th className="px-4 py-2">Deps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.workPackages.map((w) => {
                      const deps = w.dependsOn.map((d) => m.workPackages.find((x) => x.id === d.dependsOnId)?.key).filter(Boolean);
                      return (
                        <tr key={w.id} className="border-b border-[#244768]/30">
                          <td className="px-4 py-2 font-pixel font-bold text-[#3ABEF9]">{w.key}</td>
                          <td className="px-2 py-2 text-[#F4F7FB]">{w.title}</td>
                          <td className="px-2 py-2 text-[#9DB1C8]">{w.role.toLowerCase()}</td>
                          <td className="px-2 py-2"><Badge tone={TONE[w.status] ?? "neutral"}>{w.status.toLowerCase()}</Badge></td>
                          <td className="px-4 py-2 text-[10px] text-[#657A91]">{deps.join(", ") || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Agent runs</CardTitle></CardHeader>
            <CardContent className="p-0">
              {m.agentRuns.length === 0 ? <p className="p-4 text-xs text-[#657A91]">ยังไม่มี agent run — กด Start Mission</p> : (
                <ul className="divide-y divide-[#244768]/30">
                  {m.agentRuns.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge tone={TONE[r.status] ?? "neutral"}>{r.status.toLowerCase()}</Badge>
                          <span className="text-[#9DB1C8]">{r.role.toLowerCase()}</span>
                          {r.promptTemplateId ? <span className="text-[10px] text-[#657A91]">{r.promptTemplateId}@{r.promptVersion}</span> : null}
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-[#F4F7FB]">{r.outputSummary ?? r.error ?? r.inputSummary ?? "—"}</div>
                      </div>
                      <div className="shrink-0 text-right text-[10px] text-[#657A91]">
                        <div className="tabular-nums">{r.totalTokens} tok · ${Number(r.costUsd).toFixed(5)}</div>
                        <div>{r.provider ?? "—"} {r.model ?? ""}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Worker health</CardTitle></CardHeader>
            <CardContent>
              {workers.length === 0 ? (
                <p className="text-xs text-[#EF5B69]">ไม่มี delivery worker — รัน <code>npm run missions:worker</code></p>
              ) : (
                <ul className="space-y-1.5">
                  {workers.map((w) => (
                    <li key={w.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-[#9DB1C8]">
                        <span className={`h-2 w-2 rounded-full ${w.live ? "bg-[#35D07F]" : "bg-[#EF5B69]"}`} />
                        <span className="truncate">{w.name}</span>
                      </span>
                      <span className="text-[10px] text-[#657A91]">{w.ageSeconds}s · คิว {w.queueDepth}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quality gates</CardTitle></CardHeader>
            <CardContent>
              {m.gateResults.length === 0 ? <p className="text-xs text-[#657A91]">ยังไม่ประเมิน</p> : (
                <ul className="space-y-1 text-xs">
                  {m.gateResults.map((g) => (
                    <li key={g.id} className="flex items-center justify-between">
                      <span className="text-[#9DB1C8]">{g.kind}</span>
                      <Badge tone={g.status === "PASSED" ? "green" : g.status === "FAILED" ? "red" : "neutral"}>{g.status.toLowerCase()}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Evidence ({m.artifacts.length})</CardTitle>
              <Link href={`/missions/${m.id}/evidence`} className="text-[11px] text-[#3ABEF9] hover:underline">ทั้งหมด</Link>
            </CardHeader>
            <CardContent>
              {m.artifacts.length === 0 ? <p className="text-xs text-[#657A91]">ยังไม่มีหลักฐาน</p> : (
                <ul className="space-y-1 text-[11px]">
                  {m.artifacts.slice(0, 8).map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <span className="truncate text-[#F4F7FB]">{a.label}</span>
                      <span className="shrink-0 text-[#657A91]">{a.sizeBytes ? `${Math.round(a.sizeBytes / 1024)}KB` : ""}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-1 text-[11px]">
                {m.auditLogs.slice(0, 10).map((l) => (
                  <li key={l.id} className="text-[#9DB1C8]">
                    <span className="text-[#657A91]">{l.createdAt.toLocaleTimeString()}</span>{" "}
                    <span className="text-[#F4F7FB]">{l.action}</span>{l.reason ? ` — ${l.reason}` : ""}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
