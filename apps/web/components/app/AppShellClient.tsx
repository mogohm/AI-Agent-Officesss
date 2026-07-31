"use client";
import { useState } from "react";
import { Menu, X, LogOut, CircleDot } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { signOutAction } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShellClient({
  user,
  children,
}: {
  user: { name?: string | null; email: string; globalRole: string };
  children: React.ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const initials = (user.name || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {/* desktop sidebar */}
      <aside className="hidden md:block">
        <AppSidebar />
      </aside>

      {/* mobile drawer */}
      {drawer ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0">
            <AppSidebar onNavigate={() => setDrawer(false)} />
          </div>
          <button aria-label="Close menu" className="absolute right-4 top-4 text-white" onClick={() => setDrawer(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#244768]/60 bg-[#091426] px-3 md:px-5">
          <button
            aria-label="Open menu"
            className="grid h-9 w-9 place-items-center rounded-md text-slate-300 hover:bg-white/5 md:hidden"
            onClick={() => setDrawer(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-xs text-emerald-400" title="System status">
            <CircleDot className="h-4 w-4" />
            <span className="hidden sm:inline">All Systems Operational</span>
          </div>
          <div className="mx-1 h-6 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600/30 text-xs font-bold text-blue-200">{initials}</span>
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-xs font-semibold text-slate-100">{user.name || user.email}</div>
              <div className="text-[10px] text-slate-500">{user.globalRole === "SUPER_ADMIN" ? "Super Admin" : "User"}</div>
            </div>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost" size="icon" title="Sign out" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </header>

        <main className={cn("scroll-slim min-h-0 flex-1 overflow-y-auto bg-[#07111F]")}>
          <div className="mx-auto max-w-[1760px] p-3 md:p-4">{children}</div>
        </main>
      </div>
    </div>
  );
}
