"use client";
// App frame. Most routes use the left-rail layout. The Company Building route
// (/companies/[id]) uses an IMMERSIVE full-viewport layout with a compact top
// bar (no permanent sidebar) so the office composition owns the screen.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import {
  Activity as ActivityIcon, Bot, Building2, Cpu, MessageSquareText, Sparkles,
} from "lucide-react";
import { useUI } from "@/lib/store";

const NAV = [
  { href: "/", label: "Companies", icon: Building2 },
  { href: "/ai-models", label: "AI Models", icon: Sparkles },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/activity", label: "Activity", icon: ActivityIcon },
  { href: "/vps", label: "VPS", icon: Cpu },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id}
          className={`rounded-xl border px-4 py-2 text-sm shadow-card ${
            t.kind === "error" ? "border-[#FF6B7A]/50 bg-[#FF6B7A]/15 text-[#FF6B7A]"
            : t.kind === "success" ? "border-lime/50 bg-lime/15 text-lime"
            : "border-line bg-elevated text-ink"}`}>
          {t.message}
        </div>
      ))}
    </div>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-neon to-purple text-base shadow-neon">🤖</span>
      <span className="leading-tight">
        <span className="block font-display text-[9px]" style={{ color: "#2F66B3" }}>AI AGENT OFFICE</span>
        <span className="block text-[8px] text-muted">Smart Work, Better Results</span>
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const immersive = /^\/companies\/[^/]+$/.test(pathname);
  // Bare mode: pixel-capture routes + the Bright Office render with NO app
  // chrome (the measured reference has no global header). With the Bright
  // flag on (default), the production company page is the Bright Office.
  const brightEnabled = process.env.NEXT_PUBLIC_BRIGHT_OFFICE !== "false";
  if (pathname === "/visual-lab/reference-clone/stage" || pathname === "/bright-office"
    || (brightEnabled && immersive)) return <>{children}</>;

  if (immersive) {
    return (
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <header className="z-30 flex h-12 shrink-0 items-center gap-4 border-b border-line bg-elevated/85 px-3 backdrop-blur">
          <Brand />
          <nav className="scroll-slim ml-2 hidden items-center gap-1 overflow-x-auto md:flex">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                  isActive(pathname, href) ? "bg-neon/15 text-neon" : "text-muted hover:bg-surface hover:text-ink"}`}>
                <Icon size={15} /> {label}
              </Link>
            ))}
          </nav>
          <Link href="/command" className="ml-auto flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-neon to-purple px-2.5 py-1.5 text-xs font-bold text-white">
            <MessageSquareText size={15} /> Command
          </Link>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
        <Toasts />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-line bg-elevated/80 p-4 backdrop-blur md:flex">
        <div className="mb-6 px-1"><Brand /></div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                isActive(pathname, href) ? "bg-neon/15 text-neon" : "text-muted hover:bg-surface hover:text-ink"}`}>
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <Link href="/command" className="mt-2 flex items-center gap-2 rounded-xl bg-gradient-to-br from-neon to-purple px-3 py-2 text-sm font-bold text-white">
          <MessageSquareText size={18} /> Command Center
        </Link>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-elevated/80 px-4 py-3 backdrop-blur md:hidden">
        <Brand />
        <Link href="/command" className="rounded-lg bg-neon/15 p-2 text-neon"><MessageSquareText size={18} /></Link>
      </header>

      <main className="px-4 pb-28 pt-4 md:ml-60 md:px-8 md:pb-10 md:pt-8">{children}</main>

      <nav className="fixed bottom-0 left-0 z-30 flex w-full items-center justify-around border-t border-line bg-elevated/95 px-2 py-2 backdrop-blur md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[10px] font-semibold ${
              isActive(pathname, href) ? "text-neon" : "text-faint"}`}>
            <Icon size={20} /> {label}
          </Link>
        ))}
      </nav>
      <Toasts />
    </div>
  );
}
