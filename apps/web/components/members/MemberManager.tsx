"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { ROLE_RANK } from "@/lib/roles";
import { COMPANY_ROLES } from "@/lib/validation/member";
import { addMemberByEmail, createUserAndAssign, updateMemberRole, removeMember } from "@/app/(app)/settings/users/actions";

type Member = { id: string; role: string; user: { id: string; name: string | null; email: string; lastLoginAt: Date | null } };
type Company = { id: string; name: string; members: Member[]; myRank: number; ownerCount: number };
type Result = { success: boolean; error?: { message: string } };

const inputCls = "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none focus:border-blue-400";

export function MemberManager({ company, currentUserId }: { company: Company; currentUserId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [mode, setMode] = useState<"none" | "existing" | "new">("none");

  // Roles this admin is allowed to assign (≤ their own rank).
  const grantable = COMPANY_ROLES.filter((r) => ROLE_RANK[r] <= company.myRank);
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => { setErr(null); const r = await fn(); if (!r.success) setErr(r.error?.message ?? "ทำรายการไม่สำเร็จ"); else { after?.(); router.refresh(); } });

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">{company.name}</h3>
        <span className="text-xs text-slate-500">{company.members.length} สมาชิก</span>
      </div>

      <ul className="space-y-2">
        {company.members.map((m) => {
          const isSelf = m.user.id === currentUserId;
          const canManage = ROLE_RANK[m.role as keyof typeof ROLE_RANK] <= company.myRank && !isSelf;
          const lastOwner = m.role === "OWNER" && company.ownerCount <= 1;
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-white/10 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm text-slate-200">{m.user.name ?? m.user.email} {isSelf ? <span className="text-[10px] text-blue-300">(คุณ)</span> : null}</div>
                <div className="truncate text-[11px] text-slate-500">{m.user.email} · {m.user.lastLoginAt ? "เคยเข้าระบบ" : "ยังไม่เข้าระบบ"}</div>
              </div>
              <div className="flex items-center gap-2">
                <select disabled={!canManage || pending} defaultValue={m.role} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 disabled:opacity-50"
                  onChange={(e) => run(() => updateMemberRole({ memberId: m.id, role: e.target.value }))}>
                  {COMPANY_ROLES.map((r) => <option key={r} value={r} disabled={ROLE_RANK[r] > company.myRank}>{r.toLowerCase()}</option>)}
                </select>
                {canManage && !lastOwner ? (
                  <ConfirmButton size="sm" variant="ghost" title="ลบสมาชิกนี้?" description={m.user.email} confirmLabel="ลบ"
                    onConfirm={async () => { await run(() => removeMember({ memberId: m.id })); }}>ลบ</ConfirmButton>
                ) : <Badge tone="neutral">{lastOwner ? "owner คนสุดท้าย" : isSelf ? "—" : "สูงกว่า"}</Badge>}
              </div>
            </li>
          );
        })}
      </ul>

      {err ? <p className="mt-2 text-xs text-red-400">{err}</p> : null}

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant={mode === "existing" ? "secondary" : "ghost"} onClick={() => setMode(mode === "existing" ? "none" : "existing")}>+ เพิ่มผู้ใช้ที่มีอยู่</Button>
        <Button size="sm" variant={mode === "new" ? "secondary" : "ghost"} onClick={() => setMode(mode === "new" ? "none" : "new")}>+ สร้างผู้ใช้ใหม่</Button>
      </div>

      {mode === "existing" ? (
        <form className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]" action={(fd) => run(
          () => addMemberByEmail({ companyId: company.id, email: String(fd.get("email")), role: String(fd.get("role")) }),
          () => setMode("none"))}>
          <input name="email" type="email" required placeholder="email@example.com" className={inputCls} />
          <select name="role" className={inputCls} defaultValue="OPERATOR">{grantable.map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}</select>
          <Button size="sm" disabled={pending} type="submit">เพิ่ม</Button>
        </form>
      ) : null}

      {mode === "new" ? (
        <form className="mt-3 grid gap-2 sm:grid-cols-2" action={(fd) => run(
          () => createUserAndAssign({ companyId: company.id, name: String(fd.get("name")), email: String(fd.get("email")), password: String(fd.get("password")), role: String(fd.get("role")) }),
          () => setMode("none"))}>
          <input name="name" required placeholder="ชื่อ-สกุล" className={inputCls} />
          <input name="email" type="email" required placeholder="email@example.com" className={inputCls} />
          <input name="password" type="password" required minLength={8} placeholder="รหัสผ่านเริ่มต้น (≥8)" className={inputCls} />
          <select name="role" className={inputCls} defaultValue="OPERATOR">{grantable.map((r) => <option key={r} value={r}>{r.toLowerCase()}</option>)}</select>
          <div className="sm:col-span-2"><Button size="sm" disabled={pending} type="submit">สร้างและเพิ่มเข้าบริษัท</Button></div>
        </form>
      ) : null}
    </div>
  );
}
