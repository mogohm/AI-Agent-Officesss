import { listProviderConnections, ownerCompanies } from "@/lib/data/providers";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth-helpers";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderConnectionForm } from "@/components/providers/ProviderConnectionForm";
import { ProviderConnectionCard } from "@/components/providers/ProviderConnectionCard";

export const dynamic = "force-dynamic";

export default async function ProvidersSettingsPage() {
  let connections, companies, superAdmin;
  try {
    const user = await getCurrentUser();
    superAdmin = user ? isSuperAdmin(user) : false;
    [connections, companies] = await Promise.all([listProviderConnections(), ownerCompanies()]);
  } catch { return (<><PageHeader title="AI Providers" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้" /></>); }

  const canAdd = superAdmin || companies.length > 0;

  return (
    <>
      <Breadcrumbs items={[{ label: "Settings", href: "/settings" }, { label: "Providers" }]} />
      <PageHeader title="AI Model Providers" description="เชื่อมต่อ OpenAI / Anthropic / Google / Local — API key ถูกเข้ารหัสในฐานข้อมูล" />
      {canAdd ? (
        <Card className="mb-4"><CardHeader><CardTitle>เพิ่มการเชื่อมต่อ</CardTitle></CardHeader>
          <CardContent><ProviderConnectionForm companies={companies} isSuperAdmin={superAdmin} /></CardContent></Card>
      ) : (
        <Card className="mb-4"><CardContent className="p-4 text-xs text-slate-400">ต้องเป็น Owner ของบริษัทจึงจะเพิ่ม provider ได้</CardContent></Card>
      )}
      {connections.length === 0 ? <EmptyState title="ยังไม่มีการเชื่อมต่อ provider" /> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {connections.map((c) => <ProviderConnectionCard key={c.id} conn={c} />)}
        </div>
      )}
    </>
  );
}
