import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

const TONES = {
  blue: "text-blue-300 bg-blue-500/15",
  green: "text-emerald-300 bg-emerald-500/15",
  amber: "text-amber-300 bg-amber-500/15",
  purple: "text-purple-300 bg-purple-500/15",
  red: "text-red-300 bg-red-500/15",
  slate: "text-slate-300 bg-white/10",
} as const;

export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = "slate",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg", TONES[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold leading-none text-white">{value}</div>
          <div className="mt-1 truncate text-xs text-slate-400">{label}</div>
        </div>
      </div>
      {sub ? <div className="mt-2 text-[11px] text-slate-500">{sub}</div> : null}
    </Card>
  );
}
