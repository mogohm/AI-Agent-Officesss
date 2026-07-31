import {
  LayoutDashboard, Building2, FolderKanban, Bot, ListChecks, ShieldCheck,
  BookOpen, Server, LineChart, ScrollText, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

export const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Workers", href: "/workers", icon: Bot },
  { label: "Tasks", href: "/tasks", icon: ListChecks },
  { label: "Approvals", href: "/approvals", icon: ShieldCheck },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
  { label: "Infrastructure", href: "/infrastructure", icon: Server },
  { label: "Usage", href: "/usage", icon: LineChart },
  { label: "Activity Logs", href: "/activity", icon: ScrollText },
  { label: "Settings", href: "/settings", icon: Settings },
];
