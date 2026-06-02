"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function DistribucionZonaFiltro({ zonas }: { zonas: string[] }) {
  const router     = useRouter();
  const pathname   = usePathname();
  const params     = useSearchParams();
  const zonaActual = params.get("zona");

  const setZona = (zona: string | null) => {
    const sp = new URLSearchParams(params.toString());
    if (zona) sp.set("zona", zona);
    else sp.delete("zona");
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <div className="flex gap-2 flex-wrap mb-6">
      <button
        onClick={() => setZona(null)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          !zonaActual
            ? "bg-neutral-900 text-white"
            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
        }`}
      >
        Todas
      </button>
      {zonas.map((zona) => (
        <button
          key={zona}
          onClick={() => setZona(zona)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            zonaActual === zona
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          {zona}
        </button>
      ))}
    </div>
  );
}
