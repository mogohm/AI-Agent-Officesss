import { listKnowledge } from "@/lib/data/knowledge";
import { PageHeader, ErrorState, EmptyState } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const TONE: Record<string, "green" | "amber" | "red" | "neutral"> = { READY: "green", PROCESSING: "amber", FAILED: "red", ARCHIVED: "neutral" };

export default async function KnowledgePage() {
  let docs;
  try { docs = await listKnowledge(); }
  catch { return (<><PageHeader title="Knowledge" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }

  return (
    <>
      <PageHeader title="Knowledge Base" description="เอกสารอ้างอิงที่ผูกกับบริษัท/แผนก/เวิร์กเกอร์" />
      {docs.length === 0 ? (
        <EmptyState title="ยังไม่มีเอกสาร" description="เอกสารความรู้จะถูกจัดเก็บและผูกกับเวิร์กเกอร์เพื่อใช้อ้างอิงระหว่างทำงาน" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((k) => (
            <Card key={k.id}><CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><div className="truncate text-sm font-semibold text-white">{k.title}</div>
                  <div className="text-xs text-slate-400">{k.company.name}{k.department ? " · " + k.department.name : ""}</div></div>
                <Badge tone={TONE[k.status] ?? "neutral"}>{k.status.toLowerCase()}</Badge>
              </div>
              {k.description ? <p className="mt-2 line-clamp-2 text-xs text-slate-400">{k.description}</p> : null}
            </CardContent></Card>
          ))}
        </div>
      )}
    </>
  );
}
