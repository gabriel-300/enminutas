import Image from "next/image";
import { BrandPattern } from "./brand-pattern";

const WA_NUMBER = "5493765017944";
const WA_TEXT   = encodeURIComponent("Hola, quería pedir información sobre los productos de En Minutas 👋");
const WA_HREF   = `https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`;

const DEFAULT_STATS = [
  { value: "18 m",   label: "Vida útil congelado" },
  { value: "12 min", label: "Para calentar y servir" },
  { value: "5",      label: "Líneas de producto" },
];

const DEFAULT_BADGES = ["Cadena de frío garantizada", "Cero merma", "Envíos a todo el país"];

type Props = {
  titulo?: string;
  descripcion?: string;
  imagenUrl?: string | null;
  eyebrow?: string;
  badges?: string[];
  stats?: Array<{ value: string; label: string }>;
};

const DEFAULT_TITULO      = "Ultracongelados listos en minutos, para cualquier mesa del país.";
const DEFAULT_DESCRIPCION = "Nuestra línea insignia es a base de mandioca —bastones, noisettes y bocaditos—, con cero merma y porciones consistentes para gastronomía. También chipas, empanadas y pizzas ultracongeladas, con envíos a todo el país.";
const DEFAULT_EYEBROW     = "Alimentos ultracongelados para todos los días";

export function Hero({ titulo, descripcion, imagenUrl, eyebrow, badges, stats }: Props) {
  const t      = titulo      || DEFAULT_TITULO;
  const d      = descripcion || DEFAULT_DESCRIPCION;
  const ew     = eyebrow     || DEFAULT_EYEBROW;
  const bdgs   = (badges && badges.length > 0) ? badges : DEFAULT_BADGES;
  // page.tsx ya resuelve defaults vs CMS — usar directamente lo que llega
  const sts    = stats ?? DEFAULT_STATS;

  const accent = "mandioca";
  const accentIdx = t.indexOf(accent);
  const titleParts = accentIdx >= 0
    ? [t.slice(0, accentIdx), accent, t.slice(accentIdx + accent.length)]
    : [t, null, null];

  return (
    <section className="relative overflow-hidden bg-white pt-12 pb-0">
      <BrandPattern />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center pb-16 lg:pb-20">

          {/* Copy */}
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-5"
              style={{ color: "#2C25B5", letterSpacing: "0.12em" }}
            >
              {ew}
            </p>

            <h1
              className="text-3xl sm:text-5xl lg:text-6xl font-semibold text-neutral-900 leading-[1.05] tracking-tight"
              style={{ fontFamily: "var(--font-fredoka)" }}
            >
              {titleParts[1] ? (
                <>
                  {titleParts[0]}
                  <span style={{ color: "#2C25B5" }}>{titleParts[1]}</span>
                  {titleParts[2]}
                </>
              ) : t}
            </h1>

            <p className="mt-6 text-lg text-neutral-600 max-w-md leading-relaxed">{d}</p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Consultar por WhatsApp"
                className="inline-flex items-center justify-center size-14 rounded-xl text-white bg-brand hover:bg-brand-hover transition-colors"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
              </a>
              <a
                href="/tienda"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-base font-semibold text-neutral-700 border border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              >
                Ver catálogo
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {bdgs.filter(Boolean).map((tag) => (
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

          {/* Imagen */}
          <div
            className="relative aspect-[4/5] lg:aspect-auto lg:h-[520px] rounded-2xl overflow-hidden flex flex-col items-center justify-center gap-3"
            style={imagenUrl ? {} : { background: "#EAEBF8", border: "2px dashed #C1D7E6" }}
          >
            {imagenUrl ? (
              <Image src={imagenUrl} alt="Productos En Minutas" fill className="object-cover" unoptimized />
            ) : (
              <>
                <div className="size-14 rounded-2xl flex items-center justify-center" style={{ background: "#C1D7E6" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2C25B5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#2C25B5" }}>
                  [PENDIENTE — foto real del producto]
                </p>
                <p className="text-xs" style={{ color: "#7B77D4" }}>Subila desde Admin → Contenido web</p>
              </>
            )}
          </div>
        </div>

        {/* Stats strip */}
        {sts.length > 0 && (
          <div
            className={`grid gap-px rounded-2xl overflow-hidden -mb-px ${
              sts.length === 1 ? "grid-cols-1" :
              sts.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
                                 "grid-cols-1 sm:grid-cols-3"
            }`}
            style={{ background: "#C1D7E6" }}
          >
            {sts.map(({ value, label }) => (
              <div key={label} className="bg-white px-6 py-5">
                <p className="text-3xl font-semibold tabular-nums" style={{ fontFamily: "var(--font-fredoka)", color: "#2C25B5" }}>
                  {value}
                </p>
                <p className="mt-1 text-sm text-neutral-500">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
