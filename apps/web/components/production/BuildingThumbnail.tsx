"use client";
// A 2.5D isometric building thumbnail (1 building = 1 company) — front facade +
// receding right side + roof with greenery, in the bright reference style.
// Deterministic lit-window pattern so SSR and client match. No emoji, no art.

export function BuildingThumbnail({
  color = "#2F66B3", floors = 5, seed = 1, className = "",
}: { color?: string; floors?: number; seed?: number; className?: string }) {
  const rows = Math.min(9, Math.max(3, floors));
  const cols = 3;
  const rowH = 13;

  // Geometry (px) — a PORTRAIT tower: narrow front face W×bodyH, receding depth
  // d up-right by r, a roof on top and a foundation/B1 plinth at the base.
  const W = 60;
  const d = 22;
  const r = 15;
  const bodyH = rows * rowH;
  const topBody = r + 8;
  const baseY = topBody + bodyH;
  const foundH = 9;                 // B1 / ground plinth
  const stageW = W + d + 6;
  const stageH = baseY + foundH + 6;

  const lit = (i: number) => ((i * 7 + seed * 3) % 5) !== 0;

  // Polygons in stage coordinates.
  const side = `${W}px ${topBody}px, ${W + d}px ${topBody - r}px, ${W + d}px ${baseY - r}px, ${W}px ${baseY}px`;
  const roof = `0px ${topBody}px, ${W}px ${topBody}px, ${W + d}px ${topBody - r}px, ${d}px ${topBody - r}px`;

  return (
    <div className={`relative flex h-full w-full items-end justify-center ${className}`}>
      {/* ground shadow */}
      <div className="absolute bottom-2 h-2.5 w-3/5 rounded-[50%] blur-md" style={{ background: `${color}44` }} />

      <div className="relative" style={{ width: stageW, height: stageH }}>
        {/* ROOF top face + greenery */}
        <div className="absolute inset-0" style={{ clipPath: `polygon(${roof})`, background: `linear-gradient(135deg, ${color}, ${shade(color, -18)})` }} />
        {[0, 1, 2].map((i) => (
          <span key={i} className="absolute rounded-full"
            style={{ width: 5, height: 4, left: d + 6 + i * 15, top: topBody - r + 2, background: "#4FB37A", boxShadow: "0 1px 0 rgba(0,0,0,.15)" }} />
        ))}

        {/* SIDE face (darker, receding) */}
        <div className="absolute inset-0" style={{ clipPath: `polygon(${side})`, background: `linear-gradient(180deg, ${shade(color, -30)}, ${shade(color, -46)})` }}>
          {/* subtle side window strips */}
          {Array.from({ length: rows }).map((_, i) => (
            <span key={i} className="absolute" style={{ left: W + 10, top: topBody - r * (i / rows) + i * rowH + 3, width: d - 14, height: 5, background: "#FFD98A55", transform: "skewY(-20deg)" }} />
          ))}
        </div>

        {/* FRONT facade */}
        <div className="absolute overflow-hidden rounded-t-[3px]"
          style={{ left: 0, top: topBody, width: W, height: bodyH, background: `linear-gradient(180deg, ${shade(color, -8)}, ${shade(color, -22)})`, boxShadow: `inset 0 0 0 1px ${shade(color, 20)}66` }}>
          <div className="grid h-full w-full gap-[2px] p-[4px]" style={{ gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)` }}>
            {Array.from({ length: rows * cols }).map((_, i) => (
              <div key={i} className={lit(i) ? "animate-flicker" : ""}
                style={{ borderRadius: 1.5, background: lit(i) ? "#FFD98A" : "#12203a", boxShadow: lit(i) ? "0 0 4px rgba(255,217,138,.55)" : "none", animationDelay: `${(i % 5) * 0.6}s` }} />
            ))}
          </div>
        </div>

        {/* foundation / B1 plinth (front + side) */}
        <div className="absolute" style={{ left: 0, top: baseY, width: W, height: foundH, background: `linear-gradient(180deg, ${shade(color, -40)}, ${shade(color, -52)})` }} />
        <div className="absolute" style={{ clipPath: `polygon(${W}px ${baseY}px, ${W + d}px ${baseY - r}px, ${W + d}px ${baseY - r + foundH}px, ${W}px ${baseY + foundH}px)`, inset: 0, background: shade(color, -56) }} />
        {/* entrance */}
        <div className="absolute rounded-t-sm" style={{ left: W / 2 - 7, top: baseY - 8, width: 14, height: 8 + foundH, background: shade(color, 18) }} />

        {/* antenna */}
        <div className="absolute" style={{ left: d + W / 2, top: topBody - r - 8, width: 1, height: 8, background: color }} />
        <div className="absolute animate-twinkle rounded-full" style={{ left: d + W / 2 - 1.5, top: topBody - r - 11, width: 4, height: 4, background: "#FF7AC6" }} />
      </div>
    </div>
  );
}

// Lighten (+) or darken (-) a hex color by percent.
function shade(hex: string, pct: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const amt = Math.round(2.55 * pct);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 0xff) + amt);
  const b = clamp((n & 0xff) + amt);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
