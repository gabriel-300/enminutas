import Link from "next/link";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui";

const perks = [
  "Precios mayoristas desde la primera compra",
  "Factura A o B según condición IVA",
  "Cuenta corriente disponible",
  "Logística a medida (Correo Argentino / Andreani)",
  "Documentación SENASA para export",
];

export function B2BCta() {
  return (
    <section className="py-20 bg-crema-50" id="mayoristas">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-selva-700 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Copy */}
            <div className="p-10 lg:p-14 flex flex-col justify-center">
              <p className="font-mono text-xs uppercase tracking-widest text-selva-300 mb-4">
                Para gastronomía, retail y export
              </p>
              <h2 className="font-display text-3xl lg:text-4xl font-semibold text-white leading-tight">
                ¿Comprás en{" "}
                <span className="text-dorado-400">volumen</span>?
                <br />
                Registrate como mayorista.
              </h2>
              <p className="mt-4 text-selva-200 text-base leading-relaxed max-w-md">
                Mismo producto, condiciones a medida. Trabajamos con restaurantes,
                cafeterías, supermercados regionales y operadores de exportación.
              </p>

              <ul className="mt-6 flex flex-col gap-2.5">
                {perks.map((p) => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-selva-100">
                    <CheckCircle className="size-4 text-dorado-400 mt-0.5 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="gold" asChild>
                  <Link href="/registro-mayorista">
                    Registrarme <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="border-white/20 text-white hover:bg-white/10 hover:border-white/40"
                  asChild
                >
                  <Link href="/contacto">Hablar con ventas</Link>
                </Button>
              </div>
            </div>

            {/* Panel de estadísticas */}
            <div className="bg-selva-800/50 p-10 lg:p-14 flex flex-col justify-center gap-8">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { v: "SENASA", l: "Habilitación vigente" },
                  { v: "12 t", l: "Capacidad mensual export" },
                  { v: "18 m", l: "Vida útil ultracongelado" },
                  { v: "QR", l: "Trazabilidad por lote" },
                ].map(({ v, l }) => (
                  <div key={l} className="bg-selva-700/60 rounded-xl p-4">
                    <p className="font-display text-2xl font-semibold text-dorado-400">{v}</p>
                    <p className="mt-1 text-xs text-selva-300">{l}</p>
                  </div>
                ))}
              </div>

              <blockquote className="border-l-2 border-dorado-500 pl-4">
                <p className="text-sm text-selva-200 italic leading-relaxed">
                  "El pacu de Rosamonte es único. Lo incorporamos al menú y se
                  convirtió en el bocado más pedido del salón."
                </p>
                <footer className="mt-2 font-mono text-xs text-selva-400 uppercase tracking-wide">
                  — Restaurante en Posadas, cliente desde 2025
                </footer>
              </blockquote>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
