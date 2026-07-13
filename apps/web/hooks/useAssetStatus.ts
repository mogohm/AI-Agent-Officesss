"use client";
// Deterministic asset resolution: probe each exact production path once and
// report ok / missing / loading. Used by the Visual Lab status panel AND by the
// scene components to decide between real art and a labeled DEV FALLBACK.
import { useEffect, useState } from "react";

export type AssetState = "loading" | "ok" | "missing";

export function useAssetStatus(paths: string[]): Record<string, AssetState> {
  const key = paths.join("|");
  const [status, setStatus] = useState<Record<string, AssetState>>(() =>
    Object.fromEntries(paths.map((p) => [p, "loading" as AssetState])),
  );

  useEffect(() => {
    let alive = true;
    setStatus(Object.fromEntries(paths.map((p) => [p, "loading" as AssetState])));
    paths.forEach((p) => {
      const img = new Image();
      img.onload = () => alive && setStatus((s) => ({ ...s, [p]: "ok" }));
      img.onerror = () => alive && setStatus((s) => ({ ...s, [p]: "missing" }));
      img.src = p;
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return status;
}
