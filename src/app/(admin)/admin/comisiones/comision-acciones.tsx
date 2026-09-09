"use client";

import { useState, useTransition } from "react";
import { marcarComisionesPagadas, revertirComisionPagada } from "./actions";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const hoy = () => new Date().toISOString().slice(0, 10);

export type ComisionCliente = {
  id:           string;
  nombre:       string;
  ventas:       number;
  comision:     number;      // monto vigente: el pagado si ya está pagado, si no el calculado en vivo
  pct:          number;
  pagado:       boolean;
  fechaPago:    string | null;
};

type Props = {
  vendedorId: string;
  mes:        string;
  clientes:   ComisionCliente[];
};

export function ComisionAcciones({ vendedorId, mes, clientes }: Props) {
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [modo, setModo]     = useState<"idle" | "pagar">("idle");
  const [fecha, setFecha]   = useState(hoy());
  const [nota, setNota]     = useState("");
  const [error, setError]   = useState<string | null>(null);
  const [isPending, start]  = useTransition();

  const pendientes = clientes.filter((c) => !c.pagado && c.comision > 0);
  const totalSeleccionado = clientes
    .filter((c) => seleccionados.has(c.id))
    .reduce((s, c) => s + c.comision, 0);

  function toggle(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (seleccionados.size === pendientes.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(pendientes.map((c) => c.id)));
    }
  }

  function handleRevertir(clienteId: string) {
    if (!confirm("¿Revertir este pago a pendiente?")) return;
    start(async () => {
      const res = await revertirComisionPagada(vendedorId, mes, clienteId);
      if ("error" in res) setError(res.error);
    });
  }

  function handleConfirmarPago() {
    const items = clientes
      .filter((c) => seleccionados.has(c.id))
      .map((c) => ({ clienteId: c.id, monto: c.comision, pct: c.pct, ventas: c.ventas }));
    if (items.length === 0) return setError("Seleccioná al menos un cliente");
    setError(null);
    start(async () => {
      const res = await marcarComisionesPagadas({ vendedorId, mes, fechaPago: fecha, notas: nota, items });
      if ("error" in res) { setError(res.error); return; }
      setSeleccionados(new Set());
      setModo("idle");
      setNota("");
    });
  }

  return (
    <ul className="divide-y divide-neutral-50">
      {clientes.map((c) => {
        const puedeSeleccionar = !c.pagado && c.comision > 0;
        return (
          <li key={c.id} className="px-5 py-2 flex items-center gap-3">
            {puedeSeleccionar ? (
              <input
                type="checkbox"
                checked={seleccionados.has(c.id)}
                onChange={() => toggle(c.id)}
                disabled={isPending}
                className="rounded border-neutral-300 text-tierra-700 focus:ring-tierra-700/20 shrink-0"
              />
            ) : (
              <span className="size-3.5 shrink-0" />
            )}
            <span className="text-xs text-neutral-600 truncate flex-1 min-w-0">{c.nombre}</span>
            <span className="text-xs tabular-nums text-neutral-500 shrink-0">
              {fmt(c.ventas)} venta · <span className="font-medium text-neutral-700">{fmt(c.comision)} comisión</span>
            </span>
            {c.pagado ? (
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                  ✓ {c.fechaPago ? new Date(c.fechaPago + "T12:00:00").toLocaleDateString("es-AR") : "Pagada"}
                </span>
                <button
                  type="button" disabled={isPending}
                  onClick={() => handleRevertir(c.id)}
                  className="text-[10px] text-neutral-300 hover:text-red-500 disabled:opacity-40"
                >
                  Revertir
                </button>
              </span>
            ) : (
              <span className="w-14 shrink-0" />
            )}
          </li>
        );
      })}

      {pendientes.length > 0 && (
        <li className="px-5 py-3 bg-neutral-50/60">
          {modo === "idle" ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={toggleTodos}
                className="text-xs text-tierra-700 hover:underline"
              >
                {seleccionados.size === pendientes.length ? "Deseleccionar todos" : "Seleccionar todos los pendientes"}
              </button>
              <button
                type="button"
                disabled={seleccionados.size === 0}
                onClick={() => { setModo("pagar"); setFecha(hoy()); setError(null); }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Pagar {seleccionados.size > 0 ? `${seleccionados.size} cliente${seleccionados.size !== 1 ? "s" : ""} — ${fmt(totalSeleccionado)}` : "seleccionados"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-neutral-600">
                Marcar como pagados <strong>{seleccionados.size}</strong> cliente{seleccionados.size !== 1 ? "s" : ""} por <strong>{fmt(totalSeleccionado)}</strong>
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
                />
                <input
                  type="text" placeholder="Notas (opcional)" value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className="flex-1 min-w-[140px] px-2 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
                />
                <button
                  type="button" disabled={isPending}
                  onClick={() => setModo("idle")}
                  className="text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="button" disabled={isPending}
                  onClick={handleConfirmarPago}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors"
                >
                  {isPending ? "Guardando…" : "Confirmar"}
                </button>
              </div>
            </div>
          )}
          {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
        </li>
      )}
    </ul>
  );
}
