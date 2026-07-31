"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { providerConnectionSchema, PROVIDER_TYPES, type ProviderConnectionInput } from "@/lib/validation/provider";
import { saveConnection } from "@/app/(app)/settings/providers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export function ProviderConnectionForm({ companies, isSuperAdmin }: { companies: { id: string; name: string }[]; isSuperAdmin: boolean }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<ProviderConnectionInput>({
    resolver: zodResolver(providerConnectionSchema),
    defaultValues: { providerType: "OPENAI", displayName: "", companyId: "", apiKey: "", baseUrl: "", organizationId: "" },
  });

  async function onSubmit(values: ProviderConnectionInput) {
    setServerError(null);
    const res = await saveConnection(values);
    if (res.success) { reset(); router.refresh(); return; }
    if (res.error.fieldErrors) for (const [f, m] of Object.entries(res.error.fieldErrors)) setError(f as keyof ProviderConnectionInput, { message: m?.[0] });
    setServerError(res.error.message);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="providerType">Provider</Label>
        <Select id="providerType" {...register("providerType")}>{PROVIDER_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}</Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="displayName">ชื่อการเชื่อมต่อ *</Label>
        <Input id="displayName" {...register("displayName")} placeholder="เช่น OpenAI Production" />
        {errors.displayName && <p className="text-xs text-red-400">{errors.displayName.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="companyId">ขอบเขต</Label>
        <Select id="companyId" {...register("companyId")}>
          {isSuperAdmin ? <option value="">System-wide (ทุกบริษัท)</option> : null}
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apiKey">API Key</Label>
        <Input id="apiKey" type="password" autoComplete="off" {...register("apiKey")} placeholder="sk-…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="baseUrl">Base URL (สำหรับ Local/proxy)</Label>
        <Input id="baseUrl" {...register("baseUrl")} placeholder="http://localhost:11434/v1" />
        {errors.baseUrl && <p className="text-xs text-red-400">{errors.baseUrl.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="organizationId">Organization ID (ถ้ามี)</Label>
        <Input id="organizationId" {...register("organizationId")} />
      </div>
      {serverError && <p className="sm:col-span-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{serverError}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "กำลังบันทึก…" : "+ เพิ่มการเชื่อมต่อ"}</Button>
        <p className="mt-1 text-[11px] text-slate-500">API key จะถูก<strong>เข้ารหัส</strong>ก่อนเก็บ และไม่ถูกส่งกลับมาที่เบราว์เซอร์</p>
      </div>
    </form>
  );
}
