import { z } from "zod";

export const TASK_PRIORITY = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export const taskCreateSchema = z.object({
  companyId: z.string().min(1, "ต้องเลือกบริษัท"),
  projectId: z.string().optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  workerId: z.string().optional().or(z.literal("")),
  title: z.string().trim().min(2, "ชื่องานอย่างน้อย 2 ตัวอักษร").max(120),
  instruction: z.string().trim().min(4, "คำสั่งงานอย่างน้อย 4 ตัวอักษร").max(8000),
  priority: z.enum(TASK_PRIORITY).default("NORMAL"),
  requiresApproval: z.coerce.boolean().default(false),
  maxRetries: z.coerce.number().int().min(0).max(5).default(2),
  timeoutSeconds: z.coerce.number().int().min(10).max(900).default(120),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
