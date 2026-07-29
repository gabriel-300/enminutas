"use client";

import { useState, useTransition } from "react";
import { despacharPedidoConAjuste, type LineaAjuste } from "@/app/(admin)/admin/pedidos/actions";

type Linea = {
  lineId:    string;
  productId: string;
  name:      string;
  quantity:  number;
  unitPrice: number;
};

export function DespacharButton({ orderId, lines }: { orderId: string; lines: Linea[] }) {
  const [open,      setOpen]      = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, number>>(
    () => Object.fromEntries(lines.map((l) => [l.lineId, l.quantity]))
  );
  const [isPending, startTransition] = useTransition();
  const [error,     setError]        = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    const ajustes: LineaAjuste[] = lines.map((l) => ({
      lineId:           l.lineId,
      productId:        l.productId,
      quantityDespacho: cantidades[l.lineId] ?? l.quantity,
      unitPrice:        l.unitPrice,
    }));
    startTransition(async () => {
      try {
        await despacharPedidoConAjuste(orderId, ajustes);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al despachar");
      }
    });
  }

  const hayAjuste = lines.some((l) => (cantidades[l.lineId] ?? l.quantity) !== l.quantity);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 transition-colors"
      >
        Despachar ✓
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-sm font-semibold text-neutral-900">Confirmar despacho</p>
              <p className="text-xs text-neutral-400 mt-0.5">Ajustá las cantidades si corresponde</p>
            </div>

            <div className="px-5 py-4 space-y-3">
              {lines.map((l) => {
                const val = cantidades[l.lineId] ?? l.quantity;
                const reducido = val < l.quantity;
                return (
                  <div key={l.lineId} className="flex items-center gap-3">
                    <span className={`flex-1 text-sm truncate ${reducido ? "text-warning font-medium" : "text-neutral-700"}`}>
                      {l.name}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setCantidades((p) => ({ ...p, [l.lineId]: Math.max(0, (p[l.lineId] ?? l.quantity) - 1) }))}
                        className="w-7 h-7 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 flex items-center justify-center text-base leading-none"
                      >
                        −
                      </button>
                      <span className={`w-8 text-center text-sm font-semibold tabular-nums ${reducido ? "text-warning" : "text-neutral-900"}`}>
                        {val}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCantidades((p) => ({ ...p, [l.lineId]: Math.min(l.quantity, (p[l.lineId] ?? l.quantity) + 1) }))}
                        className="w-7 h-7 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 flex items-center justify-center text-base leading-none"
                      >
                        +
                      </button>
                      {reducido && (
                        <span className="text-xs text-neutral-400 tabular-nums">/{l.quantity}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {hayAjuste && (
              <div className="mx-5 mb-2 px-3 py-2 bg-warning-bg rounded-xl text-xs text-warning">
                Se modificarán las cantidades del pedido y se recalculará el total.
              </div>
            )}

            {error && (
              <p className="mx-5 mb-2 text-xs text-danger">{error}</p>
            )}

            <div className="px-5 py-4 border-t border-neutral-100 flex gap-2 justify-end">
              <button
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-900 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
              >
                {isPending ? "Procesando…" : hayAjuste ? "Despachar con ajuste" : "Confirmar despacho"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
