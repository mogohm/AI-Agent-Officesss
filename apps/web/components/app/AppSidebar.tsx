"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot } from "lucide-react";
import { NAV } from "./nav";
import { cn } from "@/lib/utils";

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="flex h-full w-60 shrink-0 flex-col border-r border-white/10 bg-[#0c1526]">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-600 text-white">
          <Bot className="h-5 w-5" />
        </span>
        <div className="leading-tight">
          <div className="text-sm font-bold text-white">AI AGENT OFFICE</div>
          <div className="text-[10px] text-slate-500">Smart Work, Better Results</div>
        </div>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  active ? "bg-blue-600/20 text-white ring-1 ring-inset ring-blue-500/30" : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
