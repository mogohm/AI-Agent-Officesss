"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { companyCreateSchema, type CompanyCreateInput } from "@/lib/validation/company";
import { createCompany, updateCompany } from "@/app/(app)/companies/actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ApiResult } from "@/lib/result";

const CURRENCIES = ["USD", "THB", "EUR", "GBP", "JPY", "SGD"];

export function CompanyForm({
  mode,
  companyId,
  defaults,
}: {
  mode: "create" | "edit";
  companyId?: string;
  defaults?: Partial<CompanyCreateInput>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register, handleSubmit, setError, formState: { errors, isSubmitting },
  } = useForm<CompanyCreateInput>({
    resolver: zodResolver(companyCreateSchema),
    defaultValues: {
      name: defaults?.name ?? "",
      legalName: defaults?.legalName ?? "",
      description: defaults?.description ?? "",
      currency: defaults?.currency ?? "USD",
      timezone: defaults?.timezone ?? "UTC",
      monthlyBudget: defaults?.monthlyBudget,
    },
  });

  async function onSubmit(values: CompanyCreateInput) {
    setServerError(null);
    const res: ApiResult<{ id: string }> =
      mode === "create" ? await createCompany(values) : await updateCompany(companyId!, values);
    if (res.success) {
      router.push(`/companies/${res.data.id}`);
      router.refresh();
      return;
    }
    if (res.error.fieldErrors) {
      for (const [field, msgs] of Object.entries(res.error.fieldErrors)) {
        setError(field as keyof CompanyCreateInput, { message: msgs?.[0] });
      }
    }
    setServerError(res.error.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">ชื่อบริษัท *</Label>
        <Input id="name" {...register("name")} placeholder="เช่น AI Solutions" />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="legalName">ชื่อทางกฎหมาย</Label>
        <Input id="legalName" {...register("legalName")} placeholder="เช่น AI Solutions Co., Ltd." />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">คำอธิบาย</Label>
        <Textarea id="description" {...register("description")} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="currency">สกุลเงิน</Label>
          <Select id="currency" {...register("currency")}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="monthlyBudget">งบต่อเดือน</Label>
          <Input id="monthlyBudget" type="number" step="0.01" min="0" {...register("monthlyBudget")} placeholder="0.00" />
        </div>
      </div>
      {serverError && <p role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{serverError}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก…" : mode === "create" ? "สร้างบริษัท" : "บันทึก"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>ยกเลิก</Button>
      </div>
    </form>
  );
}
