"use client";
// ISOLATED VISUAL LAB — /visual-lab/it-dev-floor
// Test environment only. Validates the IT/Dev floor scene + 3 composited agents.
// Does not touch the Company Building or any production page.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAssetStatus } from "@/hooks/useAssetStatus";
import {
  AGENTS, ALL_ASSET_PATHS, IT_DEV_FLOOR_ASSET, fileName, idleStates,
} from "@/lib/assets/verticalSlice";
import { ItDevFloorScene } from "@/components/scene/ItDevFloorScene";
import { Button, Card, Select } from "@/components/ui";

type Mode = "showcase" | "band";
type Focal = "top" | "center" | "bottom";

export default function ItDevVisualLab() {
  const status = useAssetStatus(ALL_ASSET_PATHS);

  const [agentStates, setAgentStates] = useState<Record<string, string>>(
    () => Object.fromEntries(AGENTS.map((a) => [a.id, a.default])),
  );
  const [mode, setMode] = useState<Mode>("showcase");
  const [lighting, setLighting] = useState(true);
  const [labels, setLabels] = useState(false);
  const [bounds, setBounds] = useState(false);
  const [focal, setFocal] = useState<Focal>("center");
  const [idleRotate, setIdleRotate] = useState(false);

  // Sizing / zoom
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState(900);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setFitWidth(Math.max(320, el.clientWidth - 24));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const displayW = Math.round(Math.min(3200, Math.max(320, fitWidth * zoom)));

  // Idle auto-rotation (staggered)
  useEffect(() => {
    if (!idleRotate) return;
    const id = setInterval(() => {
      setAgentStates((prev) => {
        const next = { ...prev };
        for (const a of AGENTS) {
          if (Math.random() < 0.5) {
            const pool = idleStates(a);
            next[a.id] = pool[Math.floor(Math.random() * pool.length)];
          }
        }
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, [idleRotate]);

  const setState = useCallback((agentId: string, key: string) => {
    setAgentStates((p) => ({ ...p, [agentId]: key }));
  }, []);

  const missing = useMemo(() => ALL_ASSET_PATHS.filter((p) => status[p] === "missing"), [status]);
  const okCount = ALL_ASSET_PATHS.filter((p) => status[p] === "ok").length;

  return (
    <div className="space-y-4">
      <header>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#FF3DAE]/20 font-pixel text-[10px] text-[#FF3DAE]">LAB</span>
          <h1 className="font-display text-sm text-ink" style={{ color: "#bcd0ff" }}>Visual Lab · IT / Dev Floor</h1>
        </div>
        <p className="mt-1 text-xs text-muted">Isolated visual test — engine + asset-loading contract. Drop the 13 real assets in and they auto-render.</p>
      </header>

      {/* Control bar */}
      <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted">Mode</span>
          <Button variant={mode === "showcase" ? "primary" : "secondary"} className="!py-1 !px-2" onClick={() => setMode("showcase")}>Showcase 8:3</Button>
          <Button variant={mode === "band" ? "primary" : "secondary"} className="!py-1 !px-2" onClick={() => setMode("band")}>Band 5:1</Button>
        </div>
        {mode === "band" ? (
          <div className="flex items-center gap-1">
            <span className="text-muted">Focal</span>
            {(["top", "center", "bottom"] as Focal[]).map((f) => (
              <Button key={f} variant={focal === f ? "primary" : "secondary"} className="!py-1 !px-2" onClick={() => setFocal(f)}>{f}</Button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-1">
          <span className="text-muted">Zoom</span>
          <Button variant="secondary" className="!py-1 !px-2" onClick={() => setZoom(1)}>Fit</Button>
          <Button variant="secondary" className="!py-1 !px-2" onClick={() => setZoom(1200 / fitWidth)}>100%</Button>
          <Button variant="secondary" className="!py-1 !px-2" onClick={() => setZoom((z) => Math.max(0.4, z * 0.87))}>−</Button>
          <Button variant="secondary" className="!py-1 !px-2" onClick={() => setZoom((z) => Math.min(3, z * 1.15))}>+</Button>
          <span className="text-faint">{Math.round(displayW)}px</span>
        </div>
        <label className="flex items-center gap-1 text-muted"><input type="checkbox" checked={lighting} onChange={(e) => setLighting(e.target.checked)} /> Lighting</label>
        <label className="flex items-center gap-1 text-muted"><input type="checkbox" checked={labels} onChange={(e) => setLabels(e.target.checked)} /> Labels</label>
        <label className="flex items-center gap-1 text-muted"><input type="checkbox" checked={bounds} onChange={(e) => setBounds(e.target.checked)} /> Asset bounds</label>
        <label className="flex items-center gap-1 text-muted"><input type="checkbox" checked={idleRotate} onChange={(e) => setIdleRotate(e.target.checked)} /> Play idle rotation</label>
      </Card>

      {/* Agent state controls */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {AGENTS.map((a) => (
          <Card key={a.id} className="p-3">
            <div className="mb-2 text-xs font-bold text-ink">{a.role}</div>
            <Select value={agentStates[a.id]} onChange={(e) => setState(a.id, e.target.value)}>
              {a.states.map((s) => (
                <option key={s.key} value={s.key}>{s.label} · {s.category}</option>
              ))}
            </Select>
          </Card>
        ))}
      </div>

      {/* Scene viewport */}
      <Card className="p-3">
        <div ref={viewportRef} className="scroll-slim overflow-auto" style={{ maxHeight: "72vh" }}>
          <div className="mx-auto w-fit">
            <ItDevFloorScene
              agentStates={agentStates}
              status={status}
              mode={mode}
              lighting={lighting}
              labels={labels}
              bounds={bounds}
              displayW={displayW}
              focal={focal}
            />
          </div>
        </div>
      </Card>

      {/* Asset status panel */}
      <Card className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-ink">Asset Status</span>
          <span className={`text-xs font-semibold ${missing.length ? "text-[#FF3DAE]" : "text-lime"}`}>
            {okCount}/{ALL_ASSET_PATHS.length} present{missing.length ? ` · ${missing.length} missing` : " · complete ✓"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_ASSET_PATHS.map((p) => {
            const s = status[p];
            const mark = s === "ok" ? "✓" : s === "missing" ? "✗" : "…";
            const color = s === "ok" ? "text-lime" : s === "missing" ? "text-[#FF3DAE]" : "text-faint";
            return (
              <div key={p} className="flex items-center gap-2 font-mono text-[11px]">
                <span className={`${color} w-3`}>{mark}</span>
                <span className="truncate text-muted" title={p}>{fileName(p)}</span>
              </div>
            );
          })}
        </div>
        {missing.length ? (
          <div className="mt-3 rounded-lg border border-[#FF3DAE]/40 bg-[#FF3DAE]/10 p-2 text-[11px] text-[#FF3DAE]">
            <div className="mb-1 font-bold">Missing assets ({missing.length}) — drop real WebP files here:</div>
            <ul className="space-y-0.5 font-mono">
              <li className="text-ink/70">/apps/web/public{IT_DEV_FLOOR_ASSET.replace(fileName(IT_DEV_FLOOR_ASSET), "")}</li>
              {missing.map((p) => <li key={p}>✗ {p}</li>)}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
