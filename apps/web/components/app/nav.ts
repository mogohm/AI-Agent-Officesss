import {
  LayoutDashboard, Building2, FolderKanban, Bot, ListChecks, ShieldCheck,
  BookOpen, Server, LineChart, ScrollText, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

// Thai-primary labels; technical terms (AI, Worker, Model, Provider, VPS, API)
// stay in English on purpose.
export const NAV: NavItem[] = [
  { label: "แดชบอร์ด", href: "/dashboard", icon: LayoutDashboard },
  { label: "บริษัท", href: "/companies", icon: Building2 },
  { label: "โปรเจกต์", href: "/projects", icon: FolderKanban },
  { label: "AI Workers", href: "/workers", icon: Bot },
  { label: "งาน", href: "/tasks", icon: ListChecks },
  { label: "การอนุมัติ", href: "/approvals", icon: ShieldCheck },
  { label: "คลังความรู้", href: "/knowledge", icon: BookOpen },
  { label: "โครงสร้างพื้นฐาน", href: "/infrastructure", icon: Server },
  { label: "การใช้งานและค่าใช้จ่าย", href: "/usage", icon: LineChart },
  { label: "บันทึกกิจกรรม", href: "/activity", icon: ScrollText },
  { label: "ตั้งค่า", href: "/settings", icon: Settings },
];
