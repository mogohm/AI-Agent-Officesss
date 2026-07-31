import { z } from "zod";
import { TOOL_KEYS } from "@/lib/tools";

const csvToArray = (v: unknown) =>
  typeof v === "string" ? v.split(",").map((s) => s.trim()).filter(Boolean) : Array.isArray(v) ? v : [];

export const workerCreateSchema = z.object({
  companyId: z.string().min(1, "ต้องเลือกบริษัท"),
  departmentId: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2, "ชื่ออย่างน้อย 2 ตัวอักษร").max(60),
  role: z.string().trim().min(2).max(60).default("Developer"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  avatarKey: z.string().trim().default("dev-a"),
  modelId: z.string().optional().or(z.literal("")),
  providerConnectionId: z.string().optional().or(z.literal("")),
  systemPrompt: z.string().trim().max(4000).optional().or(z.literal("")),
  skills: z.preprocess(csvToArray, z.array(z.string()).max(30)).default([]),
  toolPermissions: z.preprocess(
    (v) => (Array.isArray(v) ? v : v ? [v] : []),
    z.array(z.enum(TOOL_KEYS as [string, ...string[]])),
  ).default([]),
  monthlyBudget: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().min(0).optional()),
  requiresDefaultApproval: z.coerce.boolean().default(false),
  temperature: z.coerce.number().min(0).max(2).default(0.7),
  maxOutputTokens: z.coerce.number().int().min(256).max(32000).default(4096),
});

export const workerUpdateSchema = workerCreateSchema.partial();

export type WorkerCreateInput = z.infer<typeof workerCreateSchema>;
export type WorkerUpdateInput = z.infer<typeof workerUpdateSchema>;
