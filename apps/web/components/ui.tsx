"use client";
// Small, reusable UI primitives shared across pages.
import { ReactNode, TextareaHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { motion } from "framer-motion";

export function Card({
  children, className = "", glow, onClick,
}: { children: ReactNode; className?: string; glow?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={glow ? { borderColor: glow, boxShadow: `0 0 22px ${glow}33` } : undefined}
      className={`rounded-xl2 border border-line bg-card shadow-card ${onClick ? "cursor-pointer transition hover:brightness-110" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  children, onClick, variant = "primary", disabled, type = "button", className = "", title,
}: {
  children: ReactNode; onClick?: () => void; variant?: ButtonVariant;
  disabled?: boolean; type?: "button" | "submit"; className?: string; title?: string;
}) {
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-gradient-to-br from-neon to-purple text-white",
    secondary: "bg-surfaceAlt text-ink border border-line",
    ghost: "bg-transparent text-neon",
    danger: "bg-[#FF6B7A]/15 text-[#FF6B7A] border border-[#FF6B7A]/50",
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-semibold text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-surface px-3 py-2 text-ink outline-none placeholder:text-faint focus:border-neon";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} min-h-[96px] resize-y ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Badge({ children, color = "#5B8CFF" }: { children: ReactNode; color?: string }) {
  return (
    <span
      style={{ color, borderColor: `${color}66`, backgroundColor: `${color}1A` }}
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold capitalize"
    >
      {children}
    </span>
  );
}

export function Modal({
  open, title, onClose, children, footer,
}: { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="scroll-slim max-h-[90vh] w-full overflow-y-auto rounded-t-xl2 border border-line bg-elevated p-5 sm:max-w-lg sm:rounded-xl2"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="text-faint hover:text-ink">✕</button>
        </div>
        {children}
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </motion.div>
    </div>
  );
}

export function EmptyState({ icon = "🗂️", title, message, action }: { icon?: string; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-line py-14 text-center">
      <div className="mb-3 text-5xl">{icon}</div>
      <div className="text-lg font-bold text-ink">{title}</div>
      {message ? <div className="mt-1 max-w-sm text-sm text-muted">{message}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, color = "#3BE8E0" }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}
