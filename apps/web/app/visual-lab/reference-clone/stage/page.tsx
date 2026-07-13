"use client";
// Bare stage route for pixel-exact Playwright capture (1672×941, no chrome).
// ?eng=v1|v2|locked switches the Engineering floor variant for A/B comparison.
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReferenceCloneStage } from "@/components/reference-clone/ReferenceCloneStage";

function Stage() {
  const params = useSearchParams();
  const realParam = params.get("real"); // e.g. ?real=engineering,product-management
  return (
    <ReferenceCloneStage
      eng={params.get("eng") ?? "locked"}
      real={realParam === null ? undefined : realParam.split(",").filter(Boolean)}
      char={params.get("char") === "on"}
      charScale={Number(params.get("cs") ?? "0.56") || 0.56}
      workers={(params.get("workers") as "off" | "fe" | "trio" | null) ?? "off"}
      shadow={params.get("shadow") === "on"}
    />
  );
}

export default function CloneStagePage() {
  return (
    <div className="fixed left-0 top-0">
      <Suspense fallback={null}><Stage /></Suspense>
    </div>
  );
}
