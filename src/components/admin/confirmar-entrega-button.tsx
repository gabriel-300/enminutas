"use client";

import { useState, useTransition } from "react";
import { confirmarEntrega, confirmarEntregaParcial } from "@/app/(admin)/admin/pedidos/actions";

type Linea = { productId: string; name: string; pedido: number };

export function ConfirmarEntregaButton({
  orderId,
  lineas = [],
}: {
  orderId: string;
  lineas?: Linea[];
}) {
  const [mode, setMode]             = useState<"idle" | "confirm" | "parcial">("idle");
  const [cantidades, setCantidades] = useState<Record<string, number>>(
    Object.fromEntries(lineas.map((l) => [l.productId, l.pedido]))
  );
  const [isPending, startTransition] = useTransition();

  // ── Idle ─────────────────────────────────────────────────────────────────
  if (mode === "idle") {
    return (
      <div className="flex gap-2 justify-end flex-wrap">
        {lineas.length > 0 && (
          <button
            onClick={() => setMode("parcial")}
            className="px-3 py-2.5 text-sm rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            Entrega parcial
          </button>
        )}
        <button
          onClick={() => setMode("confirm")}
          className="px-4 py-2.5 rounded-xl bg-success text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Confirmar entrega ✓
        </button>
      </div>
    );
  }

  // ── Confirmar completa ────────────────────────────────────────────────────
  if (mode === "confirm") {
    return (
      <div className="w-full flex flex-col gap-2">
        <p className="text-xs text-neutral-500 text-center">¿Confirmar la entrega completa?</p>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("idle")}
            disabled={isPending}
            className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => startTransition(() => confirmarEntrega(orderId))}
            disabled={isPending}
            className="flex-1 px-3 py-2.5 text-sm rounded-xl bg-success text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isPending ? "…" : "Sí, entregar"}
          </button>
        </div>
      </div>
    );
  }

  // ── Entrega parcial ───────────────────────────────────────────────────────
  function handleParcial() {
    startTransition(async () => {
      const payload = lineas.map((l) => ({
        productId: l.productId,
        name:      l.name,
        pedido:    l.pedido,
        entregado: Math.max(0, Math.min(cantidades[l.productId] ?? 0, l.pedido)),
      }));
      await confirmarEntregaParcial(orderId, payload);
    });
  }

  return (
    <div className="w-full space-y-3">
      <p className="text-xs font-medium text-neutral-700">Ingresá las cantidades entregadas:</p>
      <div className="space-y-2">
        {lineas.map((l) => (
          <div key={l.productId} className="flex items-center gap-3">
            <p className="flex-1 text-sm text-neutral-700 truncate min-w-0">{l.name}</p>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number"
                min={0}
                max={l.pedido}
                value={cantidades[l.productId] ?? l.pedido}
                onChange={(e) =>
                  setCantidades((prev) => ({ ...prev, [l.productId]: Number(e.target.value) }))
                }
                className="w-16 text-center text-sm border border-neutral-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-tierra-700/20 focus:border-tierra-700"
              />
              <span className="text-xs text-neutral-400 w-10">/ {l.pedido}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setMode("idle")}
          disabled={isPending}
          className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleParcial}
          disabled={isPending}
          className="flex-1 px-3 py-2.5 text-sm rounded-xl bg-tierra-700 text-white font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Registrando…" : "Registrar entrega"}
        </button>
      </div>
    </div>
  );
}
