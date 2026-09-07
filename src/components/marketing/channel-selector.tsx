import Link from "next/link";

const WA_SVG = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z";

type Props = {
  whatsapp?: string;
  kicker?: string;
  titulo?: string;
  canal1Titulo?: string;
  canal1Subtitulo?: string;
  canal1Desc?: string;
  canal1Cta?: string;
  canal2Titulo?: string;
  canal2Subtitulo?: string;
  canal2Desc?: string;
  canal2Cta?: string;
  canal3Titulo?: string;
  canal3Subtitulo?: string;
  canal3Desc?: string;
  canal3Cta?: string;
};

export function ChannelSelector({
  whatsapp    = "5493765017944",
  kicker      = "¿Cómo pedís?",
  titulo      = "Tres formas de llegar a vos.",
  canal1Titulo     = "Pedido por WhatsApp",
  canal1Subtitulo  = "La forma más rápida",
  canal1Desc       = "Escribinos, te asesoramos sobre productos y coordinamos entrega y pago. Atención personalizada.",
  canal1Cta        = "Escribir ahora",
  canal2Titulo     = "Ver catálogo",
  canal2Subtitulo  = "Todos los productos",
  canal2Desc       = "Explorá chipas, bocaditos, pizzas y empanadas con precios y presentaciones disponibles.",
  canal2Cta        = "Ver productos",
  canal3Titulo     = "Mayoristas B2B",
  canal3Subtitulo  = "Gastronomía · Retail",
  canal3Desc       = "Precios especiales, factura, cuenta corriente y logística a medida. Para restaurantes y retail.",
  canal3Cta        = "Consultar condiciones",
}: Props) {
  const waMinorista  = encodeURIComponent("Hola, quería hacer un pedido de productos En Minutas 🛒");
  const waMayorista  = encodeURIComponent("Hola, quería consultar sobre condiciones mayoristas de En Minutas 🏪");

  const channels = [
    {
      id: "whatsapp",
      title: canal1Titulo,
      subtitle: canal1Subtitulo,
      description: canal1Desc,
      href: `https://wa.me/${whatsapp}?text=${waMinorista}`,
      external: true,
      cta: canal1Cta,
      featured: true,
    },
    {
      id: "catalogo",
      title: canal2Titulo,
      subtitle: canal2Subtitulo,
      description: canal2Desc,
      href: "/tienda",
      external: false,
      cta: canal2Cta,
      featured: false,
    },
    {
      id: "mayorista",
      title: canal3Titulo,
      subtitle: canal3Subtitulo,
      description: canal3Desc,
      href: `https://wa.me/${whatsapp}?text=${waMayorista}`,
      external: true,
      cta: canal3Cta,
      featured: false,
    },
  ];

  return (
    <section className="bg-white pt-16 pb-20" id="canales">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#2C25B5", letterSpacing: "0.12em" }}
          >
            {kicker}
          </p>
          <h2
            className="text-3xl lg:text-4xl font-semibold text-neutral-900"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            {titulo}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {channels.map(({ id, title, subtitle, description, href, external, cta, featured }) => (
            <a
              key={id}
              href={href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={`group relative rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1 ${
                featured
                  ? "text-white hover:shadow-xl"
                  : "bg-white border border-neutral-200 hover:border-neutral-300 hover:shadow-md"
              }`}
              style={featured ? { background: "#2C25B5" } : {}}
            >
              {/* Ícono */}
              <div
                className="size-11 rounded-xl flex items-center justify-center"
                style={{ background: featured ? "rgba(255,255,255,0.15)" : "#EAEBF8" }}
              >
                {id === "whatsapp" && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={featured ? "#fff" : "#2C25B5"} aria-hidden>
                    <path d={WA_SVG}/>
                  </svg>
                )}
                {id === "catalogo" && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                )}
                {id === "mayorista" && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                )}
              </div>

              <div>
                <p className={`text-xs font-semibold uppercase tracking-widest mb-1 ${featured ? "text-white/60" : "text-neutral-400"}`}>
                  {subtitle}
                </p>
                <h3
                  className={`text-2xl font-semibold ${featured ? "text-white" : "text-neutral-900"}`}
                  style={{ fontFamily: "var(--font-fredoka)" }}
                >
                  {title}
                </h3>
                <p className={`mt-2 text-sm leading-relaxed ${featured ? "text-white/80" : "text-neutral-500"}`}>
                  {description}
                </p>
              </div>

              <div
                className={`mt-auto inline-flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-2.5 ${featured ? "text-white" : ""}`}
                style={!featured ? { color: "#2C25B5" } : {}}
              >
                {cta}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
