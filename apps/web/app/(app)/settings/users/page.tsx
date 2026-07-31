import { listManagedCompanies } from "@/lib/data/members";
import { requireUser } from "@/lib/auth-helpers";
import { PageHeader, EmptyState, ErrorState } from "@/components/ui/page-header";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MemberManager } from "@/components/members/MemberManager";

export const dynamic = "force-dynamic";

export default async function UsersSettingsPage() {
  let companies, user;
  try { [companies, user] = await Promise.all([listManagedCompanies(), requireUser()]); }
  catch { return (<><PageHeader title="Users & Roles" /><ErrorState title="เชื่อมต่อฐานข้อมูลไม่ได้ หรือไม่มีสิทธิ์" /></>); }

  return (
    <>
      <Breadcrumbs items={[{ label: "Settings", href: "/settings" }, { label: "Users & Roles" }]} />
      <PageHeader title="Users & Roles" description="จัดการสมาชิกและบทบาทต่อบริษัท — มอบบทบาทที่สูงกว่าตนเองไม่ได้ และต้องมี Owner อย่างน้อย 1 คน" />
      {companies.length === 0 ? (
        <EmptyState title="ไม่มีบริษัทที่คุณดูแล" description="ต้องเป็น Owner หรือ Admin ของบริษัทจึงจะจัดการสมาชิกได้" />
      ) : (
        <div className="space-y-4">
          {companies.map((c) => <MemberManager key={c.id} company={c} currentUserId={user.id} />)}
        </div>
      )}
    </>
  );
}
