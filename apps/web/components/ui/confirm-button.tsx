"use client";
import { useState, useTransition } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function ConfirmButton({
  children,
  onConfirm,
  title,
  description,
  confirmLabel = "ยืนยัน",
  variant = "default",
  size,
}: {
  children: React.ReactNode;
  onConfirm: () => Promise<unknown> | void;
  title: string;
  description?: string;
  confirmLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>{children}</Button>
      {open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => !pending && setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#111a2e] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-semibold text-white">{title}</h2>
            {description ? <p className="mt-1 text-xs text-slate-400">{description}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setOpen(false)}>ยกเลิก</Button>
              <Button
                type="button"
                variant={variant === "destructive" ? "destructive" : "default"}
                size="sm"
                disabled={pending}
                onClick={() => start(async () => { await onConfirm(); setOpen(false); })}
              >
                {pending ? "กำลังดำเนินการ…" : confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
