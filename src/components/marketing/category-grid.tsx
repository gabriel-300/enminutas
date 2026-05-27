import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Category } from "@/lib/data/products";

const PALETTE = [
  { bg: "bg-dorado-100", accent: "text-dorado-600" },
  { bg: "bg-tierra-100", accent: "text-tierra-700" },
  { bg: "bg-crema-200",  accent: "text-neutral-700" },
  { bg: "bg-selva-100",  accent: "text-selva-700"  },
];

type Props = { categories: Category[] };

export function CategoryGrid({ categories }: Props) {
  return (
    <section className="bg-crema-100 py-20" id="productos">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="font-mono text-xs uppercase tracking-widest text-tierra-700 mb-3">
            Líneas de producto
          </p>
          <h2 className="font-display text-3xl lg:text-4xl font-semibold text-neutral-900">
            Cuatro líneas, una sola{" "}
            <span className="text-tierra-700">mesa</span>.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat, i) => {
            const { bg, accent } = PALETTE[i % PALETTE.length];
            return (
              <Link
                key={cat.slug}
                href={`/tienda?categoria=${cat.slug}`}
                className="group rounded-2xl overflow-hidden bg-white border border-neutral-200 hover:border-neutral-300 hover:-translate-y-1 hover:shadow-md transition-all duration-200 flex flex-col"
              >
                <div className={`aspect-square w-full ${bg} flex items-center justify-center relative`}>
                  {cat.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center px-4">
                      <p className={`font-mono text-xs uppercase tracking-widest ${accent}`}>Foto línea</p>
                      <p className="font-display text-xl font-semibold text-neutral-700">{cat.name}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <p className={`font-mono text-xs uppercase tracking-wider ${accent}`}>{cat.name}</p>
                  {cat.description && (
                    <p className="text-sm text-neutral-500 leading-relaxed">{cat.description}</p>
                  )}
                  <div className={`mt-auto inline-flex items-center gap-1 text-sm font-medium ${accent} transition-all group-hover:gap-2`}>
                    Ver línea <ArrowRight className="size-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
