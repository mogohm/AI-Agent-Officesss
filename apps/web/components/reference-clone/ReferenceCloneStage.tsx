"use client";
/* eslint-disable @next/next/no-img-element */
// STATIC visual clone of the approved reference (references/ai-agent-office-reference.png).
// Geometry comes from docs/REFERENCE_PIXEL_MEASUREMENTS.md (programmatically measured):
//   canvas 1672×941 · left 24.3% · center 32.3% · right 41% · bottom strip 16.6%
//   NO global header — brand lives inside the left column.
// This stage is intentionally STATIC (no data wiring) and uses NO dark-theme assets.
// It is the visual-match gate before production integration.

// ---------- palette (sampled from the reference) ----------
const PAGE_BG = "#0D386C";        // dark navy page field
const SKY = "#2561B3";            // center panel daytime blue
const RIGHT_BG = "#5369A2";       // right zone gutter blue
const PANEL = "#EEF3FD";          // white panel
const NAVY = "#17325C";           // headings
const LINE = "#C9D6EC";

// FINAL tower mapping (per BRIGHT TOWER FLOOR EXPANSION): our departments.
// `key` indexes FLOOR_SRC — a floor with real bright art renders it; others
// keep the CSS placeholder until their asset passes its gate.
const DEPTS = [
  { n: 6, key: "growth", name: "GROWTH", th: "แผนกการตลาด / เติบโต", c: "#D98A3D" },
  { n: 5, key: "quality", name: "QUALITY", th: "แผนกคุณภาพ", c: "#2F9BB0" },
  { n: 4, key: "game-studio", name: "GAME STUDIO", th: "เกมสตูดิโอ", c: "#D9A73D" },
  { n: 3, key: "art-design", name: "ART & DESIGN", th: "แผนกออกแบบ", c: "#C75FA4" },
  { n: 2, key: "engineering", name: "ENGINEERING", th: "แผนกวิศวกรรม", c: "#2E7BC4" },
  { n: 1, key: "product-management", name: "PRODUCT MGMT", th: "แผนกผลิตภัณฑ์", c: "#7B5BD6" },
];

const BRIGHT = "/assets/themes/reference-bright/floors";
// Passed floors only — a key appears here once its asset clears the camera gate.
const FLOOR_SRC: Record<string, string> = {
  engineering: `${BRIGHT}/engineering-floor.webp`,
  "product-management": `${BRIGHT}/product-management-floor.webp`,
  growth: `${BRIGHT}/growth-floor.webp`,
  "art-design": `${BRIGHT}/art-design-floor.webp`,
  quality: `${BRIGHT}/quality-floor.webp`,
  "game-studio": `${BRIGHT}/game-studio-floor.webp`,
};
// object-position focal per floor (tuned after closeup review)
const FLOOR_FOCAL: Record<string, string> = {
  engineering: "50% 62%",
  "product-management": "50% 55%",
};

const COMPANIES = [
  { name: "COMPANY A", sub: "AI Solutions Co., Ltd.", depts: "6 แผนก", c: "#3E70C9", active: true },
  { name: "COMPANY B", sub: "DataCraft Co., Ltd.", depts: "8 แผนก", c: "#3E9E5F", active: false },
  { name: "COMPANY C", sub: "Creative Minds Co., Ltd.", depts: "5 แผนก", c: "#C75FA4", active: false },
  { name: "COMPANY D", sub: "NextGen Tech Co., Ltd.", depts: "7 แผนก", c: "#4A5A78", active: false },
];

const SCENES = [
  { name: "Marketing", bubble: "วิเคราะห์แคมเปญ", c: "#B58ADF" },
  { name: "Sales", bubble: "ติดตามลูกค้า", c: "#7FA9E8" },
  { name: "HR", bubble: "สัมภาษณ์งาน", c: "#E89A9A" },
  { name: "IT / Dev", bubble: "เขียนโค้ด", c: "#79B6E8" },
  { name: "Design", bubble: "ออกแบบ UI", c: "#E8BE7F" },
];

function Px({ children, size = 13, color = "#fff" }: { children: React.ReactNode; size?: number; color?: string }) {
  return <span className="font-pixel" style={{ fontSize: size, color, lineHeight: 1.25 }}>{children}</span>;
}

