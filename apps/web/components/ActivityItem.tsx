"use client";
import type { Activity } from "@/lib/types";

const STATUS_COLOR: Record<string, string> = {
  info: "#5B8CFF", success: "#5BE49B", warning: "#FFD166",
  error: "#FF6B7A", blocked: "#FF6B7A",
};

const ACTION_ICON: Record<string, string> = {
  command: "🎙️", start: "▶️", pause: "⏸️", resume: "⏩", vps: "🖥️",
  coding: "⌨️", designing: "🎨", testing: "🧪", created: "✨", system: "⚙️",
};

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ActivityItem({ activity, last }: { activity: Activity; last?: boolean }) {
  const color = STATUS_COLOR[activity.status] ?? "#5B8CFF";
  const icon = ACTION_ICON[activity.action] ?? "•";
  return (
    <div className="flex gap-3">
      <div className="flex w-8 flex-col items-center">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full border text-sm"
          style={{ borderColor: `${color}66`, backgroundColor: `${color}1A` }}
        >
          {icon}
        </div>
        {!last ? <div className="my-1 w-0.5 flex-1 bg-line" /> : null}
      </div>
      <div className="flex-1 pb-5">
        <div className="text-sm text-ink">{activity.message}</div>
        <div className="mt-0.5 text-xs text-faint">
          {activity.related_file ? `${activity.related_file} · ` : ""}{timeAgo(activity.created_at)}
        </div>
      </div>
    </div>
  );
}
