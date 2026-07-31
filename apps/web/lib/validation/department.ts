import { z } from "zod";

export const FLOOR_TYPES = [
  "OFFICE", "DEVELOPMENT", "CREATIVE", "MARKETING", "SALES",
  "MANAGEMENT", "MEETING", "SUPPORT", "SERVER", "CUSTOM",
] as const;

export const departmentCreateSchema = z.object({
  name: z.string().trim().min(2, "ชื่อแผนกอย่างน้อย 2 ตัวอักษร").max(60),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  floorType: z.enum(FLOOR_TYPES).default("OFFICE"),
  themeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "ใช้รหัสสี HEX เช่น #3E70C9").default("#3E70C9"),
  monthlyBudget: z.preprocess((v) => (v === "" || v === null ? undefined : v), z.coerce.number().min(0).optional()),
  systemInstruction: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const departmentUpdateSchema = departmentCreateSchema.partial();

export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;
