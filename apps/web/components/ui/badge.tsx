import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors",
  {
    variants: {
      tone: {
        neutral: "border-white/15 bg-white/5 text-slate-300",
        blue: "border-blue-500/30 bg-blue-500/15 text-blue-300",
        green: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        amber: "border-amber-500/30 bg-amber-500/15 text-amber-300",
        purple: "border-purple-500/30 bg-purple-500/15 text-purple-300",
        red: "border-red-500/30 bg-red-500/15 text-red-300",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
