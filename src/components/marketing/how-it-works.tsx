import { ShoppingBag, Banknote, Package } from "lucide-react";

const steps = [
  {
    icon: ShoppingBag,
    number: "01",
    title: "Elegís tu pedido",
    description:
      "Navegá el catálogo, filtrá por línea y agregá al carrito. Para mayoristas, los precios B2B aparecen automáticamente.",
  },
  {
    icon: Banknote,
    number: "02",
    title: "Pagás con Mercado Pago o transferencia",
    description:
      "B2C: Mercado Pago (débito, crédito, QR) o transferencia bancaria. B2B: transferencia con cuenta corriente disponible.",
  },
  {
    icon: Package,
    number: "03",
    title: "Recibís con cadena de frío",
    description:
      "Posadas: entrega en 40 min con seguimiento en tiempo real. Interior del país: Correo Argentino con empaque isotérmico.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-neutral-900 py-20 rounded-3xl mx-4 sm:mx-6 lg:mx-8" id="como-funciona">
      <div className="mx-auto max-w-7xl px-8 lg:px-16">
        <div className="text-center mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-dorado-400 mb-3">
            Cómo funciona
          </p>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white">
            Tres pasos,{" "}
            <span className="text-dorado-500">cero complicaciones</span>.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map(({ icon: Icon, number, title, description }) => (
            <div key={number} className="relative">
              {/* Conector horizontal (solo desktop) */}
              <div
                aria-hidden
                className="hidden md:block absolute top-6 left-[calc(50%+24px)] right-0 h-px bg-white/10"
              />

              <div className="flex flex-col items-center text-center gap-4">
                <div className="relative">
                  <div className="size-12 rounded-xl bg-tierra-700/30 border border-tierra-700/50 flex items-center justify-center">
                    <Icon className="size-5 text-tierra-300" />
                  </div>
                  <span className="absolute -top-2 -right-2 font-mono text-xs text-dorado-500 font-semibold">
                    {number}
                  </span>
                </div>
                <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed max-w-xs">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
