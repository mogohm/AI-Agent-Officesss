"use client";
import { useState } from "react";
import { resolveCompanyBuilding } from "@/lib/visual-assets";

/**
 * Canonical company building preview (WP-003B).
 *
 * The artwork is chosen by the approved registry resolver — explicit theme first,
 * then a stable hash of the company id. Never by array index, query order,
 * display name or randomness, so a company keeps the same building forever.
 *
 * `object-contain` is deliberate: the whole silhouette must stay visible from
 * roof to base. `cover` would crop the base and is forbidden by the spec.
 */
export function CompanyBuildingPreview({
  id, name, themeKey, className,
}: {
  id: string;
  name: string;
  themeKey?: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const resolved = resolveCompanyBuilding({ id, visualTheme: themeKey ?? null });

  return (
    <span
      className={`block overflow-hidden bg-gradient-to-b from-[#0d1a2e] to-[#0a1424] ${className ?? ""}`}
      data-variant={resolved.variant}
      data-resolution={resolved.resolutionSource}
    >
      {broken ? (
        // deterministic fallback — never a permanent placeholder over a good load
        <span className="grid h-full w-full place-items-center text-[10px] text-[#657A91]">
          {name.slice(0, 2).toUpperCase()}
        </span>
      ) : (
        <img
          src={resolved.src}
          alt={`อาคารสำนักงานของ ${name}`}
          onError={() => setBroken(true)}
          // intrinsic size reserves the box so the card cannot shift when the
          // art decodes; the source is a 1024x1024 square
          width={1024}
          height={1024}
          // this is the card's primary visual and sits above the fold - lazily
          // loading it delays the page's main content and lets the request be
          // cancelled on viewport change
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain object-center p-1 transition duration-500 group-hover:scale-[1.03]"
        />
      )}
    </span>
  );
}
