const WA_NUMBER = "5493765017944";
const WA_TEXT   = encodeURIComponent("Hola, quería pedir información sobre los productos de En Minutas 👋");
const WA_HREF   = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`;

const STATS = [
  { value: "−40 °C", label: "Abatimiento Irinox" },
  { value: "18 m",   label: "Vida útil congelado" },
  { value: "12 min", label: "Para calentar y servir" },
  { value: "4",      label: "Líneas de producto" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-white pt-12 pb-0">

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center pb-16 lg:pb-20">

          {/* Copy */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-5"
              style={{ color: "#2C25B5", letterSpacing: "0.12em" }}
            >
              Finger food regional · Posadas, Misiones
            </p>

            <h1
              className="text-5xl lg:text-6xl font-semibold text-neutral-900 leading-[1.05] tracking-tight"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              Bocaditos, chipas y empanadas{" "}
              <span style={{ color: "#2C25B5" }}>de Misiones</span>,{" "}
              listos en minutos.
            </h1>

            <p className="mt-6 text-lg text-neutral-600 max-w-md leading-relaxed">
              Elaborados con materia prima del Litoral, cocidos en horno Rational
              y ultracongelados con tecnología Irinox. Desde Posadas para todo el país.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-base font-semibold text-white bg-brand hover:bg-brand-hover transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
                Consultar por WhatsApp
              </a>
              <a
                href="/tienda"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-neutral-700 border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              >
                Ver catálogo
              </a>
            </div>

            {/* Atributos reales */}
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                "Cadena de frío garantizada",
                "Materia prima regional",
                "SENASA habilitado",
              ].map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium"
                  style={{ borderColor: "#C1D7E6", background: "#EAEBF8", color: "#2C25B5" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Imagen — [PENDIENTE: falta foto real del producto hero] */}
          <div
            className="relative aspect-[4/5] lg:aspect-auto lg:h-[520px] rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3"
            style={{ background: "#EAEBF8", border: "2px dashed #C1D7E6" }}
          >
            <div
              className="size-14 rounded-2xl flex items-center justify-center"
              style={{ background: "#C1D7E6" }}
            >
              {/* ícono olla — marca propia */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2C25B5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 10h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8z"/>
                <path d="M8 10V7a4 4 0 0 1 8 0v3"/>
                <path d="M7 6h10"/>
                <line x1="9" y1="14" x2="9" y2="16"/>
                <line x1="12" y1="14" x2="12" y2="17"/>
                <line x1="15" y1="14" x2="15" y2="16"/>
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#2C25B5" }}>
              [PENDIENTE — foto real del producto]
            </p>
            <p className="text-xs" style={{ color: "#7B77D4" }}>
              Bocaditos · línea principal
            </p>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-2xl overflow-hidden -mb-px" style={{ background: "#C1D7E6" }}>
          {STATS.map(({ value, label }) => (
            <div key={label} className="bg-white px-6 py-5">
              <p
                className="text-3xl font-semibold tabular-nums"
                style={{ fontFamily: "var(--font-fredoka)", color: "#2C25B5" }}
              >
                {value}
              </p>
              <p className="mt-1 text-sm text-neutral-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
