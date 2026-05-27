import Link from "next/link";
import { ShoppingBag, MapPin, Building2, ArrowRight } from "lucide-react";

const channels = [
  {
    icon: ShoppingBag,
    title: "Minorista",
    subtitle: "Envío a todo el país",
    description:
      "Comprá online y recibí en tu casa. Pagos con Mercado Pago o transferencia. Entrega por Correo Argentino.",
    href: "/tienda",
    cta: "Comprar ahora",
    iconBg: "bg-tierra-700",
    iconText: "text-tierra-700",
    featured: false,
  },
  {
    icon: MapPin,
    title: "Pedido Ya",
    subtitle: "Solo Posadas · 3300",
    description:
      "Entrega en 40 minutos dentro de la Costanera y Centro. Seguí a tu repartidor en tiempo real.",
    href: "/tienda?canal=pedido-ya",
    cta: "Pedir ahora",
    iconBg: "bg-dorado-500",
    iconText: "text-dorado-500",
    featured: true,
  },
  {
    icon: Building2,
    title: "Mayorista",
    subtitle: "B2B · Food Service · Export",
    description:
      "Precios especiales, factura, cuenta corriente y volumen. Para restaurantes, retail y exportación.",
    href: "/registro-mayorista",
    cta: "Registrarme",
    iconBg: "bg-selva-700",
    iconText: "text-selva-700",
    featured: false,
  },
];

export function ChannelSelector() {
  return (
    <section className="bg-crema-50 pt-16 pb-20" id="canales">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="font-mono text-xs uppercase tracking-widest text-tierra-700 mb-3">
            ¿Cómo querés comprar?
          </p>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold text-neutral-900">
            Tres canales, una sola{" "}
            <span className="text-tierra-700">planta</span>.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {channels.map(
            ({ icon: Icon, title, subtitle, description, href, cta, iconBg, iconText, featured }) => (
              <Link
                key={title}
                href={href}
                className={`group relative rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg
                  ${featured
                    ? "bg-neutral-900 text-white ring-2 ring-dorado-500"
                    : "bg-white border border-neutral-200 hover:border-neutral-300"
                  }`}
              >
                <div
                  className={`size-11 rounded-xl flex items-center justify-center ${iconBg} ${
                    featured ? "bg-opacity-100" : "bg-opacity-10"
                  }`}
                >
                  <Icon
                    className={`size-5 ${featured ? "text-white" : iconText}`}
                  />
                </div>

                <div>
                  <p
                    className={`font-mono text-xs uppercase tracking-widest mb-1 ${
                      featured ? "text-dorado-400" : "text-neutral-400"
                    }`}
                  >
                    {subtitle}
                  </p>
                  <h3
                    className={`font-display text-2xl font-semibold ${
                      featured ? "text-white" : "text-neutral-900"
                    }`}
                  >
                    {title}
                  </h3>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      featured ? "text-neutral-300" : "text-neutral-500"
                    }`}
                  >
                    {description}
                  </p>
                </div>

                <div
                  className={`mt-auto inline-flex items-center gap-1.5 text-sm font-medium transition-all group-hover:gap-2.5 ${
                    featured ? "text-dorado-400" : "text-tierra-700"
                  }`}
                >
                  {cta}
                  <ArrowRight className="size-4" />
                </div>
              </Link>
            )
          )}
        </div>
      </div>
    </section>
  );
}
