"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarPlantilla, getPlantillaItems } from "./actions";
import { Trash2, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";

const REORDER_KEY = "b2b-reorder-pending";

type Item = { productoId: string; cantidad: number; nombre: string; unitLabel: string | null };
type Plantilla = { id: string; nombre: string; created_at: string; items: Item[] };

export function PlantillasClient({ plantillas }: { plantillas: Plantilla[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [expandido, setExpandido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleUsar(plantilla: Plantilla) {
    start(async () => {
      setError(null);
      const res = await getPlantillaItems(plantilla.id);
      if (res.error || !res.items) { setError(res.error ?? "Error al cargar"); return; }
      const qtys: Record<string, number> = {};
      for (const i of res.items) qtys[i.productoId] = i.cantidad;
      localStorage.setItem(REORDER_KEY, JSON.stringify(qtys));
      router.push("/b2b/catalogo");
    });
  }

  function handleEliminar(id: string, nombre: string) {
    if (!confirm(`¿Eliminar la plantilla "${nombre}"?`)) return;
    start(async () => {
      const res = await eliminarPlantilla(id);
      if (res.error) setError(res.error);
    });
  }

  if (plantillas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center">
        <p className="text-sm text-neutral-400 mb-3">Todavía no tenés plantillas guardadas.</p>
        <p className="text-xs text-neutral-400">
          Podés guardar un pedido como plantilla desde la pantalla de detalle de un pedido anterior.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {plantillas.map(p => (
        <div key={p.id} className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          {/* Header de la plantilla */}
          <div className="flex items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-neutral-900">{p.nombre}</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                {p.items.length} producto{p.items.length !== 1 ? "s" : ""} ·{" "}
                {new Date(p.created_at).toLocaleDateString("es-AR")}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => setExpandido(v => v === p.id ? null : p.id)}
                className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700 transition-colors"
                title={expandido === p.id ? "Ocultar items" : "Ver items"}
              >
                {expandido === p.id ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
              <button
                onClick={() => handleUsar(p)}
                disabled={pending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tierra-700 text-white text-xs font-semibold hover:bg-tierra-800 transition-colors disabled:opacity-50"
              >
                <ShoppingCart className="size-3.5" />
                Usar plantilla
              </button>
              <button
                onClick={() => handleEliminar(p.id, p.nombre)}
                disabled={pending}
                className="p-2 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                title="Eliminar plantilla"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>

          {/* Items expandibles */}
          {expandido === p.id && (
            <div className="border-t border-neutral-100 px-4 py-3">
              <ul className="space-y-1.5">
                {p.items.map((item, i) => (
                  <li key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="font-bold tabular-nums text-neutral-800 w-8 text-right shrink-0">
                      {item.cantidad}×
                    </span>
                    <span className="text-neutral-700">{item.nombre}</span>
                    {item.unitLabel && (
                      <span className="text-xs text-neutral-400">{item.unitLabel}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
