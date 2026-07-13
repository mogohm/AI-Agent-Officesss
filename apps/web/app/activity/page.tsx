"use client";
// Activity Feed — realtime timeline via WebSocket, with polling fallback.
import { useEffect, useRef, useState } from "react";
import { api, activitiesSocketUrl } from "@/lib/api";
import type { Activity } from "@/lib/types";
import { ActivityItem } from "@/components/ActivityItem";
import { Card, EmptyState } from "@/components/ui";

export default function ActivityFeedPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [live, setLive] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    api.listActivities(80).then(setActivities).catch(() => {});

    // Try the realtime WebSocket; fall back to polling if it fails.
    let poll: ReturnType<typeof setInterval> | null = null;
    try {
      const ws = new WebSocket(activitiesSocketUrl());
      socketRef.current = ws;
      ws.onopen = () => setLive(true);
      ws.onmessage = (ev) => {
        try {
          const a = JSON.parse(ev.data) as Activity;
          setActivities((prev) => [a, ...prev].slice(0, 120));
        } catch { /* ignore malformed frame */ }
      };
      ws.onclose = () => setLive(false);
      ws.onerror = () => setLive(false);
    } catch {
      setLive(false);
    }

    if (!socketRef.current) {
      poll = setInterval(() => api.listActivities(80).then(setActivities).catch(() => {}), 5000);
    }

    return () => {
      socketRef.current?.close();
      if (poll) clearInterval(poll);
    };
  }, []);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink md:text-3xl">Activity Feed</h1>
          <p className="text-sm text-muted">What your AI office is doing, in real time.</p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-lime animate-pulseSoft" : "bg-faint"}`} />
          {live ? "Live (WebSocket)" : "Polling"}
        </span>
      </div>

      {activities.length === 0 ? (
        <EmptyState icon="📡" title="No activity yet" message="Run a command or start a project to see the feed light up." />
      ) : (
        <Card className="p-4">
          {activities.map((a, i) => <ActivityItem key={a.id} activity={a} last={i === activities.length - 1} />)}
        </Card>
      )}
    </div>
  );
}
