"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  /** Si hay href, la pestaña es un link; si no, un botón que usa onSelect. */
  href?: string;
}

interface TabsProps {
  items: TabItem[];
  active: string;
  onSelect?: (key: string) => void;
  className?: string;
}

/** Pestañas subrayadas para las vistas de una pantalla (ej. Pedidos). */
export function Tabs({ items, active, onSelect, className }: TabsProps) {
  return (
    <div role="tablist" className={cn("flex gap-1 overflow-x-auto border-b border-n-200", className)}>
      {items.map((t) => {
        const isActive = t.key === active;
        const cls = cn(
          "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 pb-3 pt-2.5 text-sm transition-colors",
          isActive
            ? "border-brand-700 font-semibold text-n-900"
            : "border-transparent font-medium text-n-600 hover:text-n-900"
        );
        const content = (
          <>
            {t.label}
            {t.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs font-medium leading-[18px] tabular-nums",
                  isActive ? "bg-brand-100 text-brand-800" : "bg-n-100 text-n-700"
                )}
              >
                {t.count}
              </span>
            )}
          </>
        );
        return t.href ? (
          <Link key={t.key} href={t.href} role="tab" aria-selected={isActive} className={cls}>{content}</Link>
        ) : (
          <button key={t.key} type="button" role="tab" aria-selected={isActive} onClick={() => onSelect?.(t.key)} className={cls}>{content}</button>
        );
      })}
    </div>
  );
}
