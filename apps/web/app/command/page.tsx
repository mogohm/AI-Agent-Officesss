"use client";
// Command Center — in-app natural-language command chat (Thai/English), mock intent.
import { useEffect, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useUI } from "@/lib/store";
import type { Company, CommandResult } from "@/lib/types";
import { Button, Card, Select } from "@/components/ui";

const SUGGESTIONS = [
  "สร้างบริษัทใหม่ชื่อ AI Game Studio",
  "เพิ่มแผนก Game Studio",
  "สร้างโปรเจกต์เกม idle city builder",
  "ให้ทีม Dev เริ่มสร้างโครงสร้างโปรเจกต์",
  "ให้ Design ออกแบบ UI",
  "ให้ QA ตรวจงานล่าสุด",
];

export default function CommandCenterPage() {
  const pushToast = useUI((s) => s.pushToast);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<number | undefined>(undefined);
  const [history, setHistory] = useState<CommandResult[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listCompanies().then((cs) => { setCompanies(cs); if (cs.length) setCompanyId(cs[0].id); }).catch(() => {});
    api.commandHistory().then((h) => setHistory(h.reverse())).catch(() => {});
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);

  async function send(value?: string) {
    const cmd = (value ?? text).trim();
    if (!cmd) return;
    setSending(true);
    setText("");
    try {
      const result = await api.sendCommand(cmd, companyId);
      setHistory((h) => [...h, result]);
    } catch (e) {
      pushToast(e instanceof ApiError ? e.message : "Command failed", "error");
    } finally { setSending(false); }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-3xl flex-col md:h-[calc(100vh-6rem)]">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Command Center</h1>
          <p className="text-sm text-muted">Type commands in Thai or English. Mock intent parsing for MVP.</p>
        </div>
        <Select value={companyId ?? ""} onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : undefined)} className="w-44">
          <option value="">No company</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </Select>
      </div>

      {/* Chat log */}
      <Card className="scroll-slim flex-1 overflow-y-auto p-4">
        {history.length === 0 ? (
          <div className="mt-10 text-center text-sm text-faint">พิมพ์คำสั่งด้านล่างเพื่อสั่งงานทีม AI ⚡</div>
        ) : history.map((c) => (
          <div key={c.id} className="mb-4">
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-neon px-3 py-2 text-sm text-white">{c.text}</div>
            </div>
            <div className="mt-1 flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm border border-line bg-surface px-3 py-2 text-sm text-ink">
                <span className="mr-1 rounded bg-surfaceAlt px-1.5 py-0.5 text-[10px] font-semibold text-cyan">{c.detected_intent}</span>
                {c.response}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </Card>

      {/* Suggestions */}
      <div className="scroll-slim mt-3 flex gap-2 overflow-x-auto pb-1">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => send(s)} className="whitespace-nowrap rounded-full border border-line bg-surfaceAlt px-3 py-1.5 text-xs text-muted hover:text-ink">{s}</button>
        ))}
      </div>

      {/* Composer */}
      <div className="mt-2 flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          placeholder="สั่งงานทีม เช่น 'สร้างโปรเจกต์เกม idle city builder'…"
          className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-ink outline-none placeholder:text-faint focus:border-neon"
        />
        <Button disabled={sending} onClick={() => send()}><SendHorizontal size={18} /></Button>
      </div>
    </div>
  );
}
