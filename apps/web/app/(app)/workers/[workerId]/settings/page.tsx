import { getWorker, getWorkerFormData } from "@/lib/data/workers";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { PageHeader, ErrorState } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkerForm } from "@/components/workers/WorkerForm";
import { WorkerDangerZone } from "@/components/workers/WorkerDangerZone";

export const dynamic = "force-dynamic";

export default async function WorkerSettingsPage({ params }: { params: { workerId: string } }) {
  let data, form;
  try {
    data = await getWorker(params.workerId);
    form = await getWorkerFormData(data.worker.companyId);
  } catch { return (<><PageHeader title="Worker Settings" /><ErrorState title="ไม่พบ worker หรือไม่มีสิทธิ์" /></>); }
  const { worker: w, role } = data;
  const canManage = role === "OWNER" || role === "ADMIN";

  return (
    <>
      <Breadcrumbs items={[{ label: "Workers", href: "/workers" }, { label: w.name, href: `/workers/${w.id}` }, { label: "ตั้งค่า" }]} />
      <PageHeader title={`ตั้งค่า — ${w.name}`} />
      {!canManage ? <ErrorState title="ต้องเป็น Owner หรือ Admin เพื่อแก้ไข" /> : (
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>ข้อมูล Worker</CardTitle></CardHeader>
            <CardContent>
              <WorkerForm mode="edit" workerId={w.id} companyId={w.companyId} departments={form.departments} models={form.models}
                defaults={{
                  departmentId: w.departmentId ?? "", name: w.name, role: w.role, description: w.description ?? "",
                  avatarKey: w.avatarKey, modelId: w.modelId ?? "", systemPrompt: w.systemPrompt ?? "",
                  skills: w.skills, toolPermissions: w.toolPermissions,
                  monthlyBudget: w.monthlyBudget ? Number(w.monthlyBudget) : undefined,
                  requiresDefaultApproval: w.requiresDefaultApproval, temperature: w.temperature, maxOutputTokens: w.maxOutputTokens,
                }} />
            </CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardHeader><CardTitle className="text-red-300">Danger Zone</CardTitle></CardHeader>
            <CardContent><WorkerDangerZone workerId={w.id} status={w.status} /></CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
