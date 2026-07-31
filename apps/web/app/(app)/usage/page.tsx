import { getUsageSummary } from "@/lib/data/usage";
import { PageHeader, ErrorState, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UsagePage() {
  let d;
  try { d = await getUsageSummary(); }
  catch { return (<><PageHeader title="Usage" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }

  return (
    <>
      <PageHeader title="Usage & Cost" description="ต้นทุนและ token เดือนนี้ (คำนวณจาก TaskRun จริง ไม่ใช่ค่าตายตัว)" />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-slate-400">ต้นทุนรวมเดือนนี้</div><div className="mt-1 text-2xl font-bold text-white">{formatCurrency(d.totals.totalCost, "USD")}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-slate-400">Tokens รวม</div><div className="mt-1 text-2xl font-bold text-white">{d.totals.totalTokens.toLocaleString()}</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>งบประมาณต่อบริษัท</CardTitle></CardHeader>
          <CardContent>
            {d.companies.length === 0 ? <EmptyState title="ยังไม่มีข้อมูล" /> : (
              <ul className="space-y-3">
                {d.companies.map((c) => (
                  <li key={c.id}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-200">{c.name}</span>
                      <span className={c.pct !== null && c.pct >= 90 ? "text-red-400" : "text-slate-400"}>
                        {formatCurrency(c.spent, c.currency)}{c.budget !== null ? ` / ${formatCurrency(c.budget, c.currency)}` : " (ไม่มีงบ)"}
                      </span>
                    </div>
                    {c.pct !== null ? (
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full ${c.pct >= 90 ? "bg-red-500" : c.pct >= 70 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${c.pct}%` }} />
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>

        <Card><CardHeader><CardTitle>ต้นทุนตามโมเดล</CardTitle></CardHeader>
          <CardContent>
            {d.byModel.length === 0 ? <EmptyState title="ยังไม่มีการใช้งาน" /> : (
              <ul className="space-y-1.5">
                {d.byModel.map((m) => (
                  <li key={m.model} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-300">{m.model} <span className="text-slate-500">· {m.providerType.toLowerCase()}</span></span>
                    <span className="text-slate-400">{m.tokens.toLocaleString()} tok · {formatCurrency(m.cost, "USD")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
      </div>
    </>
  );
}
