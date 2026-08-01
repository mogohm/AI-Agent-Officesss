"use client";
import { useState } from "react";
import { EVIDENCE_LABELS_TH } from "@/lib/delivery/pass-policy";

/**
 * Evidence status components (Stage A3). Historical provenance is shown
 * SEPARATELY from current baseline integrity — a reconstructed history must
 * never render as one misleading "DEGRADED" badge for the whole package.
 */

type Tone = "good" | "warn" | "bad" | "muted";
const TONE: Record<Tone, string> = {
  good: "border-[#35D07F]/40 bg-[#10261c] text-[#35D07F]",
  warn: "border-[#F0B84B]/40 bg-[#2a2110] text-[#F0B84B]",
  bad: "border-[#EF5B69]/40 bg-[#2a1418] text-[#EF5B69]",
  muted: "border-[#244768] bg-[#12233A] text-[#9DB1C8]",
};

function Badge({ label, value, tone, hint }: { label: string; value: string; tone: Tone; hint?: string }) {
  return (
    <div className="rounded-lg border border-[#244768] bg-[#0E1B2D] p-2.5" title={hint}>
      <div className="text-[10px] uppercase tracking-wide text-[#657A91]">{label}</div>
      <div className={`mt-1 inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold ${TONE[tone]}`}>{value}</div>
    </div>
  );
}

export function ProvenanceBadge({ status }: { status: string }) {
  // RECONSTRUCTED is a disclosed historical fact, not a current failure
  const tone: Tone = status === "NATIVE" ? "good" : status === "UNKNOWN" ? "bad" : "warn";
  return <Badge label={EVIDENCE_LABELS_TH.provenance} value={status} tone={tone}
    hint="ที่มาของข้อมูลการสร้างย้อนหลัง — ไม่ใช่สถานะความถูกต้องของไฟล์ปัจจุบัน" />;
}
export function BaselineIntegrityBadge({ status }: { status: string }) {
  return <Badge label={EVIDENCE_LABELS_TH.baselineIntegrity} value={status}
    tone={status === "PASSED" ? "good" : status === "FAILED" ? "bad" : "muted"} />;
}
export function ValidationBindingBadge({ status }: { status: string }) {
  return <Badge label={EVIDENCE_LABELS_TH.validationBinding} value={status}
    tone={status === "PINNED" ? "good" : status === "MISMATCHED" ? "bad" : "warn"} />;
}
export function ReviewBindingBadge({ status }: { status: string }) {
  return <Badge label={EVIDENCE_LABELS_TH.reviewBinding} value={status}
    tone={status === "PINNED" ? "good" : status === "MISMATCHED" ? "bad" : "warn"} />;
}
export function EvidenceCompletenessBadge({ status }: { status: string }) {
  return <Badge label={EVIDENCE_LABELS_TH.evidenceCompleteness} value={status}
    tone={status === "COMPLETE" ? "good" : status === "MISSING" ? "bad" : "warn"} />;
}

export function HistoricalLimitationsDisclosure({ limitations }: { limitations: string[] }) {
  const [open, setOpen] = useState(false);
  if (!limitations.length) return null;
  return (
    <div className="rounded-lg border border-[#244768] bg-[#0b1626] p-2.5">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left text-[11px] font-semibold text-[#9DB1C8] hover:text-[#3ABEF9]">
        <span>{EVIDENCE_LABELS_TH.historicalLimitations} ({limitations.length})</span>
        <span aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open ? (
        <ul className="mt-2 space-y-1 text-[11px] text-[#657A91]">
          {limitations.map((l, i) => <li key={i}>• {l}</li>)}
        </ul>
      ) : null}
    </div>
  );
}

export function CanonicalBaselineCard({ digest, version, entries, pinned }: { digest: string; version: string; entries: number; pinned: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-[#244768] bg-[#0E1B2D] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#F4F7FB]">Canonical Baseline v{version}</span>
        <span className="text-[11px] tabular-nums text-[#9DB1C8]">{pinned}/{entries} assets pinned</span>
      </div>
      <div className="mt-2">
        <div className="text-[10px] uppercase text-[#657A91]">baseline digest</div>
        <div className="mt-1 flex items-center gap-2">
          <code data-testid="baseline-digest" className="min-w-0 flex-1 truncate rounded bg-[#0b1626] px-2 py-1 font-mono text-[10px] text-[#3ABEF9]">{digest}</code>
          <button
            onClick={() => { navigator.clipboard?.writeText(digest); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="shrink-0 rounded border border-[#244768] px-2 py-1 text-[10px] text-[#9DB1C8] hover:text-[#3ABEF9]"
          >{copied ? "คัดลอกแล้ว" : "คัดลอก"}</button>
        </div>
      </div>
    </div>
  );
}

export function DefectRetestSummary({ total, resolved, open }: { total: number; resolved: number; open: number }) {
  return (
    <div className="rounded-lg border border-[#244768] bg-[#0E1B2D] p-2.5 text-[11px]">
      <div className="text-[10px] uppercase text-[#657A91]">Defect retests</div>
      <div className="mt-1 text-[#F4F7FB]">
        <span className="font-bold tabular-nums">{resolved}/{total}</span> resolved ·{" "}
        <span className={open > 0 ? "text-[#EF5B69]" : "text-[#35D07F]"}>{open} open</span>
      </div>
    </div>
  );
}

export function AttestationSummary({ status, validationPassed, reviewApproved, total }: { status: string; validationPassed: number; reviewApproved: number; total: number }) {
  return (
    <div className="rounded-lg border border-[#244768] bg-[#0E1B2D] p-2.5 text-[11px]">
      <div className="text-[10px] uppercase text-[#657A91]">Attestation</div>
      <div className={`mt-1 font-bold ${status === "PASSED" ? "text-[#35D07F]" : "text-[#EF5B69]"}`}>{status}</div>
      <div className="mt-0.5 text-[#9DB1C8]">validation {validationPassed}/{total} · review {reviewApproved}/{total}</div>
    </div>
  );
}

export type EvidenceSummaryProps = {
  provenance: string; baselineIntegrity: string; validationBinding: string;
  reviewBinding: string; evidenceCompleteness: string;
  digest: string; baselineVersion: string; entries: number; pinned: number;
  validationPassed: number; reviewApproved: number;
  defectsTotal: number; defectsResolved: number; defectsOpen: number;
  attestation: string; limitations: string[];
};

export function EvidenceStatusSummary(p: EvidenceSummaryProps) {
  return (
    <div className="space-y-2.5" data-testid="evidence-status-summary">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <ProvenanceBadge status={p.provenance} />
        <BaselineIntegrityBadge status={p.baselineIntegrity} />
        <ValidationBindingBadge status={p.validationBinding} />
        <ReviewBindingBadge status={p.reviewBinding} />
        <EvidenceCompletenessBadge status={p.evidenceCompleteness} />
      </div>
      <CanonicalBaselineCard digest={p.digest} version={p.baselineVersion} entries={p.entries} pinned={p.pinned} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <AttestationSummary status={p.attestation} validationPassed={p.validationPassed} reviewApproved={p.reviewApproved} total={p.entries} />
        <DefectRetestSummary total={p.defectsTotal} resolved={p.defectsResolved} open={p.defectsOpen} />
      </div>
      <HistoricalLimitationsDisclosure limitations={p.limitations} />
    </div>
  );
}
