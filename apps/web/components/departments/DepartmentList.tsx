"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Settings2 } from "lucide-react";
import { reorderDepartments } from "@/app/(app)/companies/[companyId]/departments/actions";
import { Button } from "@/components/ui/button";

type Dept = { id: string; name: string; floorType: string; themeColor: string; floorOrder: number; workers: number };

export function DepartmentList({ companyId, initial, canManage }: { companyId: string; initial: Dept[]; canManage: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(initial); // top → bottom
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setError(null);
    start(async () => {
      const res = await reorderDepartments(companyId, next.map((d) => d.id));
      if (!res.success) { setError(res.error.message); setItems(items); }
      else router.refresh();
    });
  }

  return (
    <div>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      <ul className="space-y-1.5">
        {items.map((d, i) => (
          <li key={d.id} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2 py-2">
            {canManage ? (
              <div className="flex flex-col">
                <button aria-label="ย้ายขึ้น" disabled={pending || i === 0} onClick={() => move(i, -1)}
                  className="grid h-5 w-6 place-items-center rounded text-slate-400 hover:bg-white/10 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                <button aria-label="ย้ายลง" disabled={pending || i === items.length - 1} onClick={() => move(i, 1)}
                  className="grid h-5 w-6 place-items-center rounded text-slate-400 hover:bg-white/10 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
              </div>
            ) : null}
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded font-bold text-white" style={{ background: d.themeColor }}>{items.length - i}</span>
            <Link href={`/companies/${companyId}/departments/${d.id}`} className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-100">{d.name}</span>
              <span className="block truncate text-xs text-slate-500">{d.floorType.toLowerCase()} · {d.workers} workers</span>
            </Link>
            <Button asChild variant="ghost" size="icon" aria-label="ตั้งค่าแผนก">
              <Link href={`/companies/${companyId}/departments/${d.id}/settings`}><Settings2 className="h-4 w-4" /></Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
