"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { projectCreateSchema, PROJECT_PRIORITY, type ProjectCreateInput } from "@/lib/validation/project";
import { createProject, updateProject } from "@/app/(app)/companies/[companyId]/projects/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Opt = { id: string; name: string };

export function ProjectForm({
  mode, companyId, projectId, departments, workers, defaults,
}: {
  mode: "create" | "edit";
  companyId: string;
  projectId?: string;
  departments: Opt[];
  workers: (Opt & { role?: string })[];
  defaults?: Partial<ProjectCreateInput> & { departmentIds?: string[]; workerIds?: string[] };
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<ProjectCreateInput>({
    resolver: zodResolver(projectCreateSchema),
    defaultValues: {
      name: defaults?.name ?? "",
      description: defaults?.description ?? "",
      priority: defaults?.priority ?? "MEDIUM",
      targetDate: defaults?.targetDate ?? "",
      monthlyBudget: defaults?.monthlyBudget,
      departmentIds: (defaults?.departmentIds ?? []) as unknown as ProjectCreateInput["departmentIds"],
      workerIds: (defaults?.workerIds ?? []) as unknown as ProjectCreateInput["workerIds"],
    },
  });

  async function onSubmit(values: ProjectCreateInput) {
    setServerError(null);
    const res = mode === "create" ? await createProject(companyId, values) : await updateProject(companyId, projectId!, values);
    if (res.success) { router.push(`/companies/${companyId}/projects/${res.data.id}`); router.refresh(); return; }
    if (res.error.fieldErrors) for (const [f, m] of Object.entries(res.error.fieldErrors)) setError(f as keyof ProjectCreateInput, { message: m?.[0] });
    setServerError(res.error.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">ชื่อโปรเจกต์ *</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">คำอธิบาย</Label>
        <Textarea id="description" {...register("description")} rows={2} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="priority">ความสำคัญ</Label>
          <Select id="priority" {...register("priority")}>{PROJECT_PRIORITY.map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}</Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="targetDate">กำหนดส่ง</Label>
          <Input id="targetDate" type="date" {...register("targetDate")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="monthlyBudget">งบ/เดือน</Label>
          <Input id="monthlyBudget" type="number" step="0.01" min="0" {...register("monthlyBudget")} />
        </div>
      </div>
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium text-slate-300">แผนกที่เกี่ยวข้อง</legend>
        <div className="flex flex-wrap gap-1.5">
          {departments.length === 0 ? <span className="text-xs text-slate-500">ยังไม่มีแผนก</span> : departments.map((d) => (
            <label key={d.id} className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300">
              <input type="checkbox" value={d.id} {...register("departmentIds")} className="accent-blue-500" />{d.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-medium text-slate-300">Workers ที่มอบหมาย</legend>
        <div className="flex flex-wrap gap-1.5">
          {workers.length === 0 ? <span className="text-xs text-slate-500">ยังไม่มี worker</span> : workers.map((w) => (
            <label key={w.id} className="flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300">
              <input type="checkbox" value={w.id} {...register("workerIds")} className="accent-blue-500" />{w.name}
            </label>
          ))}
        </div>
      </fieldset>
      {serverError && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{serverError}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก…" : mode === "create" ? "สร้างโปรเจกต์" : "บันทึก"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>ยกเลิก</Button>
      </div>
    </form>
  );
}
