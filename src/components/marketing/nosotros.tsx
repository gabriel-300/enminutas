// Íconos de marca según manual de identidad visual
const IconHorno = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
    <rect x="3" y="7" width="26" height="18" rx="3" stroke="#2C25B5" strokeWidth="2"/>
    <rect x="7" y="11" width="18" height="10" rx="1.5" stroke="#2C25B5" strokeWidth="1.5"/>
    <path d="M10 15h2M14 13v4M16 13v4" stroke="#2C25B5" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx="24" cy="5" r="1.5" fill="#2C25B5"/>
    <circle cx="28" cy="5" r="1.5" fill="#2C25B5"/>
  </svg>
);
const IconTimer = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
    <circle cx="16" cy="18" r="10" stroke="#2C25B5" strokeWidth="2"/>
    <path d="M16 12v6l3 3" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 4c1.7-.8 3.8-1 6-1s4.3.2 6 1" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round"/>
    <path d="M25 8l1.5-1.5" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconOlla = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
    <path d="M8 13h16v8a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4v-8z" stroke="#2C25B5" strokeWidth="2"/>
    <path d="M8 13c0-2.2 1.8-4 4-4h8c2.2 0 4 1.8 4 4" stroke="#2C25B5" strokeWidth="2"/>
    <circle cx="16" cy="6" r="2" fill="#2C25B5"/>
    <path d="M5 15H3M29 15h-2" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconCheck = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none" aria-hidden>
    <path d="M28 16c0 6.627-5.373 12-12 12S4 22.627 4 16 9.373 4 16 4" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round"/>
    <path d="M22 4l2.5 2.5L19 12" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11 16l3 3 7-7" stroke="#2C25B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M27 7l1.5-2M29.5 10l2-1" stroke="#2C25B5" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const pillars = [
  {
    title: "Planta propia en Posadas",
    body: "Elaboramos en nuestra planta habilitada por SENASA. Horno Rational y abatidor Irinox garantizan consistencia industrial en cada lote.",
    icon: <IconHorno />,
  },
  {
    title: "La mandioca como base",
    body: "Mandioca, pacú y quesos, elegidos por calidad y trazabilidad. Sostenemos relaciones directas con productores para asegurar consistencia todo el año.",
    icon: <IconTimer />,
  },
  {
    title: "Cadena de frío sin cortes",
    body: "Abatimiento a −40 °C post-cocción. Distribución isotérmica con 18 meses de vida útil. Trazabilidad por lote desde planta hasta destino.",
    icon: <IconOlla />,
  },
  {
    title: "Habilitación SENASA vigente",
    body: "Certificación para mercado interno y exportación. Documentación completa disponible para clientes export y operadores logísticos.",
    icon: <IconCheck />,
  },
];

type Props = {
  titulo?: string;
  parrafo1?: string;
  parrafo2?: string;
};

export function Nosotros({ titulo, parrafo1, parrafo2 }: Props) {
  const t  = titulo   || "Cocina industrial, con la mandioca como eje.";
  const p1 = parrafo1 || "En Minutas nació en Posadas, Misiones, elaborando bastones y bocaditos a base de mandioca. Hoy sumamos chipas, empanadas y pizzas ultracongeladas, siempre con el mismo proceso: cocción en horno Rational, abatimiento a −40 °C y cadena de frío hasta cualquier mesa del país.";
  const p2 = parrafo2 || "Trabajamos con gastronomía, retail y exportación. El producto es el mismo: elaborado en planta propia, abatido a −40 °C, listo en doce minutos.";

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
