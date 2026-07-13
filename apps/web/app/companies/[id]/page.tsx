"use client";
// Company page — PRODUCTION. Renders the approved Bright Office visual layer
// (BrightCompanyOffice) with the route param as the source of truth.
// Feature flag: NEXT_PUBLIC_BRIGHT_OFFICE=false restores the legacy view
// (LegacyCompanyView is preserved unchanged in this folder).
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { BrightCompanyOffice } from "@/components/bright/BrightCompanyOffice";
import { LegacyCompanyView } from "./LegacyCompanyView";

const BRIGHT_ENABLED = process.env.NEXT_PUBLIC_BRIGHT_OFFICE !== "false";

export default function CompanyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = useMemo(() => {
    const n = Number(params.id);
    return Number.isInteger(n) && n > 0 ? n : null;
  }, [params.id]);

  if (!BRIGHT_ENABLED) return <LegacyCompanyView />;

  if (companyId === null) {
    return (
      <div className="grid min-h-[100dvh] place-items-center" style={{ background: "#0D386C" }}>
        <div className="rounded-xl bg-white/95 px-8 py-6 text-center shadow-lg">
          <div className="text-3xl">🏢</div>
          <div className="mt-2 text-lg font-bold text-[#17325C]">ไม่พบบริษัท</div>
          <div className="mt-1 text-sm text-[#526987]">รหัสบริษัทไม่ถูกต้อง: “{params.id}”</div>
          <button onClick={() => router.push("/")} className="mt-4 rounded-lg bg-[#2F66B3] px-4 py-2 text-sm font-bold text-white">กลับหน้ารวมบริษัท</button>
        </div>
      </div>
    );
  }

  return <BrightCompanyOffice companyId={companyId} onNavigateCompany={(id) => router.push(`/companies/${id}`)} />;
}
