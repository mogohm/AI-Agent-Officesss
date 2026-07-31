import { z } from "zod";

export const PROVIDER_TYPES = ["OPENAI", "ANTHROPIC", "GOOGLE", "LOCAL"] as const;

export const providerConnectionSchema = z.object({
  companyId: z.string().optional().or(z.literal("")), // empty = system-wide
  providerType: z.enum(PROVIDER_TYPES),
  displayName: z.string().trim().min(2, "ตั้งชื่อการเชื่อมต่อ").max(60),
  apiKey: z.string().optional().or(z.literal("")),
  baseUrl: z.string().url("URL ไม่ถูกต้อง").optional().or(z.literal("")),
  organizationId: z.string().trim().optional().or(z.literal("")),
});

export type ProviderConnectionInput = z.infer<typeof providerConnectionSchema>;
