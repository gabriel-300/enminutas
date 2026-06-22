"use client";

import { useState, useTransition } from "react";
import { crearLiquidacion, marcarPagada, eliminarLiquidacion } from "./actions";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

type Liquidacion = {
  id: string;
  period_start: string;
  period_end: string;
  total_gmv: number;
  total_commission: number;
  orders_count: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
};

type Pedido = {
  id: string;
  order_number: string;
  total: number;
  ideia_commission_amount: number;
  created_at: string;
};

export function LiquidacionesClient({
  liquidaciones,
  pedidos,
}: {
  liquidaciones: Liquidacion[];
  pedidos: Pedido[];
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showPedidos, setShowPedidos] = useState(false);

  const [form, setForm] = useState({
    period_start: "",
    period_end:   "",
    notes:        "",
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await crearLiquidacion(form.period_start, form.period_end, form.notes);
        setShowForm(false);
        setForm({ period_start: "", period_end: "", notes: "" });
      } catch (err: any) {
        setError(err.message ?? "Error al crear liquidación");
      }
    });
  }

  function handlePagar(id: string) {
    if (!confirm("¿Marcar esta liquidación como pagada? Esta acción no se puede deshacer.")) return;
    setError(null);
    startTransition(async () => {
      try { await marcarPagada(id); }
      catch (err: any) { setError(err.message); }
    });
  }

  function handleEliminar(id: string) {
    if (!confirm("¿Eliminar este borrador?")) return;
    setError(null);
    startTransition(async () => {
      try { await eliminarLiquidacion(id); }
      catch (err: any) { setError(err.message); }
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 text-sm font-medium bg-tierra-700 text-white rounded-lg hover:bg-tierra-800 transition-colors"
        >
          {showForm ? "Cancelar" : "+ Nueva liquidación"}
        </button>
        {pedidos.length > 0 && (
          <button
            onClick={() => setShowPedidos((v) => !v)}
            className="px-4 py-2 text-sm font-medium border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            {showPedidos ? "Ocultar pedidos" : `Ver ${pedidos.length} pedidos liquidados`}
          </button>
        )}
      </div>

      {/* Formulario nueva liquidación */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-neutral-800">Nueva liquidación</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600">Desde</label>
              <input
                type="date"
                required
                value={form.period_start}
                onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tierra-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600">Hasta</label>
              <input
                type="date"
                required
                value={form.period_end}
                onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tierra-500"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">Notas (opcional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tierra-500 resize-none"
              placeholder="Referencia de transferencia, observaciones..."
            />
          </div>
          <p className="text-xs text-neutral-400">
            Se calcularán automáticamente el GMV y la comisión de todos los pedidos con estado &quot;liquidado&quot; dentro del período.
          </p>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-tierra-700 text-white rounded-lg hover:bg-tierra-800 disabled:opacity-50 transition-colors"
            >
              {isPending ? "Creando..." : "Crear liquidación"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-700">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tabla de liquidaciones */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <p className="text-sm font-medium text-neutral-700">Historial de liquidaciones</p>
        </div>
        {liquidaciones.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-400">
            Sin liquidaciones registradas. Creá la primera con el botón de arriba.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400">Período</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Pedidos</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">GMV</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Comisión IDEIA</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400">Estado</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400">Notas</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {liquidaciones.map((liq) => (
                  <tr key={liq.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-3 font-medium text-neutral-800 whitespace-nowrap">
                      {fmtDate(liq.period_start)} – {fmtDate(liq.period_end)}
                    </td>
                    <td className="px-5 py-3 text-right text-neutral-600 tabular-nums">{liq.orders_count}</td>
                    <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">{fmt(Number(liq.total_gmv))}</td>
                    <td className="px-5 py-3 text-right font-semibold text-tierra-700 tabular-nums">{fmt(Number(liq.total_commission))}</td>
                    <td className="px-5 py-3">
                      {liq.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                          ✓ Pagado {liq.paid_at ? fmtDate(liq.paid_at) : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          Borrador
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs text-neutral-400 max-w-[160px] truncate">
                      {liq.notes ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      {liq.status === "draft" && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePagar(liq.id)}
                            disabled={isPending}
                            className="text-xs font-medium text-green-600 hover:text-green-800 disabled:opacity-40"
                          >
                            Marcar pagado
                          </button>
                          <span className="text-neutral-200">|</span>
                          <button
                            onClick={() => handleEliminar(liq.id)}
                            disabled={isPending}
                            className="text-xs font-medium text-red-400 hover:text-red-600 disabled:opacity-40"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pedidos con status liquidado */}
      {showPedidos && pedidos.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <p className="text-sm font-medium text-neutral-700">Pedidos con estado &quot;liquidado&quot;</p>
            <p className="text-xs text-neutral-400 mt-0.5">Referencia para armar períodos de liquidación</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400">Pedido</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400">Fecha</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Total</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Comisión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {pedidos.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-2.5 font-medium text-neutral-800">{p.order_number}</td>
                    <td className="px-5 py-2.5 text-neutral-500">{fmtDate(p.created_at)}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-neutral-900 tabular-nums">{fmt(Number(p.total))}</td>
                    <td className="px-5 py-2.5 text-right text-tierra-700 tabular-nums">{fmt(Number(p.ideia_commission_amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
