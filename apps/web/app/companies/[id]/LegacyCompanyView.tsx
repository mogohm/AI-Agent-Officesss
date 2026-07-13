"use client";
// Company Building — immersive production shell (100dvh): left company overview,
// center continuous living building, right dense management panels, bottom worker
// strip. Business logic/CRUD unchanged; only the visual shell was reconstructed.
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useUI } from "@/lib/store";
import type { Agent, AIModel, Company, CompanyOverview, Department, Project, Recommendation } from "@/lib/types";
import { MAX_DEPARTMENTS, PROJECT_TYPES } from "@/lib/constants";
import { LivingCompanyBuilding } from "@/components/production/LivingCompanyBuilding";
import { WorkerActivityStrip } from "@/components/scene/WorkerActivityStrip";
import { BuildingThumbnail } from "@/components/production/BuildingThumbnail";
import { SectionCard } from "@/components/SectionCard";
import { DepartmentPanel } from "@/components/DepartmentPanel";
import { Badge, Button, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/ui";

const PROJECT_STATUS_COLOR: Record<string, string> = {
  in_progress: "#5BE49B", planning: "#FFD166", completed: "#5B8CFF", paused: "#9AA7C7",
  draft: "#61708F", reviewing: "#A98BFF", testing: "#FF9F6B", failed: "#FF6B7A", archived: "#61708F",
};
const PROVIDERS: { key: string; label: string; icon: string; color: string }[] = [
  { key: "openai", label: "GPT (OpenAI)", icon: "🤖", color: "#5BE49B" },
  { key: "anthropic", label: "Claude (Anthropic)", icon: "🧠", color: "#FF9F6B" },
  { key: "google", label: "Gemini (Google)", icon: "✨", color: "#5B8CFF" },
  { key: "local", label: "Local LLM", icon: "🖥️", color: "#9AA7C7" },
  { key: "image", label: "Image AI", icon: "🎨", color: "#FF7AC6" },
];

function CompanyCard({ c, active, onClick }: { c: CompanyOverview; active: boolean; onClick: () => void }) {
  const color = c.theme_color || "#5B8CFF";
  return (
    <button onClick={onClick}
      className={`overflow-hidden rounded-xl border bg-elevated text-left shadow-card transition ${active ? "border-2 border-neon" : "border-line hover:border-neon/60"}`}>
      <div className="skyline relative h-[108px]" style={{ background: `linear-gradient(180deg, #cfe2fb, ${color}14)` }}>
        <BuildingThumbnail color={color} floors={Math.max(3, c.department_count)} seed={c.id} />
      </div>
      <div className="p-2">
        <div className="truncate text-xs font-bold text-ink">{c.emoji} {c.name}</div>
        <div className="mt-0.5 line-clamp-1 text-[10px] text-muted">{c.description || "—"}</div>
        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted">
          <span>🏬 {c.department_count}</span><span>📁 {c.project_count}</span>
          <span className={`ml-auto rounded px-1 ${active ? "bg-neon/20 text-neon" : "text-faint"}`}>{active ? "open" : "เปิด"}</span>
        </div>
      </div>
    </button>
  );
}

export function LegacyCompanyView() {
  const params = useParams<{ id: string }>();
  const companyId = Number(params.id);
  const router = useRouter();
  const pushToast = useUI((s) => s.pushToast);

  const [companies, setCompanies] = useState<CompanyOverview[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [deptOpen, setDeptOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [projOpen, setProjOpen] = useState(false);
  const [projForm, setProjForm] = useState<Partial<Project>>({ name: "", description: "", type: "Web Application", priority: "medium" });

  async function load() {
    setLoading(true);
    try {
      const [c, d, a, m, p] = await Promise.all([
        api.getCompany(companyId), api.listDepartments(companyId),
        api.listAgents(companyId), api.listModels(), api.listProjects(companyId),
      ]);
      setCompany(c); setDepartments(d); setAgents(a); setModels(m); setProjects(p);
      setSelectedDeptId((prev) => prev ?? d[0]?.id ?? null);
    } catch (e) { pushToast(e instanceof ApiError ? e.message : "โหลดข้อมูลบริษัทไม่สำเร็จ", "error"); }
    finally { setLoading(false); }
  }
  useEffect(() => { api.listCompanies().then(setCompanies).catch(() => {}); }, []);
  useEffect(() => { if (companyId) load(); /* eslint-disable-next-line */ }, [companyId]);

  const selectedDept = useMemo(() => departments.find((d) => d.id === selectedDeptId) ?? null, [departments, selectedDeptId]);
  useEffect(() => {
    if (!selectedDept) { setRec(null); return; }
    let alive = true;
    api.recommendModel(selectedDept.type).then((r) => alive && setRec(r)).catch(() => setRec(null));
    return () => { alive = false; };
  }, [selectedDept?.type]);

  const usedFloors = useMemo(() => departments.map((d) => d.floor_number), [departments]);
  const modelById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);

  function openCreateDept() {
    if (departments.length >= MAX_DEPARTMENTS) { pushToast(`สูงสุด ${MAX_DEPARTMENTS} แผนก / ${MAX_DEPARTMENTS} ชั้น`, "error"); return; }
    setEditingDept(null); setDeptOpen(true);
  }
  function openEditDept(d: Department) { setEditingDept(d); setDeptOpen(true); }
  async function deleteDept(d: Department) {
    let warn = "";
    try { const u = await api.departmentUsage(d.id); if (u.agents || u.projects) warn = ` (มี ${u.agents} agent, ${u.projects} โปรเจกต์)`; } catch { /* ignore */ }
    if (!confirm(`ลบแผนก "${d.name}" ชั้น ${d.floor_number}?${warn}`)) return;
    await api.deleteDepartment(d.id); pushToast("ลบแผนกแล้ว", "success");
    if (selectedDeptId === d.id) setSelectedDeptId(null); load();
  }
  async function chooseProvider(provider: string) {
    if (!selectedDept) return;
    const model = models.find((m) => m.provider === provider);
    if (!model) { pushToast("ยังไม่มีโมเดลของผู้ให้บริการนี้", "error"); return; }
    try { await api.updateDepartment(selectedDept.id, { assigned_ai_model_id: model.id }); pushToast(`ตั้งโมเดล ${model.display_name}`, "success"); load(); }
    catch (e) { pushToast(e instanceof ApiError ? e.message : "ตั้งค่าไม่สำเร็จ", "error"); }
  }
  async function createProject() {
    if (!projForm.name?.trim()) { pushToast("ต้องใส่ชื่อโปรเจกต์", "error"); return; }
    try { await api.createProject(companyId, projForm); pushToast("สร้างโปรเจกต์แล้ว", "success"); setProjOpen(false); setProjForm({ name: "", description: "", type: "Web Application", priority: "medium" }); load(); }
    catch (e) { pushToast(e instanceof ApiError ? e.message : "สร้างไม่สำเร็จ", "error"); }
  }

  if (loading && !company) return <div className="m-2 h-[90%] animate-pulse rounded-xl2 border border-line bg-card" />;
  if (!company) return <div className="p-6"><EmptyState icon="🏢" title="ไม่พบบริษัท" /></div>;

  const selectedModelProvider = selectedDept?.assigned_ai_model_id ? modelById.get(selectedDept.assigned_ai_model_id)?.provider : undefined;
  const sortedDepts = [...departments].sort((a, b) => a.floor_number - b.floor_number);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 p-2">
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 xl:grid-cols-[24fr_38fr_38fr]">

        {/* LEFT — company overview */}
        <aside className="scroll-slim hidden min-h-0 flex-col overflow-y-auto rounded-xl2 border border-line bg-elevated/60 p-3 xl:flex">
          <div className="mb-2 flex items-center gap-2">
            <Button variant="secondary" className="!px-2 !py-1" onClick={() => router.push("/")}><ArrowLeft size={14} /></Button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="grid h-5 w-5 place-items-center rounded bg-neon/20 font-pixel text-[9px] text-neon">1</span>
                <h2 className="font-display text-[12px] neon-text" style={{ color: "#2F66B3" }}>หน้ารวมบริษัท</h2>
              </div>
              <p className="text-[10px] text-muted">1 ตึก = 1 บริษัท</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {companies.map((c) => <CompanyCard key={c.id} c={c} active={c.id === companyId} onClick={() => router.push(`/companies/${c.id}`)} />)}
          </div>
        </aside>

        {/* CENTER — building */}
        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded bg-neon/20 font-pixel text-[10px] text-neon">2</span>
              <div>
                <h1 className="font-display text-[13px] neon-text" style={{ color: "#2F66B3" }}>บริษัทที่เลือก: {company.name}</h1>
                <p className="text-[10px] text-muted">คลิกชั้นเพื่อจัดการแผนก</p>
              </div>
            </div>
            <Badge color="#FFD166">🏢 สูงสุด 15 แผนก / 15 ชั้น</Badge>
          </div>

          <div className="min-h-0 flex-1">
            <LivingCompanyBuilding companyName={company.name} emoji={company.emoji}
              departments={departments} agents={agents} models={models}
              selectedDeptId={selectedDeptId} onOpenFloor={(d) => setSelectedDeptId(d.id)}
              onOpenVPS={() => router.push("/vps")} />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 px-1">
            <span className="text-[11px] text-muted">⭐ โปรเจกต์:</span>
            {projects.slice(0, 4).map((p) => (
              <button key={p.id} onClick={() => router.push(`/projects/${p.id}`)}
                className="rounded-lg border border-line bg-surfaceAlt px-2.5 py-1 text-[11px] font-semibold text-ink hover:border-neon">{p.name}</button>
            ))}
            <Button variant="secondary" onClick={() => setProjOpen(true)} className="!py-1 !px-2 text-[11px]"><Plus size={12} /> เพิ่ม</Button>
          </div>
        </div>

        {/* RIGHT — management panels (dense) */}
        <div className="scroll-slim min-h-0 space-y-2 overflow-y-auto pr-0.5">
          <SectionCard n={3} title="Department Management" subtitle="เพิ่ม / แก้ไข / ลบ" accent="#5BE49B"
            action={<Button onClick={openCreateDept} className="!py-1 !px-2 text-[11px]"><Plus size={13} /> เพิ่ม</Button>}>
            <div className="grid grid-cols-2 gap-1.5">
              {sortedDepts.map((d) => (
                <div key={d.id} className={`flex items-center gap-1.5 rounded-lg border px-1.5 py-1 ${selectedDeptId === d.id ? "border-neon bg-neon/10" : "border-line"}`}>
                  <button onClick={() => setSelectedDeptId(d.id)} className="flex min-w-0 flex-1 items-center gap-1.5 text-left">
                    <span className="grid h-4 w-5 shrink-0 place-items-center rounded font-pixel text-[8px] text-white" style={{ background: d.theme_color }}>{d.floor_number}</span>
                    <span className="truncate text-[11px] font-semibold text-ink">{d.name}</span>
                  </button>
                  <button onClick={() => openEditDept(d)} className="text-muted hover:text-neon"><Pencil size={12} /></button>
                  <button onClick={() => deleteDept(d)} className="text-muted hover:text-[#FF6B7A]"><Trash2 size={12} /></button>
                </div>
              ))}
              {departments.length === 0 ? <div className="col-span-2 text-[11px] text-faint">ยังไม่มีแผนก</div> : null}
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <SectionCard n={4} title="Job Description" subtitle={selectedDept ? `${selectedDept.name} · ชั้น ${selectedDept.floor_number}` : "เลือกชั้น"} accent="#A98BFF"
              action={selectedDept ? <Button variant="secondary" className="!py-1 !px-2 text-[11px]" onClick={() => openEditDept(selectedDept)}>แก้ไข</Button> : undefined}>
              {selectedDept ? (
                <>
                  <p className="line-clamp-2 text-[11px] text-muted">{selectedDept.job_description || "ยังไม่มีคำอธิบายงาน"}</p>
                  {selectedDept.responsibilities.length ? (
                    <ul className="mt-1.5 space-y-0.5">{selectedDept.responsibilities.slice(0, 3).map((r) => <li key={r} className="truncate text-[11px] text-ink">▸ <span className="text-muted">{r}</span></li>)}</ul>
                  ) : null}
                </>
              ) : <div className="text-[11px] text-faint">คลิกชั้นในตึก</div>}
            </SectionCard>

            <SectionCard n={5} title="AI Model" subtitle={selectedDept ? "เลือกโมเดล" : "เลือกชั้น"} accent="#3BE8E0">
              {selectedDept ? (
                <>
                  <div className="grid grid-cols-1 gap-1">
                    {PROVIDERS.map((p) => {
                      const has = models.some((m) => m.provider === p.key);
                      const activeM = selectedModelProvider === p.key;
                      const recommended = rec?.recommended_providers.includes(p.key);
                      return (
                        <button key={p.key} disabled={!has} onClick={() => chooseProvider(p.key)}
                          className={`flex items-center gap-1.5 rounded-lg border p-1 text-left transition disabled:opacity-40 ${activeM ? "border-2" : "border-line hover:bg-surface"}`}
                          style={activeM ? { borderColor: p.color, background: `${p.color}14` } : undefined}>
                          <span className="text-sm">{p.icon}</span>
                          <span className="truncate text-[10px] font-bold text-ink">{p.label}</span>
                          {recommended ? <span className="ml-auto text-[8px] font-semibold text-cyan">💡</span> : null}
                          <span className="ml-auto grid h-3 w-3 shrink-0 place-items-center rounded-full border" style={{ borderColor: activeM ? p.color : "#26365C" }}>{activeM ? <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} /> : null}</span>
                        </button>
                      );
                    })}
                  </div>
                  {rec ? <div className="mt-1.5 rounded-lg border border-line bg-surface p-1.5 text-[10px] text-muted"><span className="font-semibold text-cyan">💡</span> {rec.reason}</div> : null}
                </>
              ) : <div className="text-[11px] text-faint">เลือกชั้น</div>}
            </SectionCard>
          </div>

          <SectionCard n={6} title="Projects" subtitle="สร้าง / เปิดโปรเจกต์" accent="#FFD166"
            action={<Button onClick={() => setProjOpen(true)} className="!py-1 !px-2 text-[11px]"><Plus size={13} /> สร้าง</Button>}>
            <div className="grid grid-cols-2 gap-1.5">
              {projects.length === 0 ? <div className="col-span-2 text-[11px] text-faint">ยังไม่มีโปรเจกต์</div> : projects.map((p) => (
                <button key={p.id} onClick={() => router.push(`/projects/${p.id}`)} className="flex items-center gap-1.5 rounded-lg border border-line px-1.5 py-1 text-left hover:border-neon">
                  <div className="min-w-0 flex-1"><div className="truncate text-[11px] font-bold text-ink">{p.name}</div><div className="truncate text-[9px] text-muted">{p.type}</div></div>
                  <Badge color={PROJECT_STATUS_COLOR[p.status]}>{p.status.replace("_", " ")}</Badge>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard n={7} title="VPS Workspace" subtitle="รันงานบน VPS (mock)" accent="#5B8CFF"
            action={<Button variant="secondary" className="!py-1 !px-2 text-[11px]" onClick={() => router.push("/vps")}>เปิด</Button>}>
            <div className="flex items-center justify-between gap-1 rounded-lg border border-line bg-surface p-1.5 text-center text-[9px] text-muted">
              <div className="flex flex-col items-center"><span className="text-base">🖥️</span>Web</div><span className="text-neon">→</span>
              <div className="flex flex-col items-center"><span className="text-base">☁️</span>VPS</div><span className="text-neon">→</span>
              <div className="flex flex-col items-center"><span className="text-base">🧮</span>Compute</div><span className="text-neon">→</span>
              <div className="flex flex-col items-center"><span className="text-base">🗄️</span>Storage</div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* BOTTOM — AI worker strip */}
      <div className="shrink-0"><WorkerActivityStrip departments={departments} agents={agents} /></div>

      {/* Modals */}
      <DepartmentPanel open={deptOpen} companyId={companyId} models={models} editing={editingDept}
        usedFloors={usedFloors} departmentCount={departments.length} onClose={() => setDeptOpen(false)} onSaved={load} />
      <Modal open={projOpen} title="สร้างโปรเจกต์ใหม่" onClose={() => setProjOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setProjOpen(false)}>ยกเลิก</Button><Button onClick={createProject}>สร้าง</Button></>}>
        <Field label="ชื่อโปรเจกต์"><Input value={projForm.name ?? ""} onChange={(e) => setProjForm({ ...projForm, name: e.target.value })} placeholder="เช่น Idle City Builder" /></Field>
        <Field label="รายละเอียด"><Textarea value={projForm.description ?? ""} onChange={(e) => setProjForm({ ...projForm, description: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ประเภท"><Select value={projForm.type} onChange={(e) => setProjForm({ ...projForm, type: e.target.value })}>{PROJECT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
          <Field label="ความสำคัญ"><Select value={projForm.priority} onChange={(e) => setProjForm({ ...projForm, priority: e.target.value as Project["priority"] })}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></Select></Field>
        </div>
      </Modal>
    </div>
  );
}
