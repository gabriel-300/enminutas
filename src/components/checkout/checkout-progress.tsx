import { cn } from "@/lib/utils";

const steps = [
  { n: 1, label: "Carrito",  href: "/checkout/carrito" },
  { n: 2, label: "Envío",    href: "/checkout/envio" },
  { n: 3, label: "Pago",     href: "/checkout/pago" },
];

export function CheckoutProgress({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Pasos del checkout" className="flex items-center gap-2 mb-8">
      {steps.map(({ n, label }) => (
        <div key={n} className="flex items-center gap-2">
          <div
            className={cn(
              "size-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
              n < current
                ? "bg-selva-700 text-white"
                : n === current
                ? "bg-tierra-700 text-white"
                : "bg-neutral-200 text-neutral-400"
            )}
          >
            {n < current ? "✓" : n}
          </div>
          <span
            className={cn(
              "text-sm font-medium hidden sm:block",
              n === current ? "text-neutral-900" : "text-neutral-400"
            )}
          >
            {label}
          </span>
          {n < 3 && (
            <div className={cn("h-px w-6 lg:w-12", n < current ? "bg-selva-700" : "bg-neutral-200")} />
          )}
        </div>
      ))}
    </nav>
  );
}
