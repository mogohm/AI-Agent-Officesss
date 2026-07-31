"use client";
import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { archiveDepartment } from "@/app/(app)/companies/[companyId]/departments/actions";

export function DepartmentArchive({ companyId, departmentId }: { companyId: string; departmentId: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      variant="destructive" size="sm"
      title="เก็บแผนกนี้เข้าคลัง?"
      description="แผนกจะถูกนำออกจากตึก แต่ประวัติงาน/tasks จะไม่ถูกลบ"
      confirmLabel="Archive"
      onConfirm={async () => { await archiveDepartment(companyId, departmentId); router.push(`/companies/${companyId}/departments`); router.refresh(); }}
    >เก็บเข้าคลัง (Archive)</ConfirmButton>
  );
}
