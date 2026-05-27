import { Thermometer, Award, Leaf, Factory } from "lucide-react";

const pillars = [
  {
    icon: Factory,
    title: "Planta propia en Posadas",
    body: "Elaboramos en nuestra planta habilitada por SENASA en Misiones. Horno Rational y abatidor Irinox garantizan consistencia industrial en cada lote.",
  },
  {
    icon: Leaf,
    title: "Materia prima del Litoral",
    body: "Pacú de Rosamonte, mandioca misionera y quesos regionales. Priorizamos proveedores locales para sostener la cadena de valor del NEA.",
  },
  {
    icon: Thermometer,
    title: "Cadena de frío sin cortes",
    body: "Abatimiento a −40 °C post-cocción. Distribución isotérmica con 18 meses de vida útil. Trazabilidad por lote desde planta hasta destino.",
  },
  {
    icon: Award,
    title: "Habilitación SENASA vigente",
    body: "Certificación para mercado interno y exportación. Documentación completa disponible para clientes export y operadores logísticos.",
  },
];

export function Nosotros() {
  return (
    <section className="py-20 bg-white" id="nosotros">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-tierra-700 mb-4">
              Quiénes somos
            </p>
            <h2 className="font-display text-3xl lg:text-4xl font-semibold text-neutral-900 leading-tight">
              Cocina industrial con{" "}
              <span className="text-tierra-700">alma regional</span>.
            </h2>
            <p className="mt-5 text-lg text-neutral-600 leading-relaxed">
              En Minutas nació en Posadas para poner en valor la despensa del Litoral.
              Tomamos las recetas de siempre —chipa, empanada de río, bocadito de pacu—
              y les dimos proceso, cadena de frío y escala para llegar a cualquier mesa
              del país.
            </p>
            <p className="mt-4 text-base text-neutral-500 leading-relaxed">
              Trabajamos con gastronomía, retail y export. Si comprás una unidad o un
              contenedor, el producto es el mismo: elaborado ese día, abatido a −40 °C,
              listo en doce minutos.
            </p>
          </div>

          {/* Pilares */}
          <div className="grid sm:grid-cols-2 gap-4">
            {pillars.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl bg-crema-50 border border-neutral-200 p-5 flex flex-col gap-3"
              >
                <div className="size-9 rounded-xl bg-tierra-700/10 flex items-center justify-center">
                  <Icon className="size-4 text-tierra-700" />
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
