"use client";

import { useState, useTransition } from "react";
import { enviarMuestraAProd, despacharMuestra } from "./nueva/actions";

type Muestra = {
  id:                   string;
  order_number:         string;
  status:               string;
  created_at:           string;
  despachado_at:        string | null;
  muestra_destinatario: string | null;
  guest_email:          string | null;
  guest_phone:          string | null;
  notes:                string | null;
  lines:                { quantity: number; product_snapshot: { name: string } }[];
};

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  aprobado:     { label: "Pendiente",     cls: "bg-warning-bg text-warning" },
  enviado_prod: { label: "En producción", cls: "bg-blue-50 text-blue-600" },
  despachado:   { label: "Despachada",    cls: "bg-success-bg text-success" },
  delivered:    { label: "Entregada",     cls: "bg-success-bg text-success" },
};

function MuestraRow({
  muestra,
  esProduccion,
}: {
  muestra: Muestra;
  esProduccion: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const st = STATUS_LABEL[muestra.status] ?? { label: muestra.status, cls: "bg-neutral-100 text-neutral-500" };

  const productosResumen = muestra.lines
    .map((l) => `${l.product_snapshot?.name ?? "?"} ×${l.quantity}`)
    .join(", ");

  function handleEnviarProd() {
    setError(null);
    startTransition(async () => {
      try { await enviarMuestraAProd(muestra.id); }
      catch (e: any) { setError(e.message); }
    });
  }

  function handleDespachar() {
    setError(null);
    startTransition(async () => {
      try { await despacharMuestra(muestra.id); }
      catch (e: any) { setError(e.message); }
    });
  }

  return (
    <tr className="hover:bg-neutral-50 transition-colors align-top">
      <td className="px-4 py-3 text-xs font-mono text-neutral-400">{muestra.order_number}</td>
      <td className="px-4 py-3">
        <p className="font-medium text-sm text-neutral-900">{muestra.muestra_destinatario ?? "—"}</p>
        {muestra.guest_email && <p className="text-xs text-neutral-400">{muestra.guest_email}</p>}
        {muestra.guest_phone && <p className="text-xs text-neutral-400">{muestra.guest_phone}</p>}
      </td>
      <td className="px-4 py-3 text-xs text-neutral-600 max-w-xs">
        <span className="line-clamp-2">{productosResumen || "—"}</span>
        {muestra.notes && <p className="text-neutral-400 mt-0.5 italic">{muestra.notes}</p>}
      </td>
      <td className="px-4 py-3 text-xs text-neutral-400">
        {new Date(muestra.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
        {muestra.despachado_at && (
          <p className="text-neutral-300">
            Desp. {new Date(muestra.despachado_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
          {st.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {esProduccion && muestra.status === "aprobado" && (
          <button
            onClick={handleEnviarProd}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Enviar a prod.
          </button>
        )}
        {esProduccion && muestra.status === "enviado_prod" && (
          <button
            onClick={handleDespachar}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success text-white hover:opacity-90 disabled:opacity-50"
          >
            Despachar
          </button>
        )}
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </td>
    </tr>
  );
}

export function MuestrasClient({
  muestras,
  esAdmin,
  esProduccion,
}: {
  muestras:     Muestra[];
  esAdmin:      boolean;
  esProduccion: boolean;
}) {
  const [filtro, setFiltro] = useState<"todos" | "aprobado" | "enviado_prod" | "despachado">("todos");

  const filtradas = filtro === "todos"
    ? muestras
    : muestras.filter((m) => m.status === filtro);

  const tabs = [
    { key: "todos",        label: "Todos",         count: muestras.length },
    { key: "aprobado",     label: "Pendientes",     count: muestras.filter((m) => m.status === "aprobado").length },
    { key: "enviado_prod", label: "En producción",  count: muestras.filter((m) => m.status === "enviado_prod").length },
    { key: "despachado",   label: "Despachadas",    count: muestras.filter((m) => m.status === "despachado" || m.status === "delivered").length },
  ] as const;

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Filtros */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFiltro(t.key as any)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              filtro === t.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                filtro === t.key ? "bg-neutral-100 text-neutral-600" : "bg-neutral-200 text-neutral-500"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {filtradas.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-sm">
            No hay muestras en esta categoría.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="px-4 py-3 font-medium text-neutral-500 text-xs">N°</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-xs">Destinatario</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-xs">Productos</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-xs">Fecha</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-xs">Estado</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-xs">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtradas.map((m) => (
                <MuestraRow
                  key={m.id}
                  muestra={m}
                  esProduccion={esProduccion}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
