import { forwardRef } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** Checkbox nativo con la piel del panel: 18×18, radio 5, activo en brand-700 con tilde blanca. */
export const Checkbox = forwardRef<HTMLInputElement, Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">>(
  ({ className, ...props }, ref) => (
    <span className="relative inline-flex size-[18px] shrink-0">
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          "peer size-[18px] cursor-pointer appearance-none rounded-[5px] border-[1.5px] border-n-400 bg-n-0",
          "checked:border-brand-700 checked:bg-brand-700",
          "disabled:cursor-not-allowed disabled:border-n-200 disabled:bg-n-100",
          className
        )}
        {...props}
      />
      <Check
        aria-hidden
        strokeWidth={3}
        className="pointer-events-none absolute inset-0 m-auto size-3 text-white opacity-0 peer-checked:opacity-100"
      />
    </span>
  )
);
Checkbox.displayName = "Checkbox";
