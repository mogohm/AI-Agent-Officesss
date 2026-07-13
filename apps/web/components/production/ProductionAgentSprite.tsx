"use client";
// Renders a composited worker sprite from a resolved asset path with subtle
// motion. Falls back to a labeled dev box if the asset is missing.
import { motion } from "framer-motion";
import { AssetImg } from "@/components/scene/AssetImg";

const MOVING = new Set(["coffee", "reading", "relaxing", "playing", "sketching"]);

export function ProductionAgentSprite({
  src, state, heightPx, facing, name,
}: { src: string; state: string; heightPx: number; facing: "left" | "right"; name: string }) {
  const moving = MOVING.has(state);
  const width = heightPx * (2 / 3);
  return (
    <motion.div title={`${name} · ${state}`} style={{ width, height: heightPx }}
      animate={moving ? { y: [0, -3, 0] } : { y: [0, -1.5, 0] }}
      transition={{ duration: moving ? 1 : 3.2, repeat: Infinity, ease: "easeInOut" }}>
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2"
        style={{ width: width * 0.65, height: heightPx * 0.06, background: "rgba(0,0,0,0.4)", borderRadius: "50%", filter: "blur(2px)" }} />
      <AssetImg src={src} alt={name}
        className="pixelated h-full w-full object-contain"
        style={{ transform: facing === "left" ? "scaleX(-1)" : undefined }}
        placeholder={
          <div className="flex h-full w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-[#FF3DAE] bg-[#FF3DAE]/10 p-1 text-center">
            <span className="text-[8px] font-bold uppercase text-[#FF3DAE]">art pending</span>
            <span className="text-[8px] text-ink/80">{name}</span>
          </div>
        } />
    </motion.div>
  );
}
