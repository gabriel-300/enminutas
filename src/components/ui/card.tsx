import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_STYLES, type Tone } from "./tones";

/** Card del panel: fondo blanco, borde n-200, radio 12 y sombra de 1px. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-n-200 bg-n-0 shadow-card", className)} {...props} />;
}

/** Cabecera de card: título 16/600 + acción opcional, con borde inferior n-100. */
export function CardHeader({ title, action, className }: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-n-100 px-5 py-4", className)}>
      <h2 className="text-base font-semibold text-n-900">{title}</h2>
      {action}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  /** Pill opcional junto al pie (ej. "↑ 110%"). */
  pill?: { text: string; tone: Tone };
  footer?: React.ReactNode;
  /** "warning" pinta borde, tile y valor con el tono de alerta. */
  tone?: "default" | "warning";
  href?: string;
}

/** KPI: label + tile de ícono, valor de 32px y pie de 13px. Clickeable si tiene href. */
export function KpiCard({ label, value, icon, pill, footer, tone = "default", href }: KpiCardProps) {
  const warn = tone === "warning";
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-n-600">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]",
              warn ? TONE_STYLES.warning.tile : "bg-brand-50 text-brand-700"
            )}
          >
            {icon}
          </span>
        )}
      </div>
      <p className={cn("text-3xl font-semibold leading-10 tracking-[-0.02em] tabular-nums", warn ? "text-warning" : "text-n-900")}>
        {value}
      </p>
      {(pill || footer) && (
        <div className="flex items-center gap-1.5 text-[13px] text-n-600">
          {pill && (
            <span className={cn("rounded-md px-1.5 py-px text-xs font-medium", TONE_STYLES[pill.tone].tile)}>{pill.text}</span>
          )}
          {footer}
        </div>
      )}
    </>
  );
  const cls = cn(
    "flex flex-col gap-2.5 rounded-xl border bg-n-0 px-5 py-[18px] shadow-card",
    warn ? "border-warning-border" : "border-n-200",
    href && "transition hover:border-n-400 hover:shadow-card-hover"
  );
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Card de configuración: tile de 36px, título 15/600, descripción y chevron. */
export function ConfigCard({ href, icon, title, description }: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3.5 rounded-xl border border-n-200 bg-n-0 px-5 py-[18px] shadow-card transition hover:border-n-400 hover:shadow-card-hover"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[9px] border border-brand-100 bg-brand-50 text-brand-700 [&_svg]:size-[18px]">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-semibold text-n-900">{title}</span>
        <span className="text-[13px] leading-[18px] text-n-600">{description}</span>
      </span>
      <ChevronRight aria-hidden className="mt-2 size-4 shrink-0 text-n-500" />
    </Link>
  );
}
