"use client";
/* eslint-disable @next/next/no-img-element */
// BRIGHT OFFICE — the living Reference-Bright preview page.
// Measured reference composition (docs/REFERENCE_PIXEL_MEASUREMENTS.md):
// no global header · left 24.3% · center 32.3% · right 41% · bottom 16.6%.
// REAL business data (companies/departments/models/projects) + the VISUAL
// preview config (lib/bright/referenceBrightOffice.ts). Production routes
// are untouched — this is a parallel page for review.
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useUI } from "@/lib/store";
import type { Agent, AIModel, Company, CompanyOverview, Department, Project, Recommendation } from "@/lib/types";
import {
  BRIGHT_DEPTS, BrightDept, BrightWorker, GENERIC_BRIGHT_WORKER, brightAssetSrc, brightDeptFor, brightStateAt,
} from "@/lib/bright/referenceBrightOffice";
import { TOWER_FINAL, UnifiedTower } from "@/components/bright/UnifiedTower";

// Tower-frame lightness (render-only; asset untouched). Variants tested in
// outputs/reference-diff/final-acceptance/02-tower-frame-comparison.png.
const SHELL_FILTER = "brightness(1.05)";

const PAGE_BG = "#0D386C";
const SKY = "#2561B3";
const PANEL = "#EEF3FD";
const NAVY = "#17325C";
const LINE = "#C9D6EC";

const PROVIDERS = [
  { key: "openai", label: "GPT (OpenAI)", icon: "🤖" },
  { key: "anthropic", label: "Claude (Anthropic)", icon: "🧠" },
  { key: "google", label: "Gemini (Google)", icon: "✨" },
  { key: "local", label: "Local LLM", icon: "🖥️" },
  { key: "image", label: "Image AI", icon: "🎨" },
];
// Per-company accent identity (styling only — no asset recoloring).
const COMPANY_ACCENT: Record<string, string> = {
  "AI Game Studio": "#7B5BD6",
  "Neon Labs": "#2F9BB0",
  "Neon Games": "#5B6FD6",
};
const accentOf = (name: string, fallback?: string | null) => COMPANY_ACCENT[name] ?? fallback ?? "#3E70C9";

const STATUS_COLOR: Record<string, string> = {
  in_progress: "#3E9E5F", planning: "#C77E1E", completed: "#2F66B3", draft: "#8896B3",
  paused: "#8896B3", reviewing: "#7B5BD6", testing: "#D98A3D", failed: "#C94F4F", archived: "#8896B3",
};

