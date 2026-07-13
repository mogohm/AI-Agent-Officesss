"use client";
// Create/Edit a department (floor). Includes the Job Description editor,
// AI model selection with live recommendation, and example responsibilities.
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useUI } from "@/lib/store";
import type { AIModel, Department, Recommendation } from "@/lib/types";
import {
  ACCENT_CHOICES, DEPARTMENT_TYPES, MAX_DEPARTMENTS, ROOM_STYLES,
  exampleResponsibilities,
} from "@/lib/constants";
import { providerBadge } from "@/lib/theme";
import { Badge, Button, Field, Input, Modal, Select, Textarea } from "./ui";

interface Props {
  open: boolean;
  companyId: number;
  models: AIModel[];
  editing: Department | null;      // null => create mode
  usedFloors: number[];            // floors already taken (for hint)
  departmentCount: number;
  onClose: () => void;
  onSaved: () => void;
}

const blank = (nextFloor: number): Partial<Department> => ({
  name: "", type: "IT / Dev", floor_number: nextFloor, job_description: "",
  responsibilities: [], theme_color: "#5B8CFF", room_style: "glass-office",
  assigned_ai_model_id: null, status: "active",
});

export function DepartmentPanel({
  open, companyId, models, editing, usedFloors, departmentCount, onClose, onSaved,
}: Props) {
  const pushToast = useUI((s) => s.pushToast);
  const nextFloor = Math.min(
    MAX_DEPARTMENTS,
    (usedFloors.length ? Math.max(...usedFloors) : 0) + 1,
  );
  const [form, setForm] = useState<Partial<Department>>(blank(nextFloor));
  const [rec, setRec] = useState<Recommendation | null>(null);

  useEffect(() => {
    if (open) setForm(editing ? { ...editing } : blank(nextFloor));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  // Fetch recommendation whenever the department type changes.
  useEffect(() => {
    if (!open || !form.type) return;
    let alive = true;
    api.recommendModel(form.type).then((r) => alive && setRec(r)).catch(() => setRec(null));
    return () => { alive = false; };
  }, [open, form.type]);

  const recommendedModels = rec
    ? models.filter((m) => rec.recommended_model_ids.includes(m.id))
    : [];

  function addResponsibility(text: string) {
    const list = form.responsibilities ?? [];
    if (!list.includes(text)) setForm({ ...form, responsibilities: [...list, text] });
  }
  function removeResponsibility(text: string) {
    setForm({ ...form, responsibilities: (form.responsibilities ?? []).filter((r) => r !== text) });
  }

  async function save() {
    if (!form.name?.trim()) { pushToast("Name is required", "error"); return; }
    try {
      if (editing) {
        await api.updateDepartment(editing.id, form);
        pushToast("Department updated", "success");
      } else {
        await api.createDepartment(companyId, form);
        pushToast("Department (floor) added", "success");
      }
      onSaved();
      onClose();
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : "Save failed", "error");
    }
  }

  async function remove() {
    if (!editing) return;
    let warn = "";
    try {
      const usage = await api.departmentUsage(editing.id);
      if (usage.agents || usage.projects) {
        warn = ` It has ${usage.agents} agent(s) and is linked to ${usage.projects} project(s).`;
      }
    } catch { /* ignore usage lookup failure */ }
    if (!confirm(`Delete "${editing.name}" (floor ${editing.floor_number})?${warn}`)) return;
    try {
      await api.deleteDepartment(editing.id);
      pushToast("Department deleted", "success");
      onSaved();
      onClose();
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : "Delete failed", "error");
    }
  }

  const atLimit = !editing && departmentCount >= MAX_DEPARTMENTS;

  return (
    <Modal
      open={open}
      title={editing ? `Floor ${editing.floor_number} · ${editing.name}` : "Add Department (Floor)"}
      onClose={onClose}
      footer={<>
        {editing ? <Button variant="danger" onClick={remove}>Delete</Button> : null}
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} disabled={atLimit}>{editing ? "Save" : "Add Floor"}</Button>
      </>}
    >
      {atLimit ? (
        <div className="mb-3 rounded-xl border border-amber/50 bg-amber/10 px-3 py-2 text-sm text-amber">
          สูงสุด 15 แผนก / 15 ชั้น — this company already has {MAX_DEPARTMENTS} floors.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Department name">
          <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Engineering" />
        </Field>
        <Field label="Floor number" hint={`taken: ${usedFloors.join(", ") || "none"}`}>
          <Input type="number" min={1} max={15} value={form.floor_number ?? 1}
            onChange={(e) => setForm({ ...form, floor_number: Number(e.target.value) })} />
        </Field>
      </div>

      <Field label="Department type">
        <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {DEPARTMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>

      {/* AI model selection + recommendation */}
      <Field label="Assigned AI model">
        <Select
          value={form.assigned_ai_model_id ?? ""}
          onChange={(e) => setForm({ ...form, assigned_ai_model_id: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">— none —</option>
          {models.map((m) => <option key={m.id} value={m.id}>{m.display_name}</option>)}
        </Select>
      </Field>
      {rec ? (
        <div className="mb-3 rounded-xl border border-line bg-surface p-3">
          <div className="mb-2 text-xs font-semibold text-cyan">💡 Recommended for {form.type}</div>
          <div className="mb-2 text-xs text-muted">{rec.reason}</div>
          <div className="flex flex-wrap gap-2">
            {recommendedModels.map((m) => {
              const b = providerBadge(m.provider);
              const selected = form.assigned_ai_model_id === m.id;
              return (
                <button key={m.id} onClick={() => setForm({ ...form, assigned_ai_model_id: m.id })}
                  style={{ borderColor: selected ? b.color : undefined }}
                  className={`rounded-lg border px-2 py-1 text-xs ${selected ? "bg-neon/15" : "border-line"}`}>
                  <Badge color={b.color}>{b.label}</Badge> {m.display_name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Job description */}
      <Field label="Job description">
        <Textarea value={form.job_description ?? ""} onChange={(e) => setForm({ ...form, job_description: e.target.value })}
          placeholder="Describe what this department is responsible for…" />
      </Field>

      {/* Responsibilities with examples */}
      <Field label="Responsibilities">
        <div className="mb-2 flex flex-wrap gap-2">
          {(form.responsibilities ?? []).map((r) => (
            <span key={r} className="inline-flex items-center gap-1 rounded-full border border-line bg-surfaceAlt px-2 py-1 text-xs text-ink">
              {r} <button onClick={() => removeResponsibility(r)} className="text-faint hover:text-ink">✕</button>
            </span>
          ))}
          {(form.responsibilities ?? []).length === 0 ? <span className="text-xs text-faint">none yet — add from examples below</span> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {exampleResponsibilities(form.type ?? "").map((r) => (
            <button key={r} onClick={() => addResponsibility(r)}
              className="rounded-full border border-dashed border-line px-2 py-1 text-xs text-muted hover:border-neon hover:text-neon">
              + {r}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Theme color">
          <div className="flex flex-wrap gap-2">
            {ACCENT_CHOICES.map((c) => (
              <button key={c} onClick={() => setForm({ ...form, theme_color: c })}
                style={{ background: c }}
                className={`h-8 w-8 rounded-full border-2 ${form.theme_color === c ? "border-white" : "border-transparent"}`} />
            ))}
          </div>
        </Field>
        <Field label="Room style">
          <Select value={form.room_style} onChange={(e) => setForm({ ...form, room_style: e.target.value })}>
            {ROOM_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
