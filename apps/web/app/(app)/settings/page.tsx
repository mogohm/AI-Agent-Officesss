import Link from "next/link";
import { KeyRound, Users, ShieldAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  return (
    <>
      <PageHeader title="Settings" description={user ? `เข้าสู่ระบบเป็น ${user.email}` : undefined} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/settings/providers">
          <Card className="p-4 transition hover:bg-white/[0.03]">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/15 text-blue-300"><KeyRound className="h-5 w-5" /></span>
              <div><div className="text-sm font-semibold text-white">AI Providers</div><div className="text-xs text-slate-400">เชื่อมต่อ + คีย์ (เข้ารหัส)</div></div></div>
          </Card>
        </Link>
        <Link href="/settings/users">
          <Card className="p-4 transition hover:bg-white/[0.03]">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300"><Users className="h-5 w-5" /></span>
              <div><div className="text-sm font-semibold text-white">Users & Roles</div><div className="text-xs text-slate-400">สมาชิก + บทบาทต่อบริษัท</div></div></div>
          </Card>
        </Link>
        <Link href="/activity">
          <Card className="p-4 transition hover:bg-white/[0.03]">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-300"><ShieldAlert className="h-5 w-5" /></span>
              <div><div className="text-sm font-semibold text-white">Security & Audit</div><div className="text-xs text-slate-400">บันทึกกิจกรรมทั้งหมด (audit trail)</div></div></div>
          </Card>
        </Link>
      </div>
    </>
  );
}
