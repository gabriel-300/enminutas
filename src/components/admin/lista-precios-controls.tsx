"use client";

import { useRouter } from "next/navigation";

type Canal = { slug: string; label: string };
type Zona  = { id: string; name: string; flete_pct: number };

export function ListaPreciosControls({
  canales,
  canalActivo,
  zonas,
  zonaActiva,
}: {
  canales:     Canal[];
  canalActivo: string;
  zonas:       Zona[];
  zonaActiva:  string;
}) {
  const router = useRouter();

  function ir(canal: string, zona: string) {
    const qs = new URLSearchParams({ canal });
    if (zona) qs.set("zona", zona);
    router.push(`/admin/preventista/lista-precios?${qs.toString()}`);
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Zona de entrega: los precios de la lista ya incluyen el flete de la zona */}
      <select
        value={zonaActiva}
        onChange={(e) => ir(canalActivo, e.target.value)}
        aria-label="Zona de entrega"
        className="px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
      >
        <option value="">Zona de entrega…</option>
        {zonas.map((z) => (
          <option key={z.id} value={z.id}>
            {z.name}{z.flete_pct > 0 ? ` (+${Math.round(z.flete_pct * 10000) / 100}%)` : ""}
          </option>
        ))}
      </select>

      {/* Selector de canal */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
        {canales.map((c) => (
          <button
            key={c.slug}
            onClick={() => ir(c.slug, zonaActiva)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              c.slug === canalActivo
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Botón imprimir */}
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-tierra-700 text-white text-sm font-medium rounded-xl hover:bg-tierra-800 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
        </svg>
        Imprimir
      </button>
    </div>
  );
}
