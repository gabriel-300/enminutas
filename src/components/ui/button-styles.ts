import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "gold" | "secondary" | "ghost" | "danger" | "danger-soft";
export type ButtonSize = "sm" | "md" | "lg";

// Las clases `admin:` aplican solo dentro del panel (ver globals.css); fuera
// de él (tienda, portal B2B) el botón conserva su piel original.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-tierra-700 text-white hover:bg-tierra-800 active:scale-[0.98] shadow-sm hover:shadow-md " +
    "admin:border admin:border-brand-700 admin:shadow-none admin:hover:shadow-none admin:hover:border-brand-800 admin:active:scale-100 " +
    "admin:disabled:bg-n-100 admin:disabled:border-n-200 admin:disabled:text-n-500",
  gold:
    "bg-dorado-500 text-neutral-900 hover:bg-dorado-600 active:scale-[0.98] shadow-sm hover:shadow-md font-semibold " +
    "admin:bg-brand-700 admin:hover:bg-brand-800 admin:text-white admin:border admin:border-brand-700 admin:shadow-none admin:hover:shadow-none admin:font-medium admin:active:scale-100 " +
    "admin:disabled:bg-n-100 admin:disabled:border-n-200 admin:disabled:text-n-500",
  secondary:
    "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 active:scale-[0.98] " +
    "admin:bg-n-0 admin:text-n-800 admin:border admin:border-n-btn admin:shadow-btn admin:hover:bg-n-50 admin:hover:border-n-400 admin:active:scale-100 " +
    "admin:disabled:bg-n-100 admin:disabled:border-n-200 admin:disabled:text-n-500 admin:disabled:shadow-none",
  ghost:
    "bg-transparent text-neutral-700 border border-neutral-300 hover:border-neutral-500 hover:bg-neutral-50 active:scale-[0.98] " +
    "admin:border-transparent admin:text-brand-700 admin:hover:border-transparent admin:hover:bg-brand-50 admin:hover:text-brand-800 admin:active:scale-100 " +
    "admin:disabled:text-n-500",
  danger:
    "bg-danger text-white hover:bg-red-700 active:scale-[0.98] shadow-sm " +
    "admin:border admin:border-danger admin:shadow-none admin:hover:bg-danger-hover admin:hover:border-danger-hover admin:active:scale-100 " +
    "admin:disabled:bg-n-100 admin:disabled:border-n-200 admin:disabled:text-n-500",
  "danger-soft":
    "bg-white text-danger border border-danger-soft-border hover:bg-danger-bg hover:border-danger active:scale-[0.98] " +
    "admin:active:scale-100 admin:disabled:bg-n-100 admin:disabled:border-n-200 admin:disabled:text-n-500",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm gap-1.5 rounded-full admin:h-8 admin:px-3 admin:text-[13px] admin:rounded-lg",
  md: "h-11 px-5 text-sm gap-2 rounded-full admin:h-9 admin:px-3.5 admin:text-sm admin:gap-1.5 admin:rounded-lg",
  lg: "h-13 px-7 text-base gap-2.5 rounded-full admin:h-10 admin:px-4 admin:text-[15px] admin:gap-1.5 admin:rounded-lg",
};


const baseClasses = cn(
  "inline-flex items-center justify-center font-medium transition-all duration-150",
  "focus-visible:outline-2 focus-visible:outline-dorado-500 focus-visible:outline-offset-2",
  "disabled:opacity-50 disabled:pointer-events-none admin:disabled:opacity-100 admin:disabled:pointer-events-auto admin:disabled:cursor-not-allowed",
  "admin:[&_svg]:size-4 admin:[&_svg]:shrink-0"
);

/** Clases de un botón; sirve también para darle piel de botón a un <Link>. */
export function buttonStyles(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
}
