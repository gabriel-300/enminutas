import { cn } from "@/lib/utils";

/** Encabezado de página: h1 24/32 + subtítulo 14px n-600, acciones a la derecha alineadas abajo. */
export function PageHeader({ title, subtitle, actions, icon, className }: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-n-200 bg-n-0 text-brand-700 [&_svg]:size-5">
            {icon}
          </span>
        )}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold leading-8 tracking-[-0.015em] text-n-900">{title}</h1>
          {subtitle && <p className="text-sm text-n-600">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
