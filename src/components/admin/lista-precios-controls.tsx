"use client";

import { useRouter } from "next/navigation";

type Canal = { slug: string; label: string };

export function ListaPreciosControls({
  canales,
  canalActivo,
}: {
  canales: Canal[];
  canalActivo: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Selector de canal */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
        {canales.map((c) => (
          <button
            key={c.slug}
            onClick={() => router.push(`/admin/preventista/lista-precios?canal=${c.slug}`)}
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
