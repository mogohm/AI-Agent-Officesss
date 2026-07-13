"use client";
import { motion } from "framer-motion";
import type { AgentStatus } from "@/lib/types";
import { STATUS_COLOR, STATUS_ICON } from "@/lib/theme";

const PULSING: AgentStatus[] = ["thinking", "planning", "coding", "designing", "writing", "reviewing", "testing", "meeting"];

export function StatusBadge({ status, showIcon = true }: { status: AgentStatus; showIcon?: boolean }) {
  const color = STATUS_COLOR[status];
  const pulse = PULSING.includes(status);
  return (
    <span
      style={{ color, borderColor: `${color}66`, backgroundColor: `${color}1A` }}
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize"
    >
      <motion.span
        style={{ background: color }}
        className="h-2 w-2 rounded-full"
        animate={pulse ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={pulse ? { duration: 1.4, repeat: Infinity } : undefined}
      />
      {showIcon ? STATUS_ICON[status] : null} {status}
    </span>
  );
}
