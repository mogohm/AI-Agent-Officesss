"use client";
import { ReactNode } from "react";

// A numbered management panel — bright white surface, soft shadow, colored badge.
export function SectionCard({
  n, title, subtitle, action, children, accent = "#2F66B3",
}: {
  n: number; title: string; subtitle?: string; action?: ReactNode; children: ReactNode; accent?: string;
}) {
  return (
    <section className="rounded-xl2 border border-line bg-elevated shadow-card">
      <header className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg font-pixel text-[11px] text-white"
          style={{ background: `linear-gradient(180deg, ${accent}, ${accent}cc)`, boxShadow: `0 2px 8px ${accent}55` }}
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-ink">{title}</div>
          {subtitle ? <div className="truncate text-[11px] text-muted">{subtitle}</div> : null}
        </div>
        {action}
      </header>
      <div className="p-3.5">{children}</div>
    </section>
  );
}
