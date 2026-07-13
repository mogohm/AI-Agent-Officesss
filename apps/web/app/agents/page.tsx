"use client";
// Agent Directory — AI office workers, scoped by company.
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useUI } from "@/lib/store";
import type { Agent, AIModel, Company, Department } from "@/lib/types";
import { AGENT_ROLES, AGENT_STATUSES, AVATAR_CHOICES, ACCENT_CHOICES } from "@/lib/constants";
import { AgentSprite } from "@/components/AgentSprite";
import { StatusBadge } from "@/components/StatusBadge";
import { Button, Card, EmptyState, Field, Input, Modal, Select } from "@/components/ui";

const blank: Partial<Agent> = {
  name: "", role: "Developer Agent", avatar: "🧑‍💻", accent: "#5B8CFF",
  status: "idle", department_id: null, assigned_ai_model_id: null, skills: [], personality: "",
};

export default function AgentDirectoryPage() {
  const pushToast = useUI((s) => s.pushToast);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [form, setForm] = useState<Partial<Agent>>(blank);
  const [skillsText, setSkillsText] = useState("");

  useEffect(() => {
    api.listCompanies().then((cs) => {
      setCompanies(cs);
      if (cs.length) setCompanyId(cs[0].id);
    }).catch(() => {});
    api.listModels().then(setModels).catch(() => {});
  }, []);

  async function loadCompanyData(id: number) {
    const [a, d] = await Promise.all([api.listAgents(id), api.listDepartments(id)]);
    setAgents(a); setDepartments(d);
  }
  useEffect(() => { if (companyId) loadCompanyData(companyId).catch(() => {}); }, [companyId]);

  const filtered = useMemo(
    () => (roleFilter ? agents.filter((a) => a.role === roleFilter) : agents),
    [agents, roleFilter],
  );

  function openCreate() { setEditing(null); setForm(blank); setSkillsText(""); setOpen(true); }
  function openEdit(a: Agent) { setEditing(a); setForm(a); setSkillsText((a.skills ?? []).join(", ")); setOpen(true); }

  async function save() {
    if (!companyId) return;
    const payload = { ...form, skills: skillsText.split(",").map((s) => s.trim()).filter(Boolean) };
    try {
      if (editing) { await api.updateAgent(editing.id, payload); pushToast("Agent updated", "success"); }
      else { await api.createAgent(companyId, payload); pushToast("Agent hired", "success"); }
      setOpen(false);
      loadCompanyData(companyId);
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : "Save failed", "error");
    }
  }

  async function remove(a: Agent) {
    if (!confirm(`Remove agent "${a.name}"?`) || !companyId) return;
    await api.deleteAgent(a.id);
    pushToast("Agent removed", "success");
    loadCompanyData(companyId);
  }

  const deptName = (id: number | null) => departments.find((d) => d.id === id)?.name ?? "Unassigned";

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">Agent Directory</h1>
          <p className="text-sm text-muted">AI office workers in your companies.</p>
        </div>
        <div className="flex items-end gap-2">
          <Field label="Company">
            <Select value={companyId ?? ""} onChange={(e) => setCompanyId(Number(e.target.value))}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </Select>
          </Field>
          <Field label="Role">
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All roles</option>
              {AGENT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
          <Button onClick={openCreate} className="mb-3"><Plus size={16} /> Hire</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🤖" title="No agents" message="Hire your first AI worker for this company."
          action={<Button onClick={openCreate}><Plus size={16} /> Hire Agent</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <Card key={a.id} glow={a.accent} className="p-4">
              <div className="flex items-center gap-3">
                <AgentSprite agent={a} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-ink">{a.name}</div>
                  <div className="text-xs text-muted">{a.role}</div>
                </div>
                <StatusBadge status={a.status} />
              </div>
              <div className="mt-3 text-xs text-muted">🏬 {deptName(a.department_id)}</div>
              {a.current_task ? <div className="mt-1 text-xs text-faint">▸ {a.current_task}</div> : null}
              {(a.skills ?? []).length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {a.skills.slice(0, 4).map((s) => <span key={s} className="rounded-full bg-surfaceAlt px-2 py-0.5 text-[10px] text-muted">{s}</span>)}
                </div>
              ) : null}
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => openEdit(a)}>Edit</Button>
                <Button variant="danger" onClick={() => remove(a)}>Remove</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} title={editing ? `Edit ${editing.name}` : "Hire Agent"} onClose={() => setOpen(false)}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save}>{editing ? "Save" : "Hire"}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Role">
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {AGENT_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Avatar">
          <div className="flex flex-wrap gap-2">
            {AVATAR_CHOICES.map((e) => (
              <button key={e} onClick={() => setForm({ ...form, avatar: e })}
                className={`rounded-xl border p-1.5 text-xl ${form.avatar === e ? "border-neon bg-neon/15" : "border-line"}`}>{e}</button>
            ))}
          </div>
        </Field>
        <Field label="Accent">
          <div className="flex flex-wrap gap-2">
            {ACCENT_CHOICES.map((c) => (
              <button key={c} onClick={() => setForm({ ...form, accent: c })} style={{ background: c }}
                className={`h-8 w-8 rounded-full border-2 ${form.accent === c ? "border-white" : "border-transparent"}`} />
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Department">
            <Select value={form.department_id ?? ""} onChange={(e) => setForm({ ...form, department_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Unassigned</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.floor_number}F · {d.name}</option>)}
            </Select>
          </Field>
          <Field label="AI model">
            <Select value={form.assigned_ai_model_id ?? ""} onChange={(e) => setForm({ ...form, assigned_ai_model_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">— none —</option>
              {models.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Agent["status"] })}>
            {AGENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Skills" hint="comma-separated"><Input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="TypeScript, APIs, Testing" /></Field>
        <Field label="Personality"><Input value={form.personality ?? ""} onChange={(e) => setForm({ ...form, personality: e.target.value })} placeholder="e.g. meticulous, friendly" /></Field>
      </Modal>
    </div>
  );
}
