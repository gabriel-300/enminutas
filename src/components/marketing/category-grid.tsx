import Link from "next/link";
import type { Category } from "@/lib/data/products";

const PALETTE = [
  { bg: "#EAEBF8", accent: "#2C25B5" },
  { bg: "#D6E8F3", accent: "#1D3B5C" },
  { bg: "#F0F0F0", accent: "#374151" },
  { bg: "#E8F0EA", accent: "#1D4A29" },
];

type Props = { categories: Category[] };

export function CategoryGrid({ categories }: Props) {
  return (
    <section className="bg-white py-20" id="productos">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#2C25B5", letterSpacing: "0.12em" }}
          >
            Líneas de producto
          </p>
          <h2
            className="text-3xl lg:text-4xl font-semibold text-neutral-900"
            style={{ fontFamily: "var(--font-fredoka)" }}
          >
            De la mandioca a la masa madre, una sola{" "}
            <span style={{ color: "#2C25B5" }}>mesa</span>.
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
                <div
                  className="aspect-square w-full flex items-center justify-center relative"
                  style={{ background: bg }}
                >
                  {cat.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-center px-4">
                      <p className="font-mono text-xs uppercase tracking-widest" style={{ color: accent }}>
                        Foto línea
                      </p>
                      <p
                        className="text-xl font-semibold text-neutral-700"
                        style={{ fontFamily: "var(--font-fredoka)" }}
                      >
                        {cat.name}
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col gap-2 flex-1">
                  <p className="font-mono text-xs uppercase tracking-wider" style={{ color: accent }}>
                    {cat.name}
                  </p>
                  {cat.description && (
                    <p className="text-sm text-neutral-500 leading-relaxed">{cat.description}</p>
                  )}
                  <div
                    className="mt-auto inline-flex items-center gap-1 text-sm font-medium transition-all group-hover:gap-2"
                    style={{ color: accent }}
                  >
                    Ver línea
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                      <polyline points="12 5 19 12 12 19"/>
                    </svg>
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