// tiny chibi worker (pure CSS): head + body + desk glow
function Chibi({ c = "#3B4C6B", x, y, s = 1 }: { c?: string; x: number | string; y: number; s?: number }) {
  return (
    <div className="absolute" style={{ left: x, top: y, transform: `scale(${s})`, transformOrigin: "bottom center" }}>
      <div className="mx-auto h-[10px] w-[10px] rounded-full" style={{ background: "#F2C9A0" }} />
      <div className="mx-auto -mt-[1px] h-[3px] w-[12px] rounded-t-full" style={{ background: "#2B2B33" }} />
      <div className="mx-auto h-[11px] w-[14px] rounded-[3px]" style={{ background: c }} />
    </div>
  );
}

// a warm-lit cutaway floor interior (bright, daytime — NOT the dark assets)
function FloorInterior({ tint, i }: { tint: string; i: number }) {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: `linear-gradient(180deg, #FDF6E8 0%, #F4E7CE 55%, ${tint}33 100%)` }}>
      {/* back wall + windows */}
      <div className="absolute inset-x-0 top-0 h-[46%]" style={{ background: `linear-gradient(180deg, ${tint}2E, #F7EEDD)` }}>
        <div className="absolute left-2 right-2 top-1 flex h-[62%] gap-1.5">
          {Array.from({ length: 5 }).map((_, j) => (
            <div key={j} className="flex-1 rounded-[2px]" style={{ background: "linear-gradient(180deg,#BFDBF7,#9CC4EE)", boxShadow: "inset 0 0 0 1px #7FA6D9" }} />
          ))}
        </div>
      </div>
      {/* floor */}
      <div className="absolute inset-x-0 bottom-0 h-[54%]" style={{ background: "linear-gradient(180deg,#E9D9BC,#D9C6A4)" }} />
      {/* desks */}
      {[14, 40, 66].map((l, j) => (
        <div key={j} className="absolute bottom-[12%]" style={{ left: `${l}%`, width: "16%", height: "26%" }}>
          <div className="absolute inset-x-0 bottom-0 h-[55%] rounded-[2px]" style={{ background: "#B98E5A", boxShadow: "inset 0 2px 0 #D3A96F" }} />
          <div className="absolute left-1/4 top-0 h-[50%] w-1/2 rounded-[2px]" style={{ background: "#28466F", boxShadow: `0 0 6px ${tint}` }} />
        </div>
      ))}
      <Chibi x={`${12 + (i % 3) * 4}%`} y={26} c={DEPTS[i % 6].c} />
      <Chibi x="42%" y={30} c="#5B7291" />
      <Chibi x="70%" y={24} c={DEPTS[(i + 2) % 6].c} />
      <Chibi x="87%" y={28} c="#7B5BD6" s={0.9} />
      {/* plants */}
      <div className="absolute bottom-[10%] left-[4%] h-[26%] w-[5%] rounded-t-full" style={{ background: "#5FA870" }} />
      <div className="absolute bottom-[10%] right-[4%] h-[22%] w-[5%] rounded-t-full" style={{ background: "#5FA870" }} />
    </div>
  );
}

// small vertical tower for company cards
function MiniTower({ c, active }: { c: string; active: boolean }) {
  return (
    <div className="relative mx-auto h-full w-[74%]">
      <div className="absolute inset-x-0 top-1 h-2 rounded-t-[3px]" style={{ background: "#5FA870" }} />
      <div className="absolute inset-x-0 top-2.5 bottom-2" style={{ background: `linear-gradient(180deg, ${c}, ${c}CC)`, boxShadow: active ? "0 0 10px #FFD98A" : "none" }}>
        <div className="grid h-full grid-cols-3 gap-[2px] p-[3px]">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} style={{ background: i % 4 === 0 ? "#1E3355" : "#FFD98A", borderRadius: 1 }} />
          ))}
        </div>
      </div>
      <div className="absolute inset-x-2 bottom-0 h-2" style={{ background: "#22375C" }} />
    </div>
  );
}

const ENG_VARIANTS: Record<string, string> = {
  v1: "/assets/themes/reference-bright/floors/archive/engineering-floor-v1-frontal.webp",
  v2: "/assets/themes/reference-bright/floors/engineering-floor-v2-isometric.webp",
  v3: "/assets/themes/reference-bright/floors/engineering-floor-v3-reference-crop.webp",
  locked: "/assets/themes/reference-bright/floors/engineering-floor.webp",
};

const BRIGHT_CHARS = "/assets/themes/reference-bright/characters/engineering";
const BRIGHT_FE = `${BRIGHT_CHARS}/frontend-developer-idle.webp`;

