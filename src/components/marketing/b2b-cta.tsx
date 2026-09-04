const WA_NUMBER  = "5493765017944";
const WA_TEXT    = encodeURIComponent("Hola, quería consultar sobre condiciones mayoristas de En Minutas 🏪");
const WA_HREF    = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`;

const perks = [
  "Precios mayoristas desde la primera compra",
  "Factura A o B según condición IVA",
  "Cuenta corriente disponible",
  "Logística a medida (Posadas y envío al interior)",
  "Documentación SENASA para exportación",
];

const stats = [
  { v: "SENASA",  l: "Habilitación vigente" },
  { v: "−40 °C",  l: "Abatimiento Irinox" },
  { v: "18 m",   l: "Vida útil ultracongelado" },
  { v: "100%",   l: "Trazabilidad por lote" },
];

export function B2BCta() {
  return (
    <section className="py-20 bg-white" id="mayoristas">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl overflow-hidden" style={{ background: "#2C25B5" }}>
          <div className="grid lg:grid-cols-2 gap-0">

            {/* Copy */}
            <div className="p-10 lg:p-14 flex flex-col justify-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-4" style={{ letterSpacing: "0.12em" }}>
                Para gastronomía, retail y exportación
              </p>
              <h2
                className="text-3xl lg:text-4xl font-semibold text-white leading-tight"
                style={{ fontFamily: "var(--font-fredoka)" }}
              >
                ¿Comprás en volumen?<br />
                Hablemos.
              </h2>
              <p className="mt-4 text-white/70 text-base leading-relaxed max-w-md">
                Trabajamos con restaurantes, cafeterías, supermercados regionales y
                operadores de exportación. Condiciones a medida de tu negocio.
              </p>

              <ul className="mt-6 flex flex-col gap-2.5">
                {perks.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-white/80">
                    {/* check icon — sin librería */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C1D7E6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={WA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                  </svg>
                  Consultar condiciones
                </a>
              </div>
            </div>

            {/* Panel de datos verificables */}
            <div className="p-10 lg:p-14 flex flex-col justify-center gap-6" style={{ background: "rgba(0,0,0,0.15)" }}>
              <div className="grid grid-cols-2 gap-4">
                {stats.map(({ v, l }) => (
                  <div key={l} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <p
                      className="text-2xl font-semibold text-white tabular-nums"
                      style={{ fontFamily: "var(--font-fredoka)" }}
                    >
                      {v}
                    </p>
                    <p className="mt-1 text-xs text-white/50">{l}</p>
                  </div>
                ))}
              </div>

              {/* Zona testimonio — sin inventar */}
              <div
                className="rounded-xl p-5 border"
                style={{ borderColor: "rgba(193,215,230,0.2)", background: "rgba(255,255,255,0.05)" }}
              >
                <p className="text-sm text-white/40 italic">
                  [PENDIENTE — testimonio real de cliente mayorista]
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
