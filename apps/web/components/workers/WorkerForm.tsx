"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { workerCreateSchema, type WorkerCreateInput } from "@/lib/validation/worker";
import { createWorker, updateWorker } from "@/app/(app)/workers/actions";
import { TOOLS, AVATAR_TEMPLATES } from "@/lib/tools";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Opt = { id: string; name: string };
type ModelOpt = { id: string; displayName: string; providerType: string };

const RISK_TONE = { LOW: "green", MEDIUM: "amber", HIGH: "red" } as const;

export function WorkerForm({
  mode, workerId, companyId, departments, models, defaults,
}: {
  mode: "create" | "edit";
  workerId?: string;
  companyId: string;
  departments: Opt[];
  models: ModelOpt[];
  defaults?: Partial<WorkerCreateInput> & { skills?: string[]; toolPermissions?: string[] };
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<WorkerCreateInput>({
    resolver: zodResolver(workerCreateSchema),
    defaultValues: {
      companyId,
      departmentId: defaults?.departmentId ?? "",
      name: defaults?.name ?? "",
      role: defaults?.role ?? "Developer",
      description: defaults?.description ?? "",
      avatarKey: defaults?.avatarKey ?? "dev-a",
      modelId: defaults?.modelId ?? "",
      systemPrompt: defaults?.systemPrompt ?? "",
      skills: (defaults?.skills ?? []) as unknown as WorkerCreateInput["skills"],
      toolPermissions: (defaults?.toolPermissions ?? []) as unknown as WorkerCreateInput["toolPermissions"],
      monthlyBudget: defaults?.monthlyBudget,
      requiresDefaultApproval: defaults?.requiresDefaultApproval ?? false,
      temperature: defaults?.temperature ?? 0.7,
      maxOutputTokens: defaults?.maxOutputTokens ?? 4096,
    },
  });

  async function onSubmit(values: WorkerCreateInput) {
    setServerError(null);
    const res = mode === "create" ? await createWorker(values) : await updateWorker(workerId!, values);
    if (res.success) { router.push(`/workers/${res.data.id}`); router.refresh(); return; }
    if (res.error.fieldErrors) for (const [f, m] of Object.entries(res.error.fieldErrors)) setError(f as keyof WorkerCreateInput, { message: m?.[0] });
    setServerError(res.error.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-5">
      <input type="hidden" {...register("companyId")} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">ชื่อ Worker *</Label>
          <Input id="name" {...register("name")} placeholder="เช่น Ada" />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="role">บทบาท</Label>
          <Input id="role" {...register("role")} placeholder="เช่น Frontend Developer" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="departmentId">แผนก</Label>
          <Select id="departmentId" {...register("departmentId")}>
            <option value="">— ไม่ระบุ —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="avatarKey">Avatar</Label>
          <Select id="avatarKey" {...register("avatarKey")}>
            {AVATAR_TEMPLATES.map((a) => <option key={a} value={a}>{a}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="modelId">AI Model</Label>
          <Select id="modelId" {...register("modelId")}>
            <option value="">— ใช้ค่าเริ่มต้นของแผนก/บริษัท —</option>
            {models.map((m) => <option key={m.id} value={m.id}>{m.displayName} ({m.providerType.toLowerCase()})</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="monthlyBudget">งบต่อเดือน</Label>
          <Input id="monthlyBudget" type="number" step="0.01" min="0" {...register("monthlyBudget")} placeholder="0.00" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">คำอธิบาย</Label>
        <Textarea id="description" {...register("description")} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <Textarea id="systemPrompt" {...register("systemPrompt")} rows={4} placeholder="บทบาทและแนวทางการทำงานของ worker…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="skills">Skills (คั่นด้วย ,)</Label>
        <Input id="skills" defaultValue={(defaults?.skills ?? []).join(", ")} {...register("skills")} placeholder="เช่น React, TypeScript, UI" />
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-slate-300">Tool Permissions</legend>
        <p className="text-[11px] text-slate-500">เครื่องมือความเสี่ยงสูง (แดง) จะต้องขออนุมัติจากมนุษย์โดยอัตโนมัติ</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {TOOLS.map((t) => (
            <label key={t.key} className="flex items-center gap-2 rounded-md border border-white/10 px-2 py-1.5 text-xs text-slate-300">
              <input type="checkbox" value={t.key} {...register("toolPermissions")} className="accent-blue-500" />
              <span className="flex-1 truncate">{t.label}</span>
              <Badge tone={RISK_TONE[t.risk]}>{t.risk.toLowerCase()}</Badge>
            </label>
          ))}
        </div>
      </fieldset>

      <details className="rounded-md border border-white/10 p-3">
        <summary className="cursor-pointer text-xs font-medium text-slate-300">ตั้งค่าขั้นสูง</summary>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="temperature">Temperature</Label>
            <Input id="temperature" type="number" step="0.1" min="0" max="2" {...register("temperature")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="maxOutputTokens">Max Output Tokens</Label>
            <Input id="maxOutputTokens" type="number" step="1" min="256" max="32000" {...register("maxOutputTokens")} />
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
          <input type="checkbox" {...register("requiresDefaultApproval")} className="accent-blue-500" />
          ต้องขออนุมัติผลงานทุกครั้งก่อนถือว่าเสร็จ
        </label>
      </details>

      {serverError && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{serverError}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก…" : mode === "create" ? "สร้าง Worker" : "บันทึก"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>ยกเลิก</Button>
      </div>
    </form>
  );
}
