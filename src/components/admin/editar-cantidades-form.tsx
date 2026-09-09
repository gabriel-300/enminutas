"use client";

import { useState, useTransition } from "react";
import { editarCantidadesPedido } from "@/app/(admin)/admin/pedidos/actions";

type Line = {
  id: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  product_snapshot: { name?: string; sku?: string } | null;
};

const EDITABLE_STATUSES = ["aprobado", "enviado_prod"];

export function EditarCantidadesForm({
  orderId,
  status,
  lines,
}: {
  orderId: string;
  status: string;
  lines: Line[];
}) {
  const [editing, setEditing]   = useState(false);
  const [qtys, setQtys]         = useState<Record<string, string>>(
    Object.fromEntries(lines.map(l => [l.id, String(l.quantity)])),
  );
  const [error, setError]       = useState<string | null>(null);
  const [isPending, start]      = useTransition();

  if (!EDITABLE_STATUSES.includes(status)) return null;

  function handleChange(id: string, val: string) {
    setQtys(prev => ({ ...prev, [id]: val }));
  }

  function handleCancel() {
    setQtys(Object.fromEntries(lines.map(l => [l.id, String(l.quantity)])));
    setEditing(false);
    setError(null);
  }

  function handleSave() {
    setError(null);
    const parsed = lines.map(l => ({
      id:       l.id,
      quantity: parseInt(qtys[l.id] ?? "0", 10),
    }));
    if (parsed.some(l => isNaN(l.quantity) || l.quantity < 0)) {
      setError("Todas las cantidades deben ser números válidos (0 o más).");
      return;
    }
    start(async () => {
      const res = await editarCantidadesPedido(orderId, parsed);
      if ("error" in res) { setError(res.error); return; }
      setEditing(false);
    });
  }

  const fmt = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
  const inputCls = "w-20 text-right px-2 py-1 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50";

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-neutral-400 hover:text-blue-600 underline underline-offset-2 transition-colors"
      >
        Editar cantidades
      </button>
    );
  }

  return (
    <div className="border border-blue-200 rounded-2xl overflow-hidden bg-blue-50/30">
      <div className="px-5 py-3 border-b border-blue-100 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-blue-800">Editar cantidades</p>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            onClick={handleCancel}
            disabled={isPending}
            className="px-3 py-1.5 border border-neutral-200 text-xs text-neutral-500 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-blue-100">
            <th className="px-5 py-2.5 text-xs font-medium text-neutral-400">Producto</th>
            <th className="px-5 py-2.5 text-xs font-medium text-neutral-400 text-right">Precio u.</th>
            <th className="px-5 py-2.5 text-xs font-medium text-neutral-400 text-right">Cantidad</th>
            <th className="px-5 py-2.5 text-xs font-medium text-neutral-400 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {lines.map(line => {
            const q       = parseInt(qtys[line.id] ?? "0", 10);
            const subtotal = isNaN(q) ? 0 : q * Number(line.unit_price);
            const changed  = q !== line.quantity;
            return (
              <tr key={line.id} className={changed ? "bg-blue-50" : ""}>
                <td className="px-5 py-2.5 text-neutral-800">
                  {line.product_snapshot?.name ?? "Producto"}
                  {line.product_snapshot?.sku && (
                    <span className="ml-2 text-xs text-neutral-400 font-mono">
                      {line.product_snapshot.sku}
                    </span>
                  )}
                  {changed && (
                    <span className="ml-2 text-xs text-blue-600 font-medium">
                      (antes: {line.quantity})
                    </span>
                  )}
                </td>
                <td className="px-5 py-2.5 text-right text-neutral-500">
                  {fmt(Number(line.unit_price))}
                </td>
                <td className="px-5 py-2.5 text-right">
                  <input
                    type="number"
                    min="0"
                    value={qtys[line.id] ?? ""}
                    onChange={e => handleChange(line.id, e.target.value)}
                    disabled={isPending}
                    className={inputCls}
                  />
                </td>
                <td className="px-5 py-2.5 text-right font-medium text-neutral-900 tabular-nums">
                  {fmt(subtotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {error && (
        <div className="px-5 py-3 border-t border-red-100 text-sm text-red-600 bg-red-50">
          {error}
        </div>
      )}
    </div>
  );
}
