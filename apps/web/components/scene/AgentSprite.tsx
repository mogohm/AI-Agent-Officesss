"use client";
// A pixel-art worker sprite composited into a floor scene. Loads
// characters/<look>/<state>.webp; if the art isn't present yet it draws a
// neutral silhouette placeholder (never an emoji) so the scene still reads.
import { motion } from "framer-motion";
import type { Agent } from "@/lib/types";
import { characterAsset, type CharacterState } from "@/lib/assets/manifest";
import { lookForRole } from "@/lib/assets/departmentScenes";
import { AssetImg } from "./AssetImg";

const MOVING: CharacterState[] = ["walking", "chatting", "coffee"];

function Silhouette({ color, h }: { color: string; h: number }) {
  // Placeholder worker: head + body silhouette in the agent's accent color.
  return (
    <svg width={h * 0.62} height={h} viewBox="0 0 62 100" style={{ display: "block" }}>
      <ellipse cx="31" cy="96" rx="18" ry="4" fill="rgba(0,0,0,0.35)" />
      <rect x="16" y="40" width="30" height="46" rx="12" fill={color} opacity="0.9" />
      <circle cx="31" cy="26" r="16" fill={color} />
      <circle cx="31" cy="26" r="16" fill="rgba(255,255,255,0.12)" />
    </svg>
  );
}

export function AgentSprite({
  agent, state, heightPx = 96, seed = 0,
}: {
  agent: Agent; state: CharacterState; heightPx?: number; seed?: number;
}) {
  const look = lookForRole(agent.role, agent.id + seed);
  const moving = MOVING.includes(state);

  return (
    <motion.div
      title={`${agent.name} · ${agent.role} · ${state}`}
      style={{ height: heightPx, width: heightPx * 0.68 }}
      animate={moving ? { y: [0, -3, 0] } : { y: [0, -1.5, 0] }}
      transition={{ duration: moving ? 1 : 3.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <AssetImg
        src={characterAsset(look, state)}
        alt={`${agent.name} ${state}`}
        className="pixelated h-full w-full object-contain"
        placeholder={<Silhouette color={agent.accent || "#5B8CFF"} h={heightPx} />}
      />
    </motion.div>
  );
}
