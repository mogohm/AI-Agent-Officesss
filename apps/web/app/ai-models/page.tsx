"use client";
// AI Model Selection — browse mock models + explore recommendations by dept.
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AIModel, Recommendation } from "@/lib/types";
import { DEPARTMENT_TYPES } from "@/lib/constants";
import { providerBadge } from "@/lib/theme";
import { Badge, Card, EmptyState, Field, Select } from "@/components/ui";

function Level({ label, value }: { label: string; value: string }) {
  const color = value === "high" || value === "fast" ? "#5BE49B" : value === "low" || value === "slow" ? "#FF9F6B" : "#FFD166";
  return <span className="text-xs text-muted">{label}: <span style={{ color }} className="font-semibold">{value}</span></span>;
}

function Caps({ m }: { m: AIModel }) {
  const caps = [
    ["Text", m.supports_text], ["Code", m.supports_code],
    ["Image", m.supports_image], ["File", m.supports_file],
  ] as const;
  return (
    <div className="flex flex-wrap gap-1">
      {caps.map(([label, on]) => (
        <span key={label} className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${on ? "bg-lime/15 text-lime" : "bg-surface text-faint"}`}>
          {on ? "✓" : "—"} {label}
        </span>
      ))}
    </div>
  );
}

export default function AIModelsPage() {
  const [models, setModels] = useState<AIModel[]>([]);
  const [deptType, setDeptType] = useState("IT / Dev");
  const [rec, setRec] = useState<Recommendation | null>(null);

  useEffect(() => { api.listModels().then(setModels).catch(() => {}); }, []);
  useEffect(() => { api.recommendModel(deptType).then(setRec).catch(() => setRec(null)); }, [deptType]);

  const recSet = new Set(rec?.recommended_model_ids ?? []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">AI Model Selection</h1>
        <p className="text-sm text-muted">Mock models for MVP. Real OpenAI / Claude / Gemini / Local / Image AI plug in later.</p>
      </div>

      {/* Recommendation explorer */}
      <Card className="mb-6 p-4">
        <div className="grid gap-3 sm:grid-cols-[240px_1fr] sm:items-center">
          <Field label="Recommend models for department">
            <Select value={deptType} onChange={(e) => setDeptType(e.target.value)}>
              {DEPARTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>
          <div className="rounded-xl border border-line bg-surface p-3">
            <div className="text-xs font-semibold text-cyan">💡 {rec?.reason ?? "Pick a department type."}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(rec?.recommended_providers ?? []).map((p) => {
                const b = providerBadge(p);
                return <Badge key={p} color={b.color}>{b.label}</Badge>;
              })}
            </div>
          </div>
        </div>
      </Card>

      {models.length === 0 ? (
        <EmptyState icon="🤖" title="No models" message="Start the backend to load mock AI models." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {models.map((m) => {
            const b = providerBadge(m.provider);
            const recommended = recSet.has(m.id);
            return (
              <Card key={m.id} glow={recommended ? b.color : undefined} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-ink">{m.display_name}</div>
                    <div className="text-xs text-faint">{m.model_name}</div>
                  </div>
                  <Badge color={b.color}>{b.label}</Badge>
                </div>
                {recommended ? <div className="mt-1 text-[10px] font-semibold text-cyan">💡 recommended for {deptType}</div> : null}
                <p className="mt-2 text-sm text-muted">{m.description}</p>
                <div className="mt-3"><Caps m={m} /></div>
                <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3">
                  <Level label="Cost" value={m.cost_level} />
                  <Level label="Speed" value={m.speed_level} />
                  <Level label="Quality" value={m.quality_level} />
                  {m.context_length > 0 ? <span className="text-xs text-muted">ctx: {(m.context_length / 1000).toFixed(0)}k</span> : null}
                </div>
                {m.best_for.length ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {m.best_for.map((t) => <span key={t} className="rounded-full bg-surfaceAlt px-2 py-0.5 text-[10px] text-muted">{t}</span>)}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
