import { z } from "zod";

export const PROJECT_STATUS = ["DRAFT", "PLANNING", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"] as const;
export const PROJECT_PRIORITY = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export const projectCreateSchema = z.object({
  name: z.string().trim().min(2, "ชื่อโปรเจกต์อย่างน้อย 2 ตัวอักษร").max(80),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  priority: z.enum(PROJECT_PRIORITY).default("MEDIUM"),
  targetDate: z.string().optional().or(z.literal("")),
  monthlyBudget: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().min(0).optional()),
  departmentIds: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).default([]),
  workerIds: z.preprocess((v) => (Array.isArray(v) ? v : v ? [v] : []), z.array(z.string())).default([]),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
