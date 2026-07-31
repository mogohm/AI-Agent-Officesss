"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { departmentCreateSchema, FLOOR_TYPES, type DepartmentCreateInput } from "@/lib/validation/department";
import { createDepartment, updateDepartment } from "@/app/(app)/companies/[companyId]/departments/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function DepartmentForm({
  companyId, mode, departmentId, defaults,
}: {
  companyId: string;
  mode: "create" | "edit";
  departmentId?: string;
  defaults?: Partial<DepartmentCreateInput>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<DepartmentCreateInput>({
    resolver: zodResolver(departmentCreateSchema),
    defaultValues: {
      name: defaults?.name ?? "",
      description: defaults?.description ?? "",
      floorType: defaults?.floorType ?? "OFFICE",
      themeColor: defaults?.themeColor ?? "#3E70C9",
      monthlyBudget: defaults?.monthlyBudget,
      systemInstruction: defaults?.systemInstruction ?? "",
    },
  });

  async function onSubmit(values: DepartmentCreateInput) {
    setServerError(null);
    const res = mode === "create"
      ? await createDepartment(companyId, values)
      : await updateDepartment(companyId, departmentId!, values);
    if (res.success) { router.push(`/companies/${companyId}/departments/${res.data.id}`); router.refresh(); return; }
    if (res.error.fieldErrors) for (const [f, m] of Object.entries(res.error.fieldErrors)) setError(f as keyof DepartmentCreateInput, { message: m?.[0] });
    setServerError(res.error.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">ชื่อแผนก *</Label>
        <Input id="name" {...register("name")} placeholder="เช่น IT / Dev" />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="floorType">ประเภทชั้น</Label>
          <Select id="floorType" {...register("floorType")}>
            {FLOOR_TYPES.map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="themeColor">สีประจำชั้น</Label>
          <Input id="themeColor" type="color" {...register("themeColor")} className="h-9 p-1" />
          {errors.themeColor && <p className="text-xs text-red-400">{errors.themeColor.message}</p>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">คำอธิบาย</Label>
        <Textarea id="description" {...register("description")} rows={2} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="systemInstruction">คำสั่งระบบของแผนก (system instruction)</Label>
        <Textarea id="systemInstruction" {...register("systemInstruction")} rows={3} placeholder="แนวทางการทำงานของ AI ในแผนกนี้…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="monthlyBudget">งบต่อเดือน</Label>
        <Input id="monthlyBudget" type="number" step="0.01" min="0" {...register("monthlyBudget")} placeholder="0.00" />
      </div>
      {serverError && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{serverError}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก…" : mode === "create" ? "สร้างแผนก" : "บันทึก"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>ยกเลิก</Button>
      </div>
    </form>
  );
}
