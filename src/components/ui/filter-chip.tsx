import { cn } from "@/lib/utils";
import { TONE_STYLES, type Tone } from "./tones";

interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /** Color del punto cuando el chip no está activo. */
  tone?: Tone;
}

/** Chip de filtro (ej. Pipeline): 32px, píldora, punto de 6px del tono; activo = fondo n-900. */
export function FilterChip({ active = false, tone = "neutral", className, children, type = "button", ...props }: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
        active
          ? "border-n-900 bg-n-900 text-white"
          : "border-n-300 bg-n-0 text-n-800 hover:border-n-400",
        className
      )}
      {...props}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", active ? "bg-white" : TONE_STYLES[tone].dot)} />
      {children}
    </button>
  );
}
