"use client";
// A cute, animated "office worker" sprite. Bobs/tilts based on whether it is
// actively working, and surfaces a work/idle action label on hover.
import { motion } from "framer-motion";
import type { Agent } from "@/lib/types";
import { STATUS_COLOR, WORK_ACTION } from "@/lib/theme";

const WORKING = new Set([
  "thinking", "planning", "coding", "designing", "writing", "reviewing", "testing", "meeting",
]);

const IDLE_ACTIONS = [
  "drinking coffee ☕", "reading a book 📖", "chatting with a coworker 💬",
  "playing a small game 🎮", "relaxing on the sofa 🛋️", "looking out the window 🌆",
];

export function AgentSprite({
  agent, departmentType, size = 44,
}: { agent: Agent; departmentType?: string; size?: number }) {
  const color = STATUS_COLOR[agent.status];
  const working = WORKING.has(agent.status);
  const label = working
    ? (agent.current_task || WORK_ACTION[departmentType ?? ""] || "working")
    : IDLE_ACTIONS[agent.id % IDLE_ACTIONS.length];

  return (
    <div className="group relative flex flex-col items-center gap-1" title={`${agent.name} — ${label}`}>
      <motion.div
        style={{ width: size, height: size, borderColor: color, backgroundColor: `${color}22`, boxShadow: `0 0 12px ${color}55` }}
        className="flex items-center justify-center rounded-2xl border"
        animate={
          working
            ? { y: [0, -3, 0], rotate: [0, -2, 2, 0] }
            : { y: [0, -2, 0] }
        }
        transition={{ duration: working ? 0.9 : 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <span style={{ fontSize: size * 0.5 }}>{agent.avatar}</span>
      </motion.div>
      <span className="max-w-[72px] truncate text-[10px] font-semibold text-muted">{agent.name}</span>

      {/* Hover bubble showing what the worker is doing */}
      <div className="pointer-events-none absolute -top-9 z-10 hidden whitespace-nowrap rounded-lg border border-line bg-elevated px-2 py-1 text-[10px] text-ink shadow-card group-hover:block">
        {label}
      </div>
    </div>
  );
}
