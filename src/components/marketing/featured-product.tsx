import Link from "next/link";

const WA_NUMBER = "5493765017944";
const WA_TEXT   = encodeURIComponent("Hola, quería consultar sobre la Chipa Long Gourmet de En Minutas 🧀");
const WA_HREF   = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`;

const specs = [
  ["Formato",  "Caja × 30 u"],
  ["Canal",    "Cafetería · YPF"],
  ["Cocción",  "Horno convencional"],
  ["Tiempo",   "12 min a 180°C"],
] as const;

export function FeaturedProduct() {
  return (
    <section className="py-20" style={{ background: "#EAEBF8" }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Imagen placeholder */}
          <div
            className="relative aspect-[5/4] rounded-2xl overflow-hidden order-2 lg:order-1 flex flex-col items-center justify-center gap-3"
            style={{ background: "#C1D7E6", border: "2px dashed #7B77D4" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2C25B5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="8" r="6"/>
              <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6"/>
            </svg>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#2C25B5" }}>
              [PENDIENTE — foto Chipa Long Gourmet]
            </p>
            <span
              className="absolute top-4 left-4 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full text-white"
              style={{ background: "#2C25B5" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Más pedido
            </span>
          </div>

          {/* Copy */}
          <div className="order-1 lg:order-2">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: "#2C25B5", letterSpacing: "0.12em" }}
            >
              Producto destacado · Chipas
            </p>
            <h2
              className="text-4xl lg:text-5xl font-semibold text-neutral-900 leading-tight"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Chipa Long{" "}
              <span style={{ color: "#2C25B5" }}>Gourmet</span>
            </h2>
            <p className="mt-4 text-lg text-neutral-600 leading-relaxed">
              115 g por unidad. Tres quesos: sardo, tybo y provolone. Formato
              diseñado para cafeterías, estaciones de servicio y catering de
              alto volumen.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {specs.map(([k, v]) => (
                <div key={k} className="bg-white rounded-xl p-3">
                  <p className="font-mono text-xs text-neutral-400 uppercase tracking-wide">{k}</p>
                  <p className="mt-0.5 text-sm font-semibold text-neutral-800">{v}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-brand hover:bg-brand-hover transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
                Consultar por WhatsApp
              </a>
              <Link
                href="/tienda?categoria=chipas"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-neutral-700 border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              >
                Ver todas las chipas
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