// MiniCompanyTower — the real Unified Tower renderer at miniature scale.
// Selected company shows its real Bright floors; others show the neutral
// shell (its baked empty interiors) as the "no full art yet" variant.
function MiniCompanyTower({ active, accent }: { active: boolean; accent: string }) {
  const FL = "/assets/themes/reference-bright/floors";
  const mini = active ? [
    { key: "growth", src: `${FL}/growth-floor.webp`, focal: "50% 58%" },
    { key: "quality", src: `${FL}/quality-floor.webp`, focal: "50% 58%" },
    { key: "game-studio", src: `${FL}/game-studio-floor.webp`, focal: "50% 58%" },
    { key: "art-design", src: `${FL}/art-design-floor.webp`, focal: "50% 58%" },
    { key: "engineering", src: `${FL}/engineering-floor.webp`, focal: "50% 62%" },
    { key: "product-management", src: `${FL}/product-management-floor.webp`, focal: "50% 55%" },
  ] : [];
  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* card atmosphere: accent depth glow + faint skyline + city lights */}
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(80% 55% at 50% 100%, ${accent}33 0%, transparent 70%)` }} />
      {[[6, 8, 26], [16, 6, 16], [78, 9, 30], [90, 7, 20]].map(([l, w, h], i) => (
        <div key={i} className="pointer-events-none absolute bottom-0" style={{ left: `${l}%`, width: w, height: h, background: "#16305A", opacity: 0.65 }}>
          <span className="absolute left-1 top-1 h-[2px] w-[2px]" style={{ background: "#FFD98A", opacity: 0.6 }} />
        </div>
      ))}
      {/* scaled past the shell's transparent margins so the BUILDING fills the card */}
      <div className="absolute left-1/2 top-1/2" style={{ aspectRatio: "1307 / 1536", height: active ? "152%" : "140%", transform: "translate(-48%, -50%)", filter: active ? "drop-shadow(0 0 10px #FFD98Acc)" : `drop-shadow(0 0 6px ${accent}66)` }}>
        <UnifiedTower geom={TOWER_FINAL} floors={mini} showRooms={active} shellFilter={SHELL_FILTER} />
        {/* roof accent highlight (identity without recoloring rooms) */}
        <div className="pointer-events-none absolute" style={{ left: "22%", top: "10%", width: "52%", height: "8%", background: `radial-gradient(60% 100% at 50% 30%, ${accent}55 0%, transparent 75%)` }} />
      </div>
    </div>
  );
}

function WorkerSprite({ w, state, name }: { w: BrightWorker; state: string; name?: string }) {
  return (
    <div className="group absolute" style={{ left: `${w.seat.x}%`, bottom: `${100 - w.seat.y}%`, height: `${w.seat.s * 100}%`, zIndex: w.seat.z }}>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] blur-[2px]" style={{ width: w.seat.s * 62, height: 7, background: "rgba(20,32,52,0.22)" }} />
      <img src={brightAssetSrc(w, state)} alt={`${w.label} — ${state}`}
        className="pixelated relative h-full w-auto transition-opacity duration-500"
        style={w.seat.flip ? { transform: "scaleX(-1)" } : undefined} />
      <span className="pointer-events-none absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-white/90 px-1 text-[8px] font-bold text-[#17325C] opacity-0 shadow-sm transition group-hover:opacity-100">
        {name ?? w.label} · {state}
      </span>
    </div>
  );
}

// BrightCompanyOffice — the approved Bright Office visual as a reusable
// production component. `companyId` (route param) is the source of truth on
// /companies/[id]; the /bright-office preview omits it and selects internally.
export function BrightCompanyOffice({
  companyId: routeCompanyId, onNavigateCompany,
}: {
  companyId?: number;
  onNavigateCompany?: (id: number) => void;
}) {
  const router = useRouter();
  const pushToast = useUI((s) => s.pushToast);

  const [companies, setCompanies] = useState<CompanyOverview[]>([]);
  const [companiesLoaded, setCompaniesLoaded] = useState(false);
  const [internalCompanyId, setCompanyId] = useState<number | null>(null);
  const companyId = routeCompanyId ?? internalCompanyId;
  const selectCompany = (id: number) => (onNavigateCompany ? onNavigateCompany(id) : setCompanyId(id));
  const [company, setCompany] = useState<Company | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);

  // Living clock (2s resolution is enough for 8–30s phases). Starts at 0 so
  // SSR and first client render agree (workers show their `initial` scene
  // state), then the rotation begins after mount — no hydration mismatch.
  const [t, setT] = useState(0);
  useEffect(() => {
    setT(Math.floor(Date.now() / 1000));
    const id = setInterval(() => setT(Math.floor(Date.now() / 1000)), 2000);
    return () => clearInterval(id);
  }, []);
  const stateOf = (w: BrightWorker, seed: number) => (t === 0 ? w.initial : brightStateAt(w, seed, t));

  useEffect(() => {
    api.listCompanies().then((cs) => {
      setCompanies(cs); setCompaniesLoaded(true);
      if (routeCompanyId == null) setCompanyId((prev) => prev ?? cs[0]?.id ?? null); // preview only
    }).catch(() => pushToast("โหลดบริษัทไม่สำเร็จ", "error"));
  }, [routeCompanyId]);

  // A numeric route id that matches no company (e.g. /companies/999999) —
  // never fetch its details (avoids guaranteed-404 requests in the console).
  const companyNotFound = companiesLoaded && companyId != null && !companies.some((c) => c.id === companyId);

  useEffect(() => {
    if (!companyId || !companiesLoaded || companyNotFound) return;
    Promise.all([
      api.getCompany(companyId), api.listDepartments(companyId), api.listAgents(companyId), api.listModels(), api.listProjects(companyId),
    ]).then(([c, d, a, m, p]) => {
      setCompany(c); setDepartments(d); setAgents(a); setModels(m); setProjects(p);
      setSelectedDeptId(d[0]?.id ?? null);
    }).catch(() => pushToast("โหลดข้อมูลไม่สำเร็จ", "error"));
  }, [companyId, companiesLoaded, companyNotFound]);

  const selectedDept = useMemo(() => departments.find((d) => d.id === selectedDeptId) ?? null, [departments, selectedDeptId]);
  useEffect(() => {
    if (!selectedDept) { setRec(null); return; }
    let alive = true;
    api.recommendModel(selectedDept.type).then((r) => alive && setRec(r)).catch(() => setRec(null));
    return () => { alive = false; };
  }, [selectedDept?.type]);

  const modelById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const selectedProvider = selectedDept?.assigned_ai_model_id ? modelById.get(selectedDept.assigned_ai_model_id)?.provider : undefined;

  // ---- DYNAMIC TOWER (production): slots derive from REAL departments ----
  // The shell has six openings; floor_number 1–15 supported. >6 floors get
  // window navigation (building camera) via ▲▼ on the tab column.
  const WINDOW = 6;
  const maxFloor = useMemo(() => Math.max(WINDOW, ...departments.map((d) => d.floor_number), 0), [departments]);
  const [floorOffset, setFloorOffset] = useState(0);
  useEffect(() => { setFloorOffset(0); }, [companyId]);
  const clampedOffset = Math.min(floorOffset, Math.max(0, maxFloor - WINDOW));
  const topFloor = maxFloor - clampedOffset;
  const canNav = maxFloor > WINDOW;

  const slots = useMemo(() => Array.from({ length: WINDOW }, (_, i) => {
    const floorNo = topFloor - i;
    const dept = departments.find((d) => d.floor_number === floorNo) ?? null;
    const cfg = dept ? brightDeptFor(dept.type) ?? null : null;
    const deptAgents = dept ? agents.filter((a) => a.department_id === dept.id) : [];
    return { key: `floor-${floorNo}`, floorNo, dept, cfg, deptAgents };
  }), [departments, agents, topFloor]);

  // Real agents → distinct Bright identities (never cloned). Unknown dept
  // types / overflow roles fall back to the generic Bright worker.
  function placeRealAgents(slot: (typeof slots)[number]) {
    const used = new Set<string>();
    const placed: { worker: BrightWorker; agent: Agent; generic: boolean }[] = [];
    for (const a of slot.deptAgents) {
      if (placed.length >= 3) break; // opening capacity
      const w = slot.cfg
        ? slot.cfg.workers.find((x) => x.match?.(a.role) && !used.has(x.id)) ?? slot.cfg.workers.find((x) => !used.has(x.id))
        : undefined;
      if (w) used.add(w.id);
      placed.push({ worker: w ?? GENERIC_BRIGHT_WORKER, agent: a, generic: !w });
    }
    return placed;
  }

  // Real agent.status → Bright state asset (no broken images).
  function stateForAgent(w: BrightWorker, status: string, seed: number): { state: string; dim: boolean } {
    const s = (status || "").toLowerCase();
    const h = (seed * 2654435761) >>> 0;
    if (s === "offline") return { state: w.states.idle[0], dim: true };
    if (s === "reviewing" || s === "error" || s === "thinking" || s === "planning") return { state: w.states.review, dim: false };
    if (["working", "coding", "designing", "writing", "testing", "meeting", "analysing", "monitoring", "debugging"].includes(s))
      return { state: w.states.work[h % w.states.work.length], dim: false };
    // idle / unknown → living idle rotation
    return { state: t === 0 ? w.states.idle[0] : w.states.idle[Math.floor(t / 15 + h) % w.states.idle.length], dim: false };
  }

  async function chooseProvider(provider: string) {
    if (!selectedDept) return;
    const model = models.find((m) => m.provider === provider);
    if (!model) { pushToast("ยังไม่มีโมเดลของผู้ให้บริการนี้", "error"); return; }
    try {
      await api.updateDepartment(selectedDept.id, { assigned_ai_model_id: model.id });
      pushToast(`ตั้งโมเดล ${model.display_name}`, "success");
      const d = await api.listDepartments(companyId!); setDepartments(d);
    } catch { pushToast("ตั้งค่าไม่สำเร็จ", "error"); }
  }

  const seedOf = (deptKey: string, w: BrightWorker, i: number) => deptKey.length * 97 + w.prefix.length * 13 + i * 71 + (companyId ?? 1) * 7;

  if (companyNotFound) {
    return (
      <div className="grid min-h-[100dvh] place-items-center" style={{ background: PAGE_BG }}>
        <div className="rounded-xl bg-white/95 px-8 py-6 text-center shadow-lg">
          <div className="text-3xl">🏢</div>
          <div className="mt-2 text-lg font-bold text-[#17325C]">ไม่พบบริษัท</div>
          <div className="mt-1 text-sm text-[#526987]">ไม่มีบริษัทรหัส {companyId} ในระบบ</div>
          <button onClick={() => router.push("/")} className="mt-4 rounded-lg bg-[#2F66B3] px-4 py-2 text-sm font-bold text-white">กลับหน้ารวมบริษัท</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full overflow-auto" style={{ background: PAGE_BG }}>
      {/* tiny floating back button (reference has no global header) */}
      <button onClick={() => router.push("/")} title="Back to app"
        className="fixed left-2 top-2 z-50 grid h-8 w-8 place-items-center rounded-full bg-white/85 text-sm font-bold text-[#17325C] shadow-md transition hover:bg-white">←</button>

      <div className="mx-auto grid h-[100dvh] min-h-[820px] w-full max-w-[1920px] grid-cols-1 gap-2 p-2.5 lg:grid-cols-[24.3fr_32.3fr_41fr] lg:grid-rows-[81fr_17fr]">

        {/* ================= LEFT — brand + company overview ================= */}
        <aside className="relative flex min-h-0 flex-col overflow-hidden rounded-[10px] lg:row-span-1"
          style={{ background: "linear-gradient(180deg,#122B52,#16345E 60%,#1B4070)", boxShadow: "inset 0 0 0 2px #2C4E80" }}>
          {/* night-city atmosphere (subtle, behind the cards) */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0" style={{ background: "radial-gradient(70% 45% at 50% 108%, #2A5C9E44 0%, transparent 70%)" }} />
            {[[4, 26, 64], [13, 20, 46], [22, 14, 78], [58, 18, 58], [70, 24, 88], [84, 16, 52], [92, 12, 70]].map(([l, w, h], i) => (
              <div key={i} className="absolute bottom-0" style={{ left: `${l}%`, width: w, height: h, background: i % 2 ? "#12274A" : "#152C52" }}>
                {[0, 1, 2].map((j) => <span key={j} className="absolute h-[3px] w-[3px]" style={{ left: 3 + j * 5, top: 6 + j * 12, background: "#FFD98A", opacity: 0.55 }} />)}
              </div>
            ))}
            {[[12, 8], [30, 14], [55, 6], [78, 11], [90, 18]].map(([l, t], i) => (
              <span key={i} className="absolute h-[2px] w-[2px] rounded-full bg-white" style={{ left: `${l}%`, top: `${t}%`, opacity: 0.35 }} />
            ))}
          </div>
          <div className="relative flex items-center gap-3 px-4 pt-4">
            <div className="grid h-11 w-11 place-items-center rounded-lg text-xl" style={{ background: "linear-gradient(180deg,#3E70C9,#2B5091)", boxShadow: "inset 0 0 0 2px #6E96D6" }}>🤖</div>
            <div>
              <div className="font-pixel text-[19px] leading-tight text-white">AI AGENT OFFICE</div>
              <div className="text-[11px] text-[#AFC6E8]">Smart Work, Better Results</div>
            </div>
          </div>
          <div className="mx-4 mt-4 flex items-center gap-2 border-b border-[#2C4E80] pb-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-[#2E5EA8] text-sm">🏢</span>
            <div>
              <div className="text-[15px] font-bold text-white">หน้ารวมบริษัท</div>
              <div className="text-[11px] text-[#AFC6E8]">1 ตึก = 1 บริษัท</div>
            </div>
          </div>
          <div className="mx-4 mt-2 text-[11px] text-[#AFC6E8]">เลือกบริษัทที่ต้องการจัดการ</div>
          <div className="scroll-slim mx-4 mt-2 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto pb-3">
            {companies.map((c) => (
              <button key={c.id} onClick={() => selectCompany(c.id)}
                className="overflow-hidden rounded-[8px] text-left"
                style={{ background: "#10264A", boxShadow: c.id === companyId ? "0 0 0 2.5px #F5C25B, 0 0 16px #F5C25B88" : "inset 0 0 0 1.5px #2C4E80" }}>
                <div className="relative h-[118px]" style={{ background: c.id === companyId ? "linear-gradient(180deg,#27508B,#33619F)" : "linear-gradient(180deg,#1C3E6E,#274E85)" }}>
                  <MiniCompanyTower active={c.id === companyId} accent={accentOf(c.name, c.theme_color)} />
                </div>
                <div className="bg-white px-2 py-1.5">
                  <div className="truncate text-[12px] font-bold" style={{ color: NAVY }}>{c.name}</div>
                  <div className="truncate text-[9.5px] text-[#526987]">{c.description || "—"}</div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[9.5px] text-[#526987]">🏬 {c.department_count} แผนก</span>
                    <span className="rounded-[4px] px-2 py-0.5 text-[9.5px] font-bold text-white" style={{ background: c.id === companyId ? "#3E9E5F" : "#2F66B3" }}>{c.id === companyId ? "เปิดอยู่" : "เปิดดู"}</span>
                  </div>
                </div>
              </button>
            ))}
            {/* Add Company — balances the reference's 2×2 grid without fake data */}
            <button onClick={() => router.push("/")}
              className="flex min-h-[176px] flex-col items-center justify-center gap-1.5 rounded-[8px] text-center transition hover:bg-white/5"
              style={{ border: "2px dashed #3E6392", background: "#0F2448" }}>
              <span className="grid h-9 w-9 place-items-center rounded-full text-xl font-bold text-white" style={{ background: "#2E5EA8", boxShadow: "inset 0 0 0 2px #5E86C6" }}>+</span>
              <span className="text-[12px] font-bold text-white">Add Company</span>
              <span className="px-3 text-[9px] leading-[12px] text-[#8FA9CF]">สร้างบริษัทใหม่ · 1 ตึก = 1 บริษัท</span>
            </button>
          </div>
        </aside>

        {/* ================= CENTER — living bright tower ================= */}
        <section className="relative flex min-h-0 flex-col overflow-hidden rounded-[10px]"
          style={{ background: `linear-gradient(180deg, ${SKY} 0%, #2E6FC4 55%, #3B7ED2 100%)`, boxShadow: "inset 0 0 0 3px #17427F" }}>
          {/* sky depth: central glow, darker edges, distant city line */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 42%, #5D97DD33 0%, transparent 70%)" }} />
            <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, #17427F22 0%, transparent 12%, transparent 88%, #17427F22 100%)" }} />
            <div className="absolute inset-x-0 bottom-10 h-16 opacity-50">
              {[[2, 22, 34], [9, 16, 24], [16, 12, 42], [72, 18, 38], [80, 26, 28], [90, 14, 46]].map(([l, w, h], i) => (
                <div key={i} className="absolute bottom-0" style={{ left: `${l}%`, width: w, height: h, background: "#2B66AD" }} />
              ))}
            </div>
          </div>
          <div className="absolute left-8 top-12 h-4 w-16 rounded-full bg-white/50" />
          <div className="absolute right-10 top-24 h-3 w-12 rounded-full bg-white/40" />
          <div className="relative flex items-start justify-between px-3 pt-2.5">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-md font-pixel text-[13px] text-white" style={{ background: "#1A4CA7", boxShadow: "inset 0 0 0 2px #4E7FD0" }}>2</span>
              <div>
                <div className="font-pixel text-[14px] text-white">บริษัทที่เลือก: {company?.name ?? "…"}</div>
                <div className="text-[10.5px] text-[#CFE0F7]">คลิกชั้นเพื่อจัดการแผนก</div>
              </div>
            </div>
            <div className="rounded-md px-2 py-1 text-[10px] font-bold" style={{ background: "#F5C25B", color: NAVY, boxShadow: "inset 0 0 0 1.5px #B8862E" }}>สูงสุด 15 แผนก / 15 ชั้น</div>
          </div>

          {/* UNIFIED REFERENCE TOWER — one continuous building. The shell
              image carries transparent margins (visible building = x 18.7–77%,
              y 13.1–86% of the image), so the box is scaled to 126% and
              recentered on the VISIBLE alpha bounds — the building itself
              fills ~92% of the stage height / ~82% width. Floor tabs overlay
              the building's left edge (reference-style). */}
          <div className="relative mx-auto mt-1 min-h-0 w-full flex-1 pb-10">
            <div className="relative h-full">
              <div className="absolute left-1/2 top-1/2" style={{ aspectRatio: "1307 / 1536", height: "126%", transform: "translate(-48%, -50%)" }}>
                {/* floor navigation (7–15 departments: building camera) */}
                {canNav ? (
                  <>
                    <button onClick={() => setFloorOffset(Math.max(0, clampedOffset - 1))} disabled={clampedOffset === 0}
                      className="absolute z-40 grid h-6 w-[15%] place-items-center rounded-[6px] text-[11px] font-bold text-white transition hover:brightness-125 disabled:opacity-30"
                      style={{ left: "12.2%", top: `${TOWER_FINAL.topY - 3.2}%`, background: "#22375C", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.25)" }}>▲ ชั้น {topFloor + 1 <= maxFloor ? topFloor + 1 : "-"}</button>
                    <button onClick={() => setFloorOffset(Math.min(maxFloor - WINDOW, clampedOffset + 1))} disabled={clampedOffset >= maxFloor - WINDOW}
                      className="absolute z-40 grid h-6 w-[15%] place-items-center rounded-[6px] text-[11px] font-bold text-white transition hover:brightness-125 disabled:opacity-30"
                      style={{ left: "12.2%", top: "72.8%", background: "#22375C", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.25)" }}>▼ ชั้น {topFloor - WINDOW >= 1 ? topFloor - WINDOW : "-"}</button>
                  </>
                ) : null}
                {/* floor tabs — REAL departments; empty floors get neutral tabs */}
                {slots.map((s, i) => (
                  <button key={s.key} onClick={() => s.dept && setSelectedDeptId(s.dept.id)}
                    className="absolute z-30 w-[15%] rounded-[6px] px-1.5 py-0.5 text-left transition hover:brightness-110"
                    style={{ left: "12.2%", top: `${TOWER_FINAL.topY + i * TOWER_FINAL.pitch + 0.9}%`, background: s.dept ? (s.dept.theme_color || s.cfg?.color || "#3E70C9") : "#44557A", opacity: s.floorNo < 1 ? 0 : 1, pointerEvents: s.floorNo < 1 ? "none" : undefined, boxShadow: s.dept && selectedDeptId === s.dept.id ? "inset 0 0 0 2px #fff, 0 0 10px rgba(255,255,255,.5)" : "inset 0 0 0 2px rgba(255,255,255,.35)" }}>
                    <div className="flex items-center gap-1">
                      <span className="grid h-[15px] w-[15px] shrink-0 place-items-center rounded bg-white/30 font-pixel text-[9px] text-white">{s.floorNo}</span>
                      <span className="truncate text-[7.5px] font-bold leading-none text-white">{s.cfg?.label ?? s.dept?.type?.toUpperCase() ?? "FLOOR"}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[6.5px] leading-none text-white/85">{s.dept?.name ?? "ว่าง — เพิ่มแผนกได้"}</div>
                  </button>
                ))}
                <button onClick={() => router.push("/vps")}
                  className="absolute z-30 w-[15%] rounded-[6px] px-1.5 py-0.5 text-left transition hover:brightness-110"
                  style={{ left: "12.2%", top: "76.5%", background: "#22375C", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.25)" }}>
                  <div className="flex items-center gap-1"><span className="font-pixel text-[9px] text-white">B1</span><span className="text-[7.5px] font-bold text-white">VPS / SERVER</span></div>
                  <div className="mt-0.5 text-[6.5px] leading-none text-white/80">โครงสร้างพื้นฐาน</div>
                </button>
                <UnifiedTower geom={TOWER_FINAL} shellFilter={SHELL_FILTER}
                  floors={slots.map((s) => ({
                    key: s.key, src: s.cfg?.floor, focal: s.cfg?.focal,
                    color: s.dept?.theme_color || s.cfg?.color,
                    selected: !!s.dept && selectedDeptId === s.dept.id,
                    onClick: s.dept ? () => setSelectedDeptId(s.dept!.id) : undefined,
                  }))}
                  workersFor={(key) => {
                    const s = slots.find((x) => x.key === key);
                    if (!s) return [];
                    return placeRealAgents(s).map(({ worker, agent, generic }, i) => {
                      const st = stateForAgent(worker, agent.status, agent.id);
                      const seatX = generic ? 28 + i * 20 : worker.seat.x;
                      return {
                        src: brightAssetSrc(worker, st.state),
                        left: TOWER_FINAL.xL + (seatX / 100) * (TOWER_FINAL.xR - TOWER_FINAL.xL),
                        hMul: Math.min(0.8, worker.seat.s * 1.32) * (st.dim ? 0.98 : 1),
                        title: `${agent.name} · ${st.dim ? "offline" : st.state}`,
                      };
                    });
                  }} />
                {/* B1 → VPS (invisible hotspot over the shell's basement) */}
                <button onClick={() => router.push("/vps")} title="B1 · VPS Server Room"
                  className="absolute z-30 cursor-pointer rounded transition hover:bg-white/10"
                  style={{ left: "20%", top: "74.5%", width: "55%", height: "12%" }} />
              </div>
            </div>
          </div>

          {/* project chips */}
          <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 overflow-hidden rounded-[8px] px-2 py-1.5" style={{ background: "#17427FCC" }}>
            <span className="text-sm">⭐</span>
            <span className="whitespace-nowrap text-[10px] text-white">แต่ละบริษัทมีหลายโปรเจกต์</span>
            {projects.slice(0, 3).map((p) => (
              <button key={p.id} onClick={() => router.push(`/projects/${p.id}`)} className="whitespace-nowrap rounded-[5px] bg-[#0F2C55] px-2 py-1 text-[10px] font-bold text-white transition hover:brightness-125" style={{ boxShadow: "inset 0 0 0 1px #3E6392" }}>{p.name}</button>
            ))}
          </div>
        </section>

        {/* ================= RIGHT — management panels ================= */}
        <section className="scroll-slim flex min-h-0 flex-col overflow-y-auto rounded-[10px] p-2" style={{ background: "linear-gradient(180deg,#5369A2,#4A5F97)", boxShadow: "inset 0 0 0 2px #6C81B5" }}>
          {/* 3 Department Management */}
          <div className="rounded-[8px] p-2.5" style={{ background: PANEL }}>
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md font-pixel text-[12px] text-white" style={{ background: "#3E9E5F" }}>3</span>
              <div>
                <div className="text-[14px] font-bold" style={{ color: NAVY }}>Department Management</div>
                <div className="text-[10px] text-[#526987]">เลือกแผนกเพื่อดูรายละเอียด</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {[...departments].sort((a, b) => a.floor_number - b.floor_number).map((d) => (
                <button key={d.id} onClick={() => setSelectedDeptId(d.id)}
                  className="flex items-center gap-1.5 rounded-[6px] px-1.5 py-1 text-left"
                  style={{ background: "#F7FAFE", boxShadow: selectedDeptId === d.id ? `inset 0 0 0 2px ${d.theme_color || "#2F66B3"}` : `inset 0 0 0 1px ${LINE}` }}>
                  <span className="grid h-4 w-5 shrink-0 place-items-center rounded font-pixel text-[8px] text-white" style={{ background: d.theme_color || "#2F66B3" }}>{d.floor_number}</span>
                  <span className="truncate text-[11px] font-semibold" style={{ color: NAVY }}>{d.name}</span>
                </button>
              ))}
              {departments.length === 0 ? <div className="col-span-2 text-[11px] text-[#8896B3]">ยังไม่มีแผนก</div> : null}
            </div>
          </div>

          {/* 4 Job Description | 5 AI Model */}
          <div className="mt-2 flex gap-2">
            <div className="w-[44%] rounded-[8px] p-2.5" style={{ background: PANEL }}>
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-md font-pixel text-[12px] text-white" style={{ background: "#7B5BD6" }}>4</span>
                <div>
                  <div className="text-[13px] font-bold" style={{ color: NAVY }}>Job Description</div>
                  <div className="truncate text-[9.5px] text-[#526987]">{selectedDept ? `${selectedDept.name} · ชั้น ${selectedDept.floor_number}` : "เลือกชั้น"}</div>
                </div>
              </div>
              {selectedDept ? (
                <div className="mt-1.5 rounded-[6px] p-1.5" style={{ background: "#F7FAFE", boxShadow: `inset 0 0 0 1px ${LINE}` }}>
                  <p className="line-clamp-2 text-[10px] text-[#3D5578]">{selectedDept.job_description || "ยังไม่มีคำอธิบายงาน"}</p>
                  <ul className="mt-1 space-y-px">
                    {selectedDept.responsibilities.slice(0, 4).map((r) => <li key={r} className="truncate text-[9.5px] text-[#3D5578]">• {r}</li>)}
                  </ul>
                </div>
              ) : <div className="mt-2 text-[10px] text-[#8896B3]">คลิกชั้นในตึก</div>}
            </div>
            <div className="min-w-0 flex-1 rounded-[8px] p-2.5" style={{ background: PANEL }}>
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-md font-pixel text-[12px] text-white" style={{ background: "#2F9BB0" }}>5</span>
                <div>
                  <div className="text-[13px] font-bold" style={{ color: NAVY }}>AI Model Selection</div>
                  <div className="text-[9.5px] text-[#526987]">เลือกโมเดล AI ที่ใช้ในแผนก</div>
                </div>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {PROVIDERS.map((p) => {
                  const has = models.some((m) => m.provider === p.key);
                  const on = selectedProvider === p.key;
                  const recd = rec?.recommended_providers.includes(p.key);
                  return (
                    <button key={p.key} disabled={!has || !selectedDept} onClick={() => chooseProvider(p.key)}
                      className="flex items-center gap-1.5 rounded-[6px] px-1.5 py-1 text-left disabled:opacity-40"
                      style={{ background: "#F7FAFE", boxShadow: on ? "inset 0 0 0 2px #2F66B3" : `inset 0 0 0 1px ${LINE}` }}>
                      <span className="text-sm">{p.icon}</span>
                      <span className="min-w-0 flex-1 truncate text-[9.5px] font-bold" style={{ color: NAVY }}>{p.label}</span>
                      {recd ? <span className="text-[9px]">💡</span> : null}
                      <span className="grid h-3 w-3 shrink-0 place-items-center rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${on ? "#2F66B3" : LINE}` }}>{on ? <span className="h-1.5 w-1.5 rounded-full bg-[#2F66B3]" /> : null}</span>
                    </button>
                  );
                })}
                {rec ? (
                  <div className="rounded-[6px] px-1.5 py-1 text-[8.5px] leading-[11px] text-[#3D5578]" style={{ background: "#FDF6E3", boxShadow: "inset 0 0 0 1px #E8D9A8" }}>
                    <b>🤖 AI Recommendation</b> {rec.reason}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* 6 Projects — grows to absorb vertical space, taller cards */}
          <div className="mt-2 flex min-h-0 flex-1 flex-col rounded-[8px] p-2.5" style={{ background: PANEL }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-md font-pixel text-[12px] text-white" style={{ background: "#D98A3D" }}>6</span>
                <div>
                  <div className="text-[14px] font-bold" style={{ color: NAVY }}>Projects</div>
                  <div className="text-[10px] text-[#526987]">เปิดดูโปรเจกต์ของบริษัท</div>
                </div>
              </div>
              <span className="rounded-[6px] px-2.5 py-1 text-[10px] font-bold text-white" style={{ background: "#2F66B3" }}>{projects.length} โปรเจกต์</span>
            </div>
            <div className="mt-2 grid flex-1 auto-rows-min grid-cols-3 gap-2">
              {projects.slice(0, 6).map((p) => (
                <button key={p.id} onClick={() => router.push(`/projects/${p.id}`)} className="flex flex-col justify-between rounded-[6px] p-2 text-left transition hover:brightness-[0.98]" style={{ background: "#F7FAFE", boxShadow: `inset 0 0 0 1px ${LINE}` }}>
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[10.5px] font-bold" style={{ color: NAVY }}>{p.name}</span>
                      <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[7.5px] font-bold text-white" style={{ background: STATUS_COLOR[p.status] ?? "#8896B3" }}>{p.status.replace("_", " ")}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[9px] text-[#526987]">{p.type}</div>
                  </div>
                  <div className="mt-1.5 text-[8.5px] font-bold text-[#2F66B3]">เปิดดู ↗</div>
                </button>
              ))}
              {projects.length === 0 ? <div className="col-span-3 text-[10px] text-[#8896B3]">ยังไม่มีโปรเจกต์</div> : null}
            </div>
          </div>

          {/* 7 VPS Workspace — richer pipeline, still compact */}
          <div className="mt-2 rounded-[8px] p-2.5" style={{ background: PANEL }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-md font-pixel text-[12px] text-white" style={{ background: "#2F66B3" }}>7</span>
                <div>
                  <div className="text-[14px] font-bold" style={{ color: NAVY }}>VPS Workspace</div>
                  <div className="text-[10px] text-[#526987]">รันงานทั้งหมดบน VPS (mock/demo)</div>
                </div>
              </div>
              <button onClick={() => router.push("/vps")} className="rounded-[6px] px-2.5 py-1 text-[10px] font-bold text-white" style={{ background: "#2F66B3" }}>เปิด</button>
            </div>
            <div className="mt-2 flex items-stretch gap-2">
              <div className="flex flex-1 items-center justify-between rounded-[7px] px-3 py-2.5" style={{ background: "#F7FAFE", boxShadow: `inset 0 0 0 1px ${LINE}` }}>
                {[["🖥️", "Web Platform", "เชื่อมต่อแล้ว"], ["→", "", ""], ["☁️", "VPS Cloud", "Secure · Fast"], ["→", "", ""], ["🗄️", "Compute Nodes", "4 nodes"], ["→", "", ""], ["💾", "Storage", "SSD"]].map(([i, tt, sub], k) => (
                  <div key={k} className="flex flex-col items-center text-[9.5px] font-bold" style={{ color: NAVY }}>
                    {tt ? (
                      <>
                        <span className="text-xl">{i}</span><span>{tt}</span>
                        <span className="text-[7.5px] font-normal text-[#526987]">{sub}</span>
                      </>
                    ) : <span className="text-base text-[#2F66B3]">{i}</span>}
                  </div>
                ))}
              </div>
              <div className="flex w-[132px] shrink-0 flex-col justify-center gap-1 rounded-[7px] px-2 py-1.5 text-[8.5px]" style={{ background: "#F7FAFE", boxShadow: `inset 0 0 0 1px ${LINE}` }}>
                <span className="flex items-center gap-1 font-bold text-[#3E9E5F]"><span className="h-1.5 w-1.5 rounded-full bg-[#3E9E5F]" /> Online · 24/7</span>
                <span className="text-[#3D5578]">✅ แยกสภาพแวดล้อมต่อโปรเจกต์</span>
                <span className="text-[#3D5578]">✅ ปรับขนาดตามการใช้งาน</span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= BOTTOM — continuous office storyboard =================
            One long strip: nearly edge-to-edge scenes, hairline separators,
            shared container — reads as a single office story, not cards. */}
        <footer className="flex min-h-[130px] overflow-hidden rounded-[10px] p-1 lg:col-span-3"
          style={{ background: "linear-gradient(180deg,#122B52,#16345E)", boxShadow: "inset 0 0 0 2px #2C4E80" }}>
          <div className="flex w-[112px] shrink-0 flex-col justify-center px-2">
            <div className="flex items-center gap-1.5"><span className="grid h-5 w-5 place-items-center rounded bg-[#2E5EA8] font-pixel text-[10px] text-white">8</span>
              <span className="text-[13px] font-bold text-white">AI Workers</span></div>
            <div className="mt-1 text-[8.5px] leading-[12px] text-[#AFC6E8]">พนักงาน AI มีชีวิต ทำงานตามแผนกและพักผ่อนเมื่อว่าง</div>
          </div>
          <div className="flex min-w-0 flex-1 gap-[2px] overflow-hidden rounded-[7px]">
            {[...BRIGHT_DEPTS].sort((a, b) => a.floorNumber - b.floorNumber).map((cfg) => {
              // Engineering shows its whole trio; other departments one worker.
              const crew = cfg.key === "engineering" ? cfg.workers : cfg.workers.slice(0, 1);
              const positions = crew.length === 3 ? ["16%", "42%", "68%"] : ["38%"];
              const first = crew[0];
              const headline = first ? stateOf(first, seedOf(cfg.key, first, 9)) : null;
              return (
                <div key={cfg.key} className="relative min-w-0 flex-1 overflow-hidden">
                  <img src={cfg.floor} alt={cfg.label} className="pixelated absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 68%" }} />
                  {crew.map((w, i) => {
                    const st = stateOf(w, seedOf(cfg.key, w, 9 + i));
                    return (
                      <div key={w.id} className="absolute" style={{ left: positions[i], bottom: "4%", height: crew.length === 3 ? "56%" : "62%", zIndex: 2 }}>
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] blur-[2px]" style={{ width: "56%", height: 4, background: "rgba(20,32,52,0.25)" }} />
                        <img src={brightAssetSrc(w, st)} alt={w.label} className="pixelated relative h-full w-auto" />
                      </div>
                    );
                  })}
                  <span className="absolute left-1 top-1 rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#17325CCC" }}>{cfg.label}</span>
                  {headline ? (
                    <span className="absolute right-1 top-1 rounded-full rounded-bl-none bg-white/95 px-1.5 py-0.5 text-[8px] font-bold shadow-sm" style={{ color: NAVY }}>💬 {headline}</span>
                  ) : null}
                </div>
              );
            })}
            {/* Idle Time — a REAL rest scene: the Art & Design lounge (sofa +
                mood boards) as the room, with the Engineering trio taking a
                break TOGETHER around the sofa — not a sprite lineup. */}
            <div className="relative w-[236px] shrink-0 overflow-hidden">
              <img src="/assets/themes/reference-bright/floors/art-design-floor.webp" alt="lounge"
                className="pixelated absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "88% 72%" }} />
              <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,244,214,0.18) 0%, transparent 45%)" }} />
              {/* trio clustered around the sofa: reader settled by the couch,
                  coffee + relax facing each other over the table */}
              <div className="absolute" style={{ left: "10%", bottom: "5%", height: "60%", zIndex: 3 }}>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] blur-[2px]" style={{ width: "58%", height: 4, background: "rgba(70,45,20,0.35)" }} />
                <img src="/assets/themes/reference-bright/characters/engineering/frontend-developer-coffee.webp" alt="coffee" className="pixelated relative h-full w-auto" />
              </div>
              <div className="absolute" style={{ left: "34%", bottom: "9%", height: "56%", zIndex: 2 }}>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] blur-[2px]" style={{ width: "58%", height: 4, background: "rgba(70,45,20,0.3)" }} />
                <img src="/assets/themes/reference-bright/characters/engineering/system-analyst-relaxing.webp" alt="relaxing" className="pixelated relative h-full w-auto" style={{ transform: "scaleX(-1)" }} />
              </div>
              <div className="absolute" style={{ left: "58%", bottom: "4%", height: "61%", zIndex: 3 }}>
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] blur-[2px]" style={{ width: "58%", height: 4, background: "rgba(70,45,20,0.35)" }} />
                <img src="/assets/themes/reference-bright/characters/engineering/backend-developer-reading.webp" alt="reading" className="pixelated relative h-full w-auto" style={{ transform: "scaleX(-1)" }} />
              </div>
              {/* small reference-style bubbles above each activity */}
              <span className="absolute rounded-full rounded-bl-none bg-white/95 px-1.5 py-0.5 text-[8px] font-bold shadow-sm" style={{ left: "8%", top: "18%", color: NAVY }}>☕ coffee</span>
              <span className="absolute rounded-full rounded-bl-none bg-white/95 px-1.5 py-0.5 text-[8px] font-bold shadow-sm" style={{ left: "36%", top: "8%", color: NAVY }}>😌 relaxing</span>
              <span className="absolute rounded-full rounded-br-none bg-white/95 px-1.5 py-0.5 text-[8px] font-bold shadow-sm" style={{ right: "4%", top: "18%", color: NAVY }}>📖 reading</span>
              <span className="absolute left-1 top-1 rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#17325CCC" }}>☕ Idle Time</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
