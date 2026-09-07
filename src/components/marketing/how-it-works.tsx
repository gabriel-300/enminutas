const WA_TEXT = encodeURIComponent("Hola, quería hacer un pedido de productos En Minutas 🛒");

const WA_SVG_PATH = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z";

const STEP_ICONS = [
  <svg key="wa" width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden>
    <path d={WA_SVG_PATH}/>
  </svg>,
  <svg key="truck" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="1" y="3" width="15" height="13" rx="1"/>
    <path d="M16 8h4l3 3v5h-7V8z"/>
    <circle cx="5.5" cy="18.5" r="2.5"/>
    <circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>,
  <svg key="snow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="12" y1="2" x2="12" y2="22"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    <line x1="8" y1="2" x2="16" y2="2"/>
    <line x1="8" y1="22" x2="16" y2="22"/>
  </svg>,
];

const DEFAULT_PASOS = [
  { titulo: "Consultás por WhatsApp",     desc: "Escribinos, te contamos qué productos tenemos disponibles y coordinamos la entrega según tu zona." },
  { titulo: "Coordinamos pago y entrega", desc: "Acordamos forma de pago y te organizamos la entrega. Posadas y alrededores, o envío al interior del país." },
  { titulo: "Recibís con cadena de frío", desc: "Producto ultracongelado a −40 °C. Listo para calentar en 12 minutos. Hasta 18 meses de vida útil congelado." },
];

type Props = {
  titulo?: string;
  pasos?: Array<{ titulo: string; desc: string }>;
  whatsapp?: string;
};

export function HowItWorks({ titulo, pasos, whatsapp = "5493765017944" }: Props) {
  const t      = titulo || "Simple, directo, sin vueltas.";
  const ps     = (pasos && pasos.length > 0) ? pasos : DEFAULT_PASOS;
  const waHref = `https://wa.me/${whatsapp}?text=${WA_TEXT}`;

  return (
    <section
      className="py-20 mx-4 sm:mx-6 lg:mx-8 rounded-2xl"
      id="como-funciona"
      style={{ background: "#2C25B5" }}
    >
      <div className="mx-auto max-w-4xl px-8 lg:px-16">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-3" style={{ letterSpacing: "0.12em" }}>
            Cómo funciona
          </p>
          <h2
            className="text-3xl lg:text-4xl font-semibold text-white"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            {t}
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {ps.map(({ titulo: pt, desc }, i) => (
            <div key={i} className="flex flex-col items-center text-center gap-4">
              <div
                className="size-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(255,255,255,0.12)" }}
              >
                {STEP_ICONS[i] ?? STEP_ICONS[0]}
              </div>
              <div>
                <p className="text-xs font-semibold text-white/40 mb-2" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3
                  className="text-xl font-semibold text-white mb-2"
                  style={{ fontFamily: "var(--font-fredoka)" }}
                >
                  {pt}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center size-14 rounded-xl text-white transition-colors hover:opacity-90"
            style={{ background: "#25D366" }}
            aria-label="Consultar por WhatsApp"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d={WA_SVG_PATH}/>
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
