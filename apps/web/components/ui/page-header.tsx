import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>
        {description ? <p className="mt-0.5 text-sm text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-12 text-center">
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      {description ? <div className="mt-1 max-w-md text-xs text-slate-500">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-red-500/25 bg-red-500/5 px-6 py-10 text-center">
      <div className="text-sm font-semibold text-red-300">{title}</div>
      {description ? <div className="mt-1 max-w-md text-xs text-red-400/80">{description}</div> : null}
    </div>
  );
}
