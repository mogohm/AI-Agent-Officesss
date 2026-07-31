"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setProjectStatus } from "@/app/(app)/companies/[companyId]/projects/actions";
import { Select } from "@/components/ui/select";
import { PROJECT_STATUS } from "@/lib/validation/project";

export function ProjectStatusControl({ companyId, projectId, status }: { companyId: string; projectId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Select
      className="h-8 w-40"
      value={status}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as (typeof PROJECT_STATUS)[number];
        start(async () => { await setProjectStatus(companyId, projectId, next); router.refresh(); });
      }}
    >
      {PROJECT_STATUS.map((s) => <option key={s} value={s}>{s.toLowerCase()}</option>)}
    </Select>
  );
}
