import Link from "next/link";
import { Snowflake, ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui";

export function FeaturedProduct() {
  return (
    <section className="bg-crema-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Imagen */}
          <div className="relative aspect-[5/4] rounded-2xl overflow-hidden bg-tierra-100 order-2 lg:order-1">
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(135deg,transparent 0 20px,rgba(107,36,23,0.05) 20px 21px)",
              }}
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-tierra-400">
              <Snowflake className="size-8 text-tierra-500" />
              <p className="font-mono text-xs uppercase tracking-widest">Chipa Long Gourmet</p>
              <p className="text-xs text-tierra-400">Foto producto</p>
            </div>
            <span className="absolute top-4 left-4 inline-flex items-center gap-1 bg-dorado-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <Star className="size-3" fill="currentColor" /> Más pedido
            </span>
          </div>

          {/* Copy */}
          <div className="order-1 lg:order-2">
            <p className="font-mono text-xs uppercase tracking-widest text-tierra-700 mb-4">
              Producto destacado · Chipas
            </p>
            <h2 className="font-display text-4xl lg:text-5xl font-semibold text-neutral-900 leading-tight">
              Chipa Long{" "}
              <span className="text-dorado-500">Gourmet</span>
            </h2>
            <p className="mt-4 text-lg text-neutral-600 leading-relaxed">
              115 g por unidad. Tres quesos: sardo, tybo y provolone. Formato
              diseñado para cafeterías, estaciones de servicio y catering de
              alto volumen.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                ["Formato", "Caja × 30 u"],
                ["Canal", "Cafetería · YPF"],
                ["Cocción", "Horno convencional"],
                ["Tiempo", "12 min a 180°C"],
              ].map(([k, v]) => (
                <div key={k} className="bg-crema-100 rounded-xl p-3">
                  <p className="font-mono text-xs text-neutral-400 uppercase tracking-wide">{k}</p>
                  <p className="mt-0.5 text-sm font-semibold text-neutral-800">{v}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="gold" asChild>
                <Link href="/tienda?categoria=chipas">
                  Comprar ahora <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/producto/chipa-long-gourmet-x30">Ver ficha completa</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
