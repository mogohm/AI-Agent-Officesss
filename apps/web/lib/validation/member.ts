import { z } from "zod";

export const COMPANY_ROLES = ["OWNER", "ADMIN", "MANAGER", "OPERATOR", "REVIEWER", "VIEWER"] as const;
const roleEnum = z.enum(COMPANY_ROLES);

export const addMemberSchema = z.object({
  companyId: z.string().min(1),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  role: roleEnum,
});

export const createUserSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().trim().min(1, "กรุณาระบุชื่อ").max(120),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านอย่างน้อย 8 ตัวอักษร").max(200),
  role: roleEnum,
});

export const updateRoleSchema = z.object({ memberId: z.string().min(1), role: roleEnum });
export const removeMemberSchema = z.object({ memberId: z.string().min(1) });

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
