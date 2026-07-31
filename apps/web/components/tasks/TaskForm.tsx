"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { taskCreateSchema, TASK_PRIORITY, type TaskCreateInput } from "@/lib/validation/task";
import { createTask } from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type Opt = { id: string; name: string };

export function TaskForm({
  companyId, projects, departments, workers, defaults,
}: {
  companyId: string;
  projects: Opt[];
  departments: Opt[];
  workers: Opt[];
  defaults?: Partial<TaskCreateInput>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<TaskCreateInput>({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: {
      companyId,
      projectId: defaults?.projectId ?? "",
      departmentId: defaults?.departmentId ?? "",
      workerId: defaults?.workerId ?? "",
      title: "", instruction: "", priority: "NORMAL",
      requiresApproval: false, maxRetries: 2, timeoutSeconds: 120,
    },
  });

  async function onSubmit(values: TaskCreateInput) {
    setServerError(null);
    const res = await createTask(values);
    if (res.success) { router.push(`/tasks/${res.data.id}`); router.refresh(); return; }
    if (res.error.fieldErrors) for (const [f, m] of Object.entries(res.error.fieldErrors)) setError(f as keyof TaskCreateInput, { message: m?.[0] });
    setServerError(res.error.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-2xl space-y-4">
      <input type="hidden" {...register("companyId")} />
      <div className="space-y-1.5">
        <Label htmlFor="title">ชื่องาน *</Label>
        <Input id="title" {...register("title")} placeholder="เช่น เขียน API สำหรับ login" />
        {errors.title && <p className="text-xs text-red-400">{errors.title.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="instruction">คำสั่งงาน *</Label>
        <Textarea id="instruction" {...register("instruction")} rows={5} placeholder="อธิบายสิ่งที่ต้องการให้ AI ทำ…" />
        {errors.instruction && <p className="text-xs text-red-400">{errors.instruction.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="priority">ความสำคัญ</Label>
          <Select id="priority" {...register("priority")}>{TASK_PRIORITY.map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}</Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="projectId">โปรเจกต์</Label>
          <Select id="projectId" {...register("projectId")}><option value="">—</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="departmentId">แผนก</Label>
          <Select id="departmentId" {...register("departmentId")}><option value="">—</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workerId">มอบหมายให้</Label>
          <Select id="workerId" {...register("workerId")}><option value="">— เลือกภายหลัง —</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="maxRetries">Retry สูงสุด</Label>
          <Input id="maxRetries" type="number" min="0" max="5" {...register("maxRetries")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="timeoutSeconds">Timeout (วินาที)</Label>
          <Input id="timeoutSeconds" type="number" min="10" max="900" {...register("timeoutSeconds")} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-300">
        <input type="checkbox" {...register("requiresApproval")} className="accent-blue-500" />
        ต้องขออนุมัติผลงานก่อนถือว่าเสร็จ
      </label>
      {serverError && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{serverError}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก…" : "สร้างงาน (Draft)"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>ยกเลิก</Button>
      </div>
    </form>
  );
}
