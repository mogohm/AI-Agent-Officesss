"use client";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { pauseCompany, resumeCompany, archiveCompany, restoreCompany } from "@/app/(app)/companies/actions";

export function CompanyDangerZone({ companyId, status }: { companyId: string; status: string }) {
  const router = useRouter();
  const after = () => router.refresh();

  return (
    <div className="flex flex-wrap gap-2">
      {status === "ACTIVE" ? (
        <ConfirmButton
          variant="secondary" size="sm"
          title="พักบริษัทนี้?" description="งานที่กำลังทำจะไม่ถูกลบ แต่จะหยุดรับงานใหม่"
          confirmLabel="พักบริษัท"
          onConfirm={async () => { await pauseCompany(companyId); after(); }}
        >พักบริษัท</ConfirmButton>
      ) : null}
      {status === "PAUSED" ? (
        <ConfirmButton
          variant="success" size="sm"
          title="เปิดบริษัทอีกครั้ง?" confirmLabel="เปิดบริษัท"
          onConfirm={async () => { await resumeCompany(companyId); after(); }}
        >เปิดบริษัท</ConfirmButton>
      ) : null}
      {status !== "ARCHIVED" ? (
        <ConfirmButton
          variant="destructive" size="sm"
          title="เก็บบริษัทเข้าคลัง (archive)?"
          description="ข้อมูลและประวัติจะไม่ถูกลบ แต่บริษัทจะถูกซ่อนจากรายการที่ใช้งาน — กู้คืนได้ภายหลัง"
          confirmLabel="Archive"
          onConfirm={async () => { await archiveCompany(companyId); after(); }}
        >Archive</ConfirmButton>
      ) : (
        <ConfirmButton
          variant="success" size="sm"
          title="กู้คืนบริษัท?" confirmLabel="กู้คืน"
          onConfirm={async () => { await restoreCompany(companyId); after(); }}
        >กู้คืน</ConfirmButton>
      )}
    </div>
  );
}
