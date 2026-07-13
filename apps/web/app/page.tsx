"use client";
// Company Overview — all companies as isometric building cards.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useUI } from "@/lib/store";
import type { Company, CompanyOverview } from "@/lib/types";
import { CompanyCard } from "@/components/CompanyCard";
import { Button, EmptyState, Field, Input, Modal, Select, Textarea } from "@/components/ui";

const EMOJI_CHOICES = ["🏢", "🎮", "🧪", "🚀", "🏦", "🎨", "🤖", "🌐"];
const emptyForm: Partial<Company> = { name: "", description: "", emoji: "🏢", status: "active", theme_color: "#5B8CFF" };

export default function CompanyOverviewPage() {
  const router = useRouter();
  const pushToast = useUI((s) => s.pushToast);
  const [companies, setCompanies] = useState<CompanyOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyOverview | null>(null);
  const [form, setForm] = useState<Partial<Company>>(emptyForm);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setCompanies(await api.listCompanies());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Cannot reach the API. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(c: CompanyOverview) { setEditing(c); setForm(c); setModalOpen(true); }

  async function save() {
    try {
      if (editing) {
        await api.updateCompany(editing.id, form);
        pushToast("Company updated", "success");
      } else {
        await api.createCompany(form);
        pushToast("Company created", "success");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : "Save failed", "error");
    }
  }

  async function remove(c: CompanyOverview) {
    if (!confirm(`Delete "${c.name}"? This removes its ${c.department_count} departments and ${c.project_count} projects.`)) return;
    try {
      await api.deleteCompany(c.id);
      pushToast("Company deleted", "success");
      load();
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : "Delete failed", "error");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded bg-neon/20 font-pixel text-[10px] text-neon">1</span>
            <h1 className="font-display text-base text-ink neon-text md:text-lg" style={{ color: "#bcd0ff" }}>หน้ารวมบริษัท</h1>
          </div>
          <p className="mt-1 text-sm text-muted">1 ตึก = 1 บริษัท · เลือกบริษัทที่ต้องการจัดการ</p>
        </div>
        <Button onClick={openCreate}><Plus size={16} /> สร้างบริษัท</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <div key={i} className="h-64 animate-pulse rounded-xl2 border border-line bg-card" />)}
        </div>
      ) : error ? (
        <EmptyState icon="🔌" title="Backend not reachable" message={error}
          action={<Button variant="secondary" onClick={load}>Retry</Button>} />
      ) : companies.length === 0 ? (
        <EmptyState icon="🏙️" title="No companies yet" message="Create your first AI company building to get started."
          action={<Button onClick={openCreate}><Plus size={16} /> New Company</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {companies.map((c) => (
            <CompanyCard key={c.id} company={c}
              onOpen={() => router.push(`/companies/${c.id}`)}
              onEdit={() => openEdit(c)}
              onDelete={() => remove(c)} />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Edit Company" : "New Company"}
        onClose={() => setModalOpen(false)}
        footer={<>
          <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={save}>{editing ? "Save" : "Create"}</Button>
        </>}
      >
        <Field label="Company name">
          <Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. AI Game Studio" />
        </Field>
        <Field label="Description">
          <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What does this company do?" />
        </Field>
        <Field label="Building icon">
          <div className="flex flex-wrap gap-2">
            {EMOJI_CHOICES.map((e) => (
              <button key={e} onClick={() => setForm({ ...form, emoji: e })}
                className={`rounded-xl border p-2 text-xl ${form.emoji === e ? "border-neon bg-neon/15" : "border-line"}`}>{e}</button>
            ))}
          </div>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Company["status"] })}>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="archived">archived</option>
          </Select>
        </Field>
      </Modal>
    </div>
  );
}
