import { forwardRef } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Las clases `admin:` aplican solo dentro del panel (ver globals.css): label
// 13/500 siempre visible, campo de 40px con borde de 3.3:1 y halo de foco.
const labelCls =
  "text-xs font-medium tracking-wide uppercase text-neutral-500 " +
  "admin:text-[13px] admin:leading-4 admin:normal-case admin:tracking-normal admin:text-n-800";

const fieldCls =
  "transition-all duration-150 " +
  "focus:outline-none focus:border-tierra-700 focus:ring-2 focus:ring-tierra-700/20 " +
  "admin:border-n-400 admin:rounded-lg admin:text-sm admin:placeholder:text-n-500 " +
  "admin:focus:border-brand-700 admin:focus:ring-[3px] admin:focus:ring-brand-500/30 " +
  "admin:disabled:bg-n-50 admin:disabled:border-n-200 admin:disabled:text-n-500 admin:disabled:cursor-not-allowed";

const errorFieldCls = "border-danger focus:border-danger focus:ring-danger/20 admin:border-danger admin:focus:border-danger admin:focus:ring-danger/25";

function FieldError({ message }: { message: string }) {
  return (
    <p className="text-xs text-danger admin:flex admin:items-center admin:gap-1">
      <AlertCircle aria-hidden className="hidden admin:block size-3.5 shrink-0" />
      {message}
    </p>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className={labelCls}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900",
            "placeholder:text-neutral-400",
            "admin:h-10 admin:px-3",
            fieldCls,
            error && errorFieldCls,
            className
          )}
          {...props}
        />
        {error && <FieldError message={error} />}
        {hint && !error && <p className="text-xs text-neutral-400 admin:text-n-600">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className={labelCls}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            "w-full rounded-lg border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-900",
            "placeholder:text-neutral-400 resize-y min-h-24",
            "admin:px-3 admin:py-2.5 admin:min-h-20",
            fieldCls,
            error && errorFieldCls,
            className
          )}
          {...props}
        />
        {error && <FieldError message={error} />}
        {hint && !error && <p className="text-xs text-neutral-400 admin:text-n-600">{hint}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className={labelCls}>
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            "h-11 w-full rounded-lg border border-neutral-300 bg-white px-3.5 text-sm text-neutral-900 cursor-pointer",
            "admin:h-10 admin:px-3",
            fieldCls,
            error && errorFieldCls,
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <FieldError message={error} />}
      </div>
    );
  }
);

Select.displayName = "Select";
