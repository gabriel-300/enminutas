import Link from "next/link";
import { ArrowRight, Snowflake, Clock, Leaf } from "lucide-react";
import { Button } from "@/components/ui";

const stats = [
  { value: "11+", label: "Variedades activas" },
  { value: "4",   label: "Líneas de producto" },
  { value: "−40°", label: "Abatimiento Irinox" },
  { value: "18 m", label: "Vida útil congelado" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-crema-50 pt-16 pb-0">
      {/* Fondo sutil */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,rgba(201,169,97,0.12),transparent)]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center pb-16 lg:pb-20">
          {/* Copy */}
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-tierra-700 mb-6">
              <span className="size-1.5 rounded-full bg-tierra-700 animate-pulse" />
              Finger Food Regional · Posadas, Misiones AR
            </div>

            <h1 className="font-display text-5xl lg:text-7xl font-semibold text-neutral-900 leading-[0.96] tracking-tight">
              Cocina del{" "}
              <span className="text-tierra-700">monte</span>,{" "}
              lista en{" "}
              <span className="text-dorado-500">minutos</span>.
            </h1>

            <p className="mt-6 text-lg text-neutral-600 max-w-md leading-relaxed">
              <strong className="text-neutral-800">Bocaditos, chipas, pizzas y empanadas</strong>{" "}
              elaborados con materia prima del Litoral, cocidos en horno
              Rational y ultracongelados con tecnología Irinox.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="gold" size="lg" asChild>
                <Link href="/tienda">
                  Ver catálogo
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="lg" asChild>
                <Link href="/registro-mayorista">Soy mayorista</Link>
              </Button>
            </div>

            {/* Chips de confianza */}
            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { icon: Snowflake, text: "Cadena de frío garantizada" },
                { icon: Leaf,      text: "Materia prima regional" },
                { icon: Clock,     text: "Listo en 12 minutos" },
              ].map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="inline-flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-600 text-xs px-3 py-1.5 rounded-full shadow-sm"
                >
                  <Icon className="size-3.5 text-tierra-700" />
                  {text}
                </span>
              ))}
            </div>
          </div>

          {/* Imagen placeholder editorial */}
          <div className="relative aspect-[4/5] lg:aspect-auto lg:h-[540px] rounded-2xl overflow-hidden bg-crema-200">
            {/* Overlay de patrón */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg,transparent 0 22px,rgba(107,36,23,0.04) 22px 23px)",
              }}
            />
            {/* Placeholder */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-tierra-400">
              <div className="size-12 rounded-xl bg-tierra-100 flex items-center justify-center">
                <Snowflake className="size-6 text-tierra-600" />
              </div>
              <p className="font-mono text-xs uppercase tracking-widest text-tierra-500">
                Foto producto hero
              </p>
              <p className="text-xs text-tierra-400">Bocaditos · línea principal</p>
            </div>

            {/* Badges flotantes */}
            <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm text-neutral-800 text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
              <span className="size-1.5 rounded-full bg-tierra-700 animate-pulse" />
              Producción activa · Lote 23
            </span>
            <span className="absolute top-4 right-4 bg-selva-700 text-white text-xs font-semibold px-3 py-1.5 rounded-full tracking-wide uppercase">
              For Export
            </span>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-neutral-200 rounded-2xl overflow-hidden -mb-px">
          {stats.map(({ value, label }) => (
            <div key={label} className="bg-white px-6 py-5">
              <p className="font-display text-4xl font-semibold text-neutral-900 tracking-tight">
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
