import { getInfrastructure } from "@/lib/data/infrastructure";
import { PageHeader, ErrorState, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Cpu, Database, ListTree, HardDrive, Archive, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const dynamic = "force-dynamic";

type Tone = "ok" | "warn" | "down" | "na";
const TONE: Record<Tone, { dot: string; text: string; label: string }> = {
  ok: { dot: "#35D07F", text: "text-[#35D07F]", label: "online" },
  warn: { dot: "#F0B84B", text: "text-[#F0B84B]", label: "degraded" },
  down: { dot: "#EF5B69", text: "text-[#EF5B69]", label: "down" },
  na: { dot: "#657A91", text: "text-[#657A91]", label: "n/a" },
};

function ServiceCard({ icon: Icon, name, tone, detail, labelOverride }: { icon: LucideIcon; name: string; tone: Tone; detail: string; labelOverride?: string }) {
  const t = TONE[tone];
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#244768] bg-[#0E1B2D] p-3.5">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#12233A] ring-1 ring-[#244768]/70">
        <Icon className="h-5 w-5 text-[#3ABEF9]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-[#F4F7FB]">{name}</div>
        <div className="truncate text-[11px] text-[#657A91]">{detail}</div>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
        <span className="h-2 w-2 rounded-full" style={{ background: t.dot, boxShadow: tone === "na" ? "none" : `0 0 6px ${t.dot}` }} />
        <span className={t.text}>{labelOverride ?? t.label}</span>
      </span>
    </div>
  );
}

const PROVIDER_TONE: Record<string, Tone> = { CONNECTED: "ok", ERROR: "down", UNTESTED: "warn", DISABLED: "na" };

export default async function InfrastructurePage() {
  let d;
  try { d = await getInfrastructure(); }
  catch { return (<><PageHeader title="Infrastructure" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }

  const workerLive = d.workers.some((w) => w.live);
  const services: { icon: LucideIcon; name: string; tone: Tone; detail: string; labelOverride?: string }[] = [
    { icon: Globe, name: "Web Application", tone: "ok", detail: "Next.js · serving requests" },
    { icon: Cpu, name: "Worker Service", tone: workerLive ? "ok" : "down", detail: workerLive ? `${d.workers.length} process · queue ${d.queueDepth}` : "ไม่มีเวิร์กเกอร์ออนไลน์" },
    { icon: Database, name: "PostgreSQL", tone: d.database.ok ? "ok" : "down", detail: `latency ${d.database.latencyMs ?? "—"}ms` },
    { icon: ListTree, name: "Redis Queue", tone: d.redis.ok ? (d.redis.detail?.includes("not configured") ? "na" : "ok") : "down", detail: d.redis.detail ?? `latency ${d.redis.latencyMs ?? "—"}ms`, labelOverride: d.redis.detail?.includes("not configured") ? "DB fallback" : undefined },
    { icon: HardDrive, name: "File Storage", tone: "na", detail: "local disk · UPLOAD_DIR", labelOverride: "local" },
    { icon: Archive, name: "Backup Service", tone: "na", detail: "ยังไม่ได้ตั้งค่า", labelOverride: "not set" },
  ];

  return (
    <>
      <PageHeader title="Infrastructure" description="สถานะระบบแบบเรียลไทม์ — บริการ, คิว, เวิร์กเกอร์ และ AI providers" />

      {/* stat strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: "Queue depth", v: d.queueDepth, s: "รอประมวลผล" },
          { l: "Running", v: d.runningTasks, s: "กำลังทำงาน" },
          { l: "Workers online", v: d.workers.filter((w) => w.live).length, s: `จาก ${d.workers.length}` },
          { l: "Providers", v: d.providers.length, s: "การเชื่อมต่อ" },
        ].map((m) => (
          <Card key={m.l}><CardContent className="p-3.5"><div className="text-[11px] text-[#657A91]">{m.l}</div><div className="mt-0.5 text-2xl font-bold tabular-nums text-[#F4F7FB]">{m.v}</div><div className="text-[10px] text-[#657A91]">{m.s}</div></CardContent></Card>
        ))}
      </div>

      {/* services */}
      <h2 className="mb-2 text-sm font-bold text-[#F4F7FB]">Services</h2>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => <ServiceCard key={s.name} {...s} />)}
      </div>

      {/* providers */}
      <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#F4F7FB]"><Sparkles className="h-4 w-4 text-[#9B6CF6]" /> AI Providers</h2>
      {d.providers.length === 0 ? <EmptyState title="ยังไม่มี provider" description="เพิ่มการเชื่อมต่อใน Settings › Providers" /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {d.providers.map((p) => {
            const t = TONE[PROVIDER_TONE[p.status] ?? "na"];
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[#244768] bg-[#0E1B2D] p-3.5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#12233A] text-xs font-bold text-[#9B6CF6] ring-1 ring-[#244768]/70">{p.providerType.slice(0, 2)}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-[#F4F7FB]">{p.displayName}</div>
                  <div className="truncate text-[11px] text-[#657A91]">{p.providerType} · {p.companyId ? "company" : "system"}{p.lastTestedAt ? ` · ${new Date(p.lastTestedAt).toLocaleDateString()}` : ""}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium">
                  <span className="h-2 w-2 rounded-full" style={{ background: t.dot }} /><span className={t.text}>{p.status.toLowerCase()}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
