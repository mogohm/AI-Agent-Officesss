"use client";
// Drives each agent's visible animation state. Working agents show a work pose;
// idle agents rotate through life-sim behaviors (coffee, reading, chatting…) on
// a staggered timer so they never all do the same thing at once.
import { useEffect, useRef, useState } from "react";
import type { Agent } from "@/lib/types";
import type { CharacterState } from "@/lib/assets/manifest";

const WORK_STATUS = new Set(["coding", "writing", "designing", "testing", "reviewing", "meeting"]);
const THINK_STATUS = new Set(["thinking", "planning"]);
const IDLE_POOL: CharacterState[] = ["idle", "coffee", "reading", "chatting", "walking", "idle"];

function baseState(status: string): CharacterState | null {
  if (WORK_STATUS.has(status)) return "working";
  if (THINK_STATUS.has(status)) return "thinking";
  if (status === "error") return "thinking";
  return null; // idle-family → rotate
}

export function useAgentBehavior(agents: Agent[]): Record<number, CharacterState> {
  const [states, setStates] = useState<Record<number, CharacterState>>({});
  const agentsRef = useRef(agents);
  agentsRef.current = agents;

  // (Re)initialise when the roster or statuses change.
  const sig = agents.map((a) => `${a.id}:${a.status}`).join("|");
  useEffect(() => {
    const init: Record<number, CharacterState> = {};
    for (const a of agents) init[a.id] = baseState(a.status) ?? "idle";
    setStates(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  // Rotate idle agents on a gentle, staggered cadence.
  useEffect(() => {
    const tick = () => {
      setStates((prev) => {
        const next = { ...prev };
        for (const a of agentsRef.current) {
          if (baseState(a.status) !== null) continue; // working/thinking pinned
          if (Math.random() < 0.35) {
            next[a.id] = IDLE_POOL[Math.floor(Math.random() * IDLE_POOL.length)];
          }
        }
        return next;
      });
    };
    const id = setInterval(tick, 3200);
    return () => clearInterval(id);
  }, []);

  return states;
}
