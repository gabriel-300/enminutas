"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { buttonStyles, type ButtonSize, type ButtonVariant } from "./button-styles";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className,
      children,
      asChild: _asChild,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={buttonStyles(variant, size, className)}
        {...props}
      >
        {loading ? (
          <>
            <span className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Cargando…</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: es el nombre accesible y el tooltip del botón. */
  label: string;
  variant?: Exclude<ButtonVariant, "gold">;
}

/** Botón cuadrado de 32px solo con ícono (Eliminar, Editar...). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, variant = "secondary", className, children, type = "button", ...props }, ref) => (
    <Button
      ref={ref}
      type={type}
      variant={variant}
      size="sm"
      aria-label={label}
      title={label}
      className={cn("size-8 px-0 admin:px-0 shrink-0", className)}
      {...props}
    >
      {children}
    </Button>
  )
);

IconButton.displayName = "IconButton";
