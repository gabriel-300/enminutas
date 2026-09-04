const pillars = [
  {
    title: "Planta propia en Posadas",
    body: "Elaboramos en nuestra planta habilitada por SENASA en Misiones. Horno Rational y abatidor Irinox garantizan consistencia industrial en cada lote.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="2" y="7" width="20" height="14" rx="1"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        <line x1="12" y1="3" x2="12" y2="7"/>
      </svg>
    ),
  },
  {
    title: "Materia prima del Litoral",
    body: "Pacú de Rosamonte, mandioca misionera y quesos regionales. Priorizamos proveedores locales para sostener la cadena de valor del NEA.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 22V12"/>
        <path d="M5 12C5 6.477 8.582 2 12 2s7 4.477 7 10H5z"/>
      </svg>
    ),
  },
  {
    title: "Cadena de frío sin cortes",
    body: "Abatimiento a −40 °C post-cocción. Distribución isotérmica con 18 meses de vida útil. Trazabilidad por lote desde planta hasta destino.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="12" y1="2" x2="12" y2="22"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    title: "Habilitación SENASA vigente",
    body: "Certificación para mercado interno y exportación. Documentación completa disponible para clientes export y operadores logísticos.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <polyline points="9 12 11 14 15 10"/>
      </svg>
    ),
  },
];

type Props = {
  titulo?: string;
  parrafo1?: string;
  parrafo2?: string;
};

export function Nosotros({ titulo, parrafo1, parrafo2 }: Props) {
  const t  = titulo   || "Cocina industrial con alma regional.";
  const p1 = parrafo1 || "En Minutas nació en Posadas para poner en valor la despensa del Litoral. Tomamos las recetas de siempre —chipa, empanada de río, bocadito de pacú— y les dimos proceso, cadena de frío y escala para llegar a cualquier mesa del país.";
  const p2 = parrafo2 || "Trabajamos con gastronomía, retail y exportación. El producto es el mismo: elaborado en planta, abatido a −40 °C, listo en doce minutos.";

  return (
    <section className="py-20 bg-white" id="nosotros">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#2C25B5", letterSpacing: "0.12em" }}>
              Quiénes somos
            </p>
            <h2 className="text-3xl lg:text-4xl font-semibold text-neutral-900 leading-tight" style={{ fontFamily: "var(--font-fredoka)" }}>
              {t}
            </h2>
            <p className="mt-5 text-lg text-neutral-600 leading-relaxed">{p1}</p>
            <p className="mt-4 text-base text-neutral-500 leading-relaxed">{p2}</p>
          </div>

          {/* Pilares */}
          <div className="grid sm:grid-cols-2 gap-4">
            {pillars.map(({ icon, title, body }) => (
              <div key={title} className="rounded-2xl p-5 flex flex-col gap-3 border" style={{ background: "#EAEBF8", borderColor: "#C1D7E6" }}>
                <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: "#C1D7E6" }}>
                  {icon}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
                  <p className="mt-1 text-sm text-neutral-500 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
