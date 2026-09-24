"use client";

import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** Obligatorio: nombre accesible del interruptor. */
  label: string;
  className?: string;
}

/** Interruptor 36×20 con thumb de 16px: activo brand-700, apagado n-400. */
export function Switch({ checked, onCheckedChange, disabled, label, className }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150",
        checked ? "bg-brand-700" : "bg-n-400",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-0.5 size-4 rounded-full bg-white transition-[left] duration-150",
          checked ? "left-[18px]" : "left-0.5"
        )}
      />
    </button>
  );
}
