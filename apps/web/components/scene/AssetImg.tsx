"use client";
// <img> wrapper that renders a fallback node if the asset file is missing
// (so the app is fully usable before the pixel-art sprites are generated).
import { CSSProperties, ReactNode, useState } from "react";

export function AssetImg({
  src, alt, className, style, placeholder,
}: {
  src: string; alt: string; className?: string; style?: CSSProperties; placeholder: ReactNode;
}) {
  const [err, setErr] = useState(false);
  if (err) return <>{placeholder}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setErr(true)}
    />
  );
}