// Approved Engineering trio (idle masters). Identity scale × subtle depth
// factor (front 100%, deeper 98%, mid 97%) — never a straight lineup.
const TRIO = [
  { id: "fe", src: BRIGHT_FE, left: "17%", bottom: "4%", scale: 0.56 * 1.0, z: 3, flip: false },
  { id: "be", src: `${BRIGHT_CHARS}/backend-developer-idle.webp`, left: "50%", bottom: "5.5%", scale: 0.58 * 0.98, z: 4, flip: false },
  { id: "sa", src: `${BRIGHT_CHARS}/system-analyst-idle.webp`, left: "81%", bottom: "6%", scale: 0.52 * 0.97, z: 3, flip: false },
];

export function ReferenceCloneStage({
  eng = "locked", real, char = false, charScale = 0.56, workers = "off", shadow = false,
}: {
  eng?: string; real?: string[]; char?: boolean; charScale?: number;
  workers?: "off" | "fe" | "trio"; shadow?: boolean;
}) {
  // back-compat: old ?char=on behaves like workers="fe"
  const workerMode = workers !== "off" ? workers : char ? "fe" : "off";
  const activeTrio = workerMode === "trio" ? TRIO : workerMode === "fe"
    ? TRIO.filter((t) => t.id === "fe").map((t) => ({ ...t, scale: charScale }))
    : [];
  const engSrc = ENG_VARIANTS[eng] ?? ENG_VARIANTS.locked;
  // `real` (progression control): which floors show real art; default = all passed.
  const enabled = new Set(real ?? Object.keys(FLOOR_SRC));
  const srcFor = (key: string): string | undefined => {
    if (!enabled.has(key)) return undefined;
    if (key === "engineering") return engSrc;
    return FLOOR_SRC[key];
  };
  return (
    <div id="clone-stage" className="relative overflow-hidden" style={{ width: 1672, height: 941, background: PAGE_BG, fontFamily: "var(--font-body, sans-serif)" }}>
      {/* faint night-city texture on page field */}
      <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(60% 40% at 50% 110%, #1A5090 0%, transparent 70%)" }} />

      {/* ============ LEFT COLUMN — x10 w406 ============ */}
      <div className="absolute overflow-hidden rounded-[10px]" style={{ left: 10, top: 11, width: 406, height: 759, background: "linear-gradient(180deg,#122B52 0%, #16345E 60%, #1B4070 100%)", boxShadow: "inset 0 0 0 2px #2C4E80" }}>
        {/* brand */}
        <div className="flex items-center gap-3 px-4 pt-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg" style={{ background: "linear-gradient(180deg,#3E70C9,#2B5091)", boxShadow: "inset 0 0 0 2px #6E96D6" }}>
            <span className="text-2xl">🤖</span>
          </div>
          <div>
            <Px size={25}>AI AGENT OFFICE</Px>
            <div className="text-[12px] text-[#AFC6E8]">Smart Work, Better Results</div>
          </div>
        </div>
        {/* section title */}
        <div className="mx-4 mt-7 flex items-center gap-2 border-b border-[#2C4E80] pb-3">
          <span className="grid h-7 w-7 place-items-center rounded bg-[#2E5EA8] text-base">🏢</span>
          <div>
            <div className="text-[17px] font-bold text-white">หน้ารวมบริษัท</div>
            <div className="text-[11px] text-[#AFC6E8]">1 ตึก = 1 บริษัท</div>
          </div>
        </div>
        <div className="mx-4 mt-3 text-[11px] text-[#AFC6E8]">เลือกบริษัทที่ต้องการจัดการ</div>
        {/* 2×2 company cards — measured: image band y245-359 (114px), label 359-441, row pitch 255 */}
        <div className="mx-4 mt-3 grid grid-cols-2 gap-x-3 gap-y-[56px]">
          {COMPANIES.map((co) => (
            <div key={co.name} className="overflow-hidden rounded-[8px]" style={{ background: "#10264A", boxShadow: co.active ? "0 0 0 2px #F5C25B, 0 0 14px #F5C25B66" : "inset 0 0 0 1.5px #2C4E80" }}>
              <div className="relative h-[114px]" style={{ background: "linear-gradient(180deg,#1C3E6E,#274E85)" }}>
                <MiniTower c={co.c} active={co.active} />
                {co.active ? <span className="absolute bottom-1 right-1 text-base">🖱️</span> : null}
              </div>
              {/* white label footer (as measured in the reference) */}
              <div className="bg-white px-2 py-1.5">
                <div className="text-[12.5px] font-bold" style={{ color: NAVY }}>{co.name}</div>
                <div className="truncate text-[9.5px] text-[#526987]">{co.sub}</div>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[9.5px] text-[#526987]">👥 {co.depts}</span>
                  <span className="rounded-[4px] px-2 py-0.5 text-[9.5px] font-bold text-white" style={{ background: "#2F66B3" }}>เปิดดู</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* night city silhouette */}
        <div className="absolute inset-x-0 bottom-0 h-16" style={{ background: "linear-gradient(180deg, transparent, #0B1E3E)" }}>
          <div className="absolute bottom-0 left-3 h-9 w-7 bg-[#152C52]" /><div className="absolute bottom-0 left-12 h-12 w-8 bg-[#12274A]" />
          <div className="absolute bottom-0 left-24 h-7 w-6 bg-[#152C52]" /><div className="absolute bottom-0 right-6 h-10 w-9 bg-[#12274A]" />
          <div className="absolute bottom-0 right-20 h-6 w-7 bg-[#152C52]" />
        </div>
      </div>

      {/* ============ CENTER COLUMN — x420 w540 ============ */}
      <div className="absolute overflow-hidden rounded-[10px]" style={{ left: 420, top: 11, width: 540, height: 759, background: `linear-gradient(180deg, ${SKY} 0%, #2E6FC4 55%, #3B7ED2 100%)`, boxShadow: "inset 0 0 0 3px #17427F" }}>
        {/* clouds */}
        <div className="absolute left-8 top-14 h-4 w-16 rounded-full bg-white/50" />
        <div className="absolute right-10 top-24 h-3 w-12 rounded-full bg-white/40" />
        {/* title row */}
        <div className="relative flex items-start justify-between px-3 pt-2.5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md font-pixel text-[13px] text-white" style={{ background: "#1A4CA7", boxShadow: "inset 0 0 0 2px #4E7FD0" }}>2</span>
            <div>
              <Px size={15}>บริษัทที่เลือก: COMPANY A</Px>
              <div className="text-[10.5px] text-[#CFE0F7]">คลิกชั้นเพื่อจัดการแผนก</div>
            </div>
          </div>
          <div className="rounded-md px-2 py-1 text-[10.5px] font-bold text-[#17325C]" style={{ background: "#F5C25B", boxShadow: "inset 0 0 0 1.5px #B8862E" }}>สูงสุด 15 แผนก / 15 ชั้น</div>
        </div>

        {/* ===== ReferenceTowerScene (static shell + bright interiors) =====
            measured: building fills the panel — bbox ≈ panel-local x4..532, y9..700 */}
        <div className="absolute" style={{ left: 92, top: 46, width: 440, height: 656 }}>
          {/* rooftop garden */}
          <div className="absolute -top-1 left-6 right-10 h-9 rounded-t-[6px]" style={{ background: "linear-gradient(180deg,#4C86C9,#38699F)", boxShadow: "inset 0 0 0 2px #6FA0DC" }}>
            <div className="absolute -top-2 left-4 h-4 w-4 rounded-full bg-[#5FA870]" />
            <div className="absolute -top-3 left-10 h-5 w-4 rounded-full bg-[#4C9860]" />
            <div className="absolute -top-2 right-8 h-4 w-4 rounded-full bg-[#5FA870]" />
            <div className="absolute right-3 top-1 h-6 w-3 rounded-sm bg-[#8FA6C6]" />
            <div className="mx-auto mt-2 w-fit rounded-sm bg-[#17325C] px-2 py-0.5"><Px size={9}>AI OFFICE</Px></div>
          </div>
          {/* glass right-side depth wall */}
          <div className="absolute -right-1 top-8 bottom-6 w-11" style={{ background: "linear-gradient(180deg,#7FB3E6AA,#5E93CFAA)", clipPath: "polygon(0 0, 100% 6%, 100% 94%, 0 100%)", boxShadow: "inset 0 0 0 2px #A9CBEE" }}>
            {Array.from({ length: 7 }).map((_, i) => <div key={i} className="absolute inset-x-1 h-px bg-[#A9CBEE]" style={{ top: `${8 + i * 13}%` }} />)}
          </div>
          {/* left structural column */}
          <div className="absolute -left-1 top-8 bottom-6 w-3 rounded-l-[3px]" style={{ background: "linear-gradient(180deg,#436FA8,#2E5583)" }} />
          {/* floors: 6 cutaways, pitch ~88px.
              IT/DEV (n=3) uses the REAL bright Engineering test asset
              (assets/themes/reference-bright) — the other floors stay placeholders. */}
          <div className="absolute left-2 right-10 top-8 bottom-6 flex flex-col overflow-hidden rounded-b-[4px]" style={{ boxShadow: "0 6px 18px rgba(0,0,0,.28)" }}>
            {DEPTS.map((d, i) => {
              const src = srcFor(d.key);
              return (
                <div key={d.n} className="relative flex-1" style={{ borderBottom: "3px solid #24466F" }}>
                  {src ? (
                    <img src={src} alt={`${d.name} (bright)`}
                      className="pixelated absolute inset-0 h-full w-full object-cover"
                      style={{ objectPosition: FLOOR_FOCAL[d.key] ?? "50% 58%" }} />
                  ) : (
                    <FloorInterior tint={d.c} i={i} />
                  )}
                  {/* Bright Engineering workers (lab-only, not production) */}
                  {d.key === "engineering" ? activeTrio.map((t) => (
                    <div key={t.id} className="absolute" style={{ left: t.left, bottom: t.bottom, height: `${t.scale * 100}%`, zIndex: t.z }}>
                      {shadow ? (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-[50%] blur-[2px]"
                          style={{ width: `${t.scale * 62}px`, height: 7, background: "rgba(20,32,52,0.22)" }} />
                      ) : null}
                      <img src={t.src} alt={t.id} className="pixelated relative h-full w-auto"
                        style={t.flip ? { transform: "scaleX(-1)" } : undefined} />
                    </div>
                  )) : null}
                  {/* balcony rail */}
                  <div className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: "#38618F" }} />
                </div>
              );
            })}
          </div>
          {/* B1 */}
          <div className="absolute bottom-0 left-2 right-10 h-9 overflow-hidden rounded-b-[6px]" style={{ background: "linear-gradient(180deg,#20395F,#182C4C)", boxShadow: "inset 0 0 0 2px #33547F" }}>
            <div className="absolute left-3 top-1.5 flex gap-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 w-3 rounded-[2px] bg-[#101F3A]" style={{ boxShadow: "inset 0 0 0 1px #3E6392" }}>
                  <div className="mx-auto mt-1 h-1 w-1 rounded-full bg-[#59D1A8]" />
                </div>
              ))}
            </div>
            <span className="absolute left-1/2 top-1 -translate-x-1/2 text-lg">☁️</span>
            <Chibi x={250} y={6} c="#3E6392" s={0.9} />
          </div>
        </div>

        {/* floor tabs — measured pitch ~88px, first tab at panel-local y≈154 */}
        <div className="absolute left-2 top-[150px] flex flex-col gap-[44px]">
          {DEPTS.map((d) => (
            <div key={d.n} className="w-[86px] rounded-[6px] px-1.5 py-1" style={{ background: d.c, boxShadow: "inset 0 0 0 2px rgba(255,255,255,.35), 0 2px 6px rgba(0,0,0,.3)" }}>
              <div className="flex items-center gap-1">
                <span className="grid h-4.5 w-4.5 place-items-center rounded bg-white/30 font-pixel text-[10px] text-white" style={{ width: 18, height: 18 }}>{d.n}</span>
                <span className="text-[8.5px] font-bold leading-none text-white">{d.name}</span>
              </div>
              <div className="mt-0.5 text-[7px] leading-none text-white/85">{d.th}</div>
            </div>
          ))}
          <div className="w-[86px] rounded-[6px] px-1.5 py-1" style={{ background: "#22375C", boxShadow: "inset 0 0 0 2px rgba(255,255,255,.25)" }}>
            <div className="flex items-center gap-1"><span className="font-pixel text-[10px] text-white">B1</span><span className="text-[8.5px] font-bold text-white">VPS / SERVER</span></div>
            <div className="mt-0.5 text-[7px] text-white/80">โครงสร้างพื้นฐาน</div>
          </div>
        </div>

        {/* bottom project chips */}
        <div className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-[8px] px-2 py-1.5" style={{ background: "#17427FCC" }}>
          <span className="text-sm">⭐</span>
          <span className="text-[10px] text-white">แต่ละบริษัทมีหลายโปรเจกต์</span>
          {["Project Alpha", "Project Beta", "Project Gamma"].map((p) => (
            <span key={p} className="rounded-[5px] bg-[#0F2C55] px-2 py-1 text-[10px] font-bold text-white" style={{ boxShadow: "inset 0 0 0 1px #3E6392" }}>{p}</span>
          ))}
          <span className="rounded-[5px] bg-[#F5C25B] px-2 py-1 text-[10px] font-bold text-[#17325C]">+ เพิ่มโปรเจกต์</span>
        </div>
      </div>

      {/* ============ RIGHT COLUMN — x976 w686 ============ */}
      <div className="absolute rounded-[10px]" style={{ left: 976, top: 11, width: 686, height: 759, background: `linear-gradient(180deg, ${RIGHT_BG}, #4A5F97)`, boxShadow: "inset 0 0 0 2px #6C81B5", padding: 8 }}>
        {/* 3 Department Management — y43-169 h126 */}
        <div className="rounded-[8px] p-2.5" style={{ background: PANEL, height: 152 }}>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md font-pixel text-[12px] text-white" style={{ background: "#3E9E5F" }}>3</span>
            <div>
              <div className="text-[14px] font-bold" style={{ color: NAVY }}>Department Management</div>
              <div className="text-[10px] text-[#526987]">เพิ่ม / แก้ไข / ลบ แผนก</div>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <div className="flex flex-1 gap-2">
              {[{ t: "เพิ่มแผนก", i: "➕", c: "#3E9E5F" }, { t: "แก้ไขแผนก", i: "✏️", c: "#2F66B3" }, { t: "ลบแผนก", i: "🗑️", c: "#C94F4F" }].map((b) => (
                <div key={b.t} className="flex flex-1 flex-col items-center justify-center gap-1 rounded-[7px] py-2" style={{ background: `${b.c}14`, boxShadow: `inset 0 0 0 1.5px ${b.c}55` }}>
                  <span className="text-xl">{b.i}</span>
                  <span className="text-[10px] font-bold" style={{ color: b.c }}>{b.t}</span>
                </div>
              ))}
            </div>
            <div className="w-[210px] rounded-[7px] p-1.5" style={{ background: "#F7FAFE", boxShadow: `inset 0 0 0 1px ${LINE}` }}>
              <div className="mb-0.5 text-[9px] font-bold text-[#526987]">ตัวอย่างแผนก</div>
              {["Marketing", "Sales", "HR", "IT / Dev", "Design / Meeting", "Lobby / Support"].map((d) => (
                <div key={d} className="flex items-center justify-between text-[9px] leading-[13px] text-[#17325C]"><span>{d}</span><span className="text-[8px]">✏️ 🗑️</span></div>
              ))}
            </div>
          </div>
        </div>

        {/* 4 Job Description | 5 AI Model — measured y200-358 */}
        <div className="mt-6 flex gap-2" style={{ height: 185 }}>
          <div className="w-[43%] rounded-[8px] p-2.5" style={{ background: PANEL }}>
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md font-pixel text-[12px] text-white" style={{ background: "#7B5BD6" }}>4</span>
              <div>
                <div className="text-[13px] font-bold" style={{ color: NAVY }}>Job Description</div>
                <div className="text-[9.5px] text-[#526987]">แก้ไขหน้าที่การทำงาน</div>
              </div>
            </div>
            <div className="mt-1.5 flex gap-1.5">
              <span className="text-xl">🧑‍💻</span>
              <div className="flex-1 rounded-[6px] p-1.5" style={{ background: "#F7FAFE", boxShadow: `inset 0 0 0 1px ${LINE}` }}>
                <div className="text-[9px] font-bold text-[#17325C]">Job Description (ตัวอย่าง: IT / Dev)</div>
                <ul className="mt-0.5 space-y-px text-[8.5px] text-[#3D5578]">
                  <li>• พัฒนาและบำรุงรักษาแอปพลิเคชัน</li>
                  <li>• ออกแบบฐานข้อมูลและ API</li>
                  <li>• แก้ไขบั๊กและปรับปรุงระบบ</li>
                  <li>• ทำงานร่วมกับทีมอื่น</li>
                </ul>
              </div>
            </div>
            <div className="mt-1.5 w-fit rounded-[6px] px-2 py-1 text-[9.5px] font-bold text-white" style={{ background: "#2F66B3" }}>บันทึกการเปลี่ยนแปลง</div>
          </div>
          <div className="flex-1 rounded-[8px] p-2.5" style={{ background: PANEL }}>
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md font-pixel text-[12px] text-white" style={{ background: "#2F9BB0" }}>5</span>
              <div>
                <div className="text-[13px] font-bold" style={{ color: NAVY }}>AI Model Selection</div>
                <div className="text-[9.5px] text-[#526987]">เลือกโมเดล AI ที่ใช้ในแผนก</div>
              </div>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {[{ n: "GPT (OpenAI)", d: "เหมาะกับ Writing", i: "🤖", on: true }, { n: "Claude (Anthropic)", d: "เหมาะกับ Analysis", i: "🧠", on: false },
                { n: "Gemini (Google)", d: "เหมาะกับ Analysis", i: "✨", on: false }, { n: "Local LLM", d: "เหมาะกับ Coding", i: "🖥️", on: false }].map((m) => (
                <div key={m.n} className="flex items-center gap-1.5 rounded-[6px] px-1.5 py-1" style={{ background: "#F7FAFE", boxShadow: m.on ? "inset 0 0 0 2px #2F66B3" : `inset 0 0 0 1px ${LINE}` }}>
                  <span className="text-sm">{m.i}</span>
                  <div className="min-w-0 flex-1"><div className="text-[9px] font-bold text-[#17325C]">{m.n}</div><div className="text-[8px] text-[#526987]">{m.d}</div></div>
                  <span className="grid h-3 w-3 place-items-center rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${m.on ? "#2F66B3" : LINE}` }}>{m.on ? <span className="h-1.5 w-1.5 rounded-full bg-[#2F66B3]" /> : null}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 rounded-[6px] px-1.5 py-1" style={{ background: "#F7FAFE", boxShadow: `inset 0 0 0 1px ${LINE}` }}>
                <span className="text-sm">🎨</span><div className="text-[9px] font-bold text-[#17325C]">Image AI<div className="text-[8px] font-normal text-[#526987]">เหมาะกับ Design</div></div>
              </div>
              <div className="rounded-[6px] px-1.5 py-1 text-[8px] leading-[11px] text-[#3D5578]" style={{ background: "#FDF6E3", boxShadow: "inset 0 0 0 1px #E8D9A8" }}>
                <b>🤖 AI Recommendation</b> สำหรับแผนก IT / Dev แนะนำใช้ GPT / Claude ร่วมกับ Local LLM
              </div>
            </div>
          </div>
        </div>

        {/* 6 Projects — measured y381-632 (h≈251) */}
        <div className="mt-3 rounded-[8px] p-2.5" style={{ background: PANEL, height: 240 }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md font-pixel text-[12px] text-white" style={{ background: "#D98A3D" }}>6</span>
              <div>
                <div className="text-[14px] font-bold" style={{ color: NAVY }}>Projects</div>
                <div className="text-[10px] text-[#526987]">สร้าง / แก้ไข / ลบ / เปิดดูโปรเจกต์</div>
              </div>
            </div>
            <span className="rounded-[6px] px-2.5 py-1.5 text-[10px] font-bold text-white" style={{ background: "#2F66B3" }}>+ สร้างโปรเจกต์</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[{ n: "Project Alpha", d: "ระบบแชท AI สำหรับลูกค้า", s: "Active", c: "#3E9E5F", dt: "10 พ.ค. 67" },
              { n: "Project Beta", d: "AI Data Analysis Dashboard", s: "Active", c: "#3E9E5F", dt: "05 พ.ค. 67" },
              { n: "Project Gamma", d: "AI Content Generator", s: "Draft", c: "#8896B3", dt: "01 พ.ค. 67" }].map((p) => (
              <div key={p.n} className="rounded-[7px] p-1.5" style={{ background: "#F7FAFE", boxShadow: `inset 0 0 0 1px ${LINE}` }}>
                <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-[#17325C]">{p.n}</span>
                  <span className="rounded-full px-1.5 text-[8px] font-bold text-white" style={{ background: p.c }}>{p.s}</span></div>
                <div className="mt-0.5 text-[8.5px] text-[#526987]">{p.d}</div>
                <div className="mt-1 flex items-center justify-between text-[8px] text-[#8896B3]"><span>สร้าง: {p.dt}</span><span>✏️ 🗑️ ↗️</span></div>
              </div>
            ))}
            <div className="rounded-[7px] p-1.5" style={{ background: "#F7FAFE", boxShadow: `inset 0 0 0 1px ${LINE}` }}>
              <div className="flex items-center justify-between"><span className="text-[10px] font-bold text-[#17325C]">Project Delta</span>
                <span className="rounded-full bg-[#8896B3] px-1.5 text-[8px] font-bold text-white">Archived</span></div>
              <div className="mt-0.5 text-[8.5px] text-[#526987]">Internal HR Assistant</div>
              <div className="mt-1 flex items-center justify-between text-[8px] text-[#8896B3]"><span>สร้าง: 20 เม.ย. 67</span><span>✏️ 🗑️</span></div>
            </div>
          </div>
        </div>

        {/* 7 VPS Workspace — measured y640-765 */}
        <div className="mt-3 rounded-[8px] p-2.5" style={{ background: PANEL, height: 128 }}>
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-md font-pixel text-[12px] text-white" style={{ background: "#2F66B3" }}>7</span>
            <div>
              <div className="text-[14px] font-bold" style={{ color: NAVY }}>VPS Workspace</div>
              <div className="text-[10px] text-[#526987]">รันงานทั้งหมดบน VPS</div>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex flex-1 items-center justify-between rounded-[7px] px-3 py-2" style={{ background: "#F7FAFE", boxShadow: `inset 0 0 0 1px ${LINE}` }}>
              {[["🖥️", "Web Platform"], ["", "→"], ["☁️", "VPS Cloud"], ["", "→"], ["🗄️", "Compute Nodes"], ["", "→"], ["💾", "Storage"]].map(([i, t], k) => (
                <div key={k} className="flex flex-col items-center text-[9px] font-bold text-[#17325C]">
                  {i ? <span className="text-xl">{i}</span> : null}<span className={i ? "" : "text-base text-[#2F66B3]"}>{t}</span>
                  {t === "VPS Cloud" ? <span className="text-[7.5px] font-normal text-[#526987]">Secure · Fast · Scalable</span> : null}
                </div>
              ))}
            </div>
            <div className="w-[190px] space-y-0.5 text-[8.5px] text-[#3D5578]">
              {["แยกสภาพแวดล้อมต่อโปรเจกต์", "ปลอดภัยและเป็นส่วนตัว", "ปรับขนาดตามการใช้งาน", "รันงาน 24/7 ไม่สะดุด"].map((t) => <div key={t}>✅ {t}</div>)}
            </div>
          </div>
        </div>
      </div>

      {/* ============ BOTTOM STRIP — y775 h156 ============ */}
      <div className="absolute flex gap-1.5 overflow-hidden rounded-[10px] p-1.5" style={{ left: 10, top: 775, width: 1652, height: 156, background: "linear-gradient(180deg,#122B52,#16345E)", boxShadow: "inset 0 0 0 2px #2C4E80" }}>
        <div className="flex w-[128px] shrink-0 flex-col justify-center px-2">
          <div className="flex items-center gap-1.5"><span className="grid h-5 w-5 place-items-center rounded bg-[#2E5EA8] font-pixel text-[10px] text-white">8</span>
            <span className="text-[13px] font-bold text-white">AI Workers ;</span></div>
          <div className="mt-1 text-[8.5px] leading-[12px] text-[#AFC6E8]">พนักงาน AI มีชีวิตชีวา ทำงานตามบทบาทของแผนก และผ่อนคลายเมื่อว่าง</div>
        </div>
        {SCENES.map((s, i) => (
          <div key={s.name} className="relative min-w-0 flex-1 overflow-hidden rounded-[7px]" style={{ boxShadow: "inset 0 0 0 1.5px #2C4E80" }}>
            <FloorInterior tint={s.c} i={i} />
            <div className="absolute left-1 top-1 rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#17325CCC" }}>{s.name}</div>
            <div className="absolute right-1 top-1 rounded-full bg-white px-1.5 py-0.5 text-[8px] font-bold text-[#17325C]" style={{ boxShadow: `0 0 0 1.5px ${s.c}` }}>{s.bubble}</div>
          </div>
        ))}
        {/* Idle Time — wider, lounge */}
        <div className="relative w-[300px] shrink-0 overflow-hidden rounded-[7px]" style={{ boxShadow: "inset 0 0 0 1.5px #2C4E80" }}>
          <div className="h-full w-full" style={{ background: "linear-gradient(180deg,#FDF3E0,#F2DDB8)" }}>
            <div className="absolute inset-x-0 top-0 h-[42%]" style={{ background: "linear-gradient(180deg,#CFE4F9,#F7EEDD)" }} />
            <div className="absolute bottom-[12%] left-[8%] h-[30%] w-[24%] rounded-[5px] bg-[#B77FD9]" />
            <div className="absolute bottom-[14%] right-[10%] h-[24%] w-[10%] rounded-t-full bg-[#5FA870]" />
            <Chibi x={60} y={70} c="#C94F4F" /><Chibi x={130} y={76} c="#2F66B3" /><Chibi x={200} y={72} c="#7B5BD6" />
            {[["ดื่มกาแฟ ☕", 22], ["อ่านหนังสือ 📖", 108], ["เล่นเกม 🎮", 192]].map(([t, l]) => (
              <div key={t as string} className="absolute top-6 rounded-full bg-white px-1.5 py-0.5 text-[8px] font-bold text-[#17325C]" style={{ left: l as number, boxShadow: "0 0 0 1.5px #F5C25B" }}>{t}</div>
            ))}
          </div>
          <div className="absolute left-1 top-1 rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ background: "#17325CCC" }}>Idle Time</div>
        </div>
      </div>
    </div>
  );
}
