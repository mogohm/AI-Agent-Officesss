"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { testConnection, disableConnection, deleteConnection } from "@/app/(app)/settings/providers/actions";

type Conn = { id: string; providerType: string; displayName: string; status: string; companyId: string | null; hasKey: boolean; lastError: string | null };

const STATUS_TONE: Record<string, "green" | "red" | "neutral" | "amber"> = { CONNECTED: "green", ERROR: "red", DISABLED: "neutral", UNTESTED: "amber" };

export function ProviderConnectionCard({ conn }: { conn: Conn }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-white">{conn.displayName}</div>
            <div className="text-xs text-slate-400">{conn.providerType} · {conn.companyId ? "company" : "system"} · {conn.hasKey ? "มี API key" : "ยังไม่มี key"}</div>
          </div>
          <Badge tone={STATUS_TONE[conn.status] ?? "neutral"}>{conn.status.toLowerCase()}</Badge>
        </div>
        {conn.lastError ? <p className="mt-2 truncate text-[11px] text-red-400">{conn.lastError}</p> : null}
        {msg ? <p className="mt-2 text-[11px] text-slate-300">{msg}</p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={pending}
            onClick={() => start(async () => { const r = await testConnection(conn.id); setMsg(r.success ? `${r.data.ok ? "✅" : "❌"} ${r.data.message} (${r.data.modelCount} models)` : r.error.message); router.refresh(); })}>
            {pending ? "กำลังทดสอบ…" : "ทดสอบ"}
          </Button>
          {conn.status !== "DISABLED" ? (
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await disableConnection(conn.id); router.refresh(); })}>ปิดใช้งาน</Button>
          ) : null}
          <ConfirmButton size="sm" variant="destructive" title="ลบการเชื่อมต่อนี้?" description="ลบได้เฉพาะเมื่อไม่ถูกใช้งาน" confirmLabel="ลบ"
            onConfirm={async () => { const r = await deleteConnection(conn.id); if (!r.success) setMsg(r.error.message); router.refresh(); }}>ลบ</ConfirmButton>
        </div>
      </CardContent>
    </Card>
  );
}
