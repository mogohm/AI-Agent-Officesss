import { z } from "zod";

export const companyCreateSchema = z.object({
  name: z.string().trim().min(2, "ชื่อบริษัทอย่างน้อย 2 ตัวอักษร").max(80),
  legalName: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  currency: z.string().trim().length(3, "ใช้รหัสสกุลเงิน 3 ตัว เช่น USD").toUpperCase().default("USD"),
  timezone: z.string().trim().min(1).default("UTC"),
  monthlyBudget: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().min(0).optional()),
});

export const companyUpdateSchema = companyCreateSchema.partial();

export type CompanyCreateInput = z.infer<typeof companyCreateSchema>;
export type CompanyUpdateInput = z.infer<typeof companyUpdateSchema>;
