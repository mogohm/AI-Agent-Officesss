import Link from "next/link";
import { listTasks } from "@/lib/data/tasks";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import type { TaskStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
const STATUSES = ["DRAFT", "QUEUED", "RUNNING", "WAITING_APPROVAL", "REVISION_REQUIRED", "APPROVED", "COMPLETED", "FAILED", "CANCELLED"];

export default async function TasksPage({ searchParams }: { searchParams: { status?: string } }) {
  let tasks;
  try {
    tasks = await listTasks({ status: STATUSES.includes(searchParams.status ?? "") ? (searchParams.status as TaskStatus) : undefined });
  } catch { return (<><PageHeader title="Tasks" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }

  return (
    <>
      <PageHeader title="Tasks" description="งาน AI ทั้งหมด" actions={<Button asChild size="sm"><Link href="/tasks/new">+ สร้างงาน</Link></Button>} />
      <Card className="mb-4"><CardContent className="p-3">
        <form className="flex items-end gap-2">
          <Select name="status" defaultValue={searchParams.status ?? ""} className="w-48">
            <option value="">ทุกสถานะ</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.toLowerCase().replace(/_/g, " ")}</option>)}
          </Select>
          <Button type="submit" size="sm">กรอง</Button>
        </form>
      </CardContent></Card>
      {tasks.length === 0 ? <EmptyState title="ไม่มีงาน" /> : (
        <Card><div className="overflow-x-auto"><table className="w-full text-sm">
          <thead><tr className="border-b border-white/10 text-left text-xs text-slate-500">
            <th className="px-4 py-2 font-medium">Title</th><th className="px-4 py-2 font-medium">Company</th>
            <th className="px-4 py-2 font-medium">Project</th><th className="px-4 py-2 font-medium">Worker</th><th className="px-4 py-2 font-medium">Status</th>
          </tr></thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-4 py-2"><Link href={`/tasks/${t.id}`} className="font-medium text-slate-100 hover:underline">{t.title}</Link></td>
                <td className="px-4 py-2 text-slate-400">{t.company.name}</td>
                <td className="px-4 py-2 text-slate-400">{t.project?.name ?? "—"}</td>
                <td className="px-4 py-2 text-slate-400">{t.worker?.name ?? "—"}</td>
                <td className="px-4 py-2"><TaskStatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table></div></Card>
      )}
    </>
  );
}
