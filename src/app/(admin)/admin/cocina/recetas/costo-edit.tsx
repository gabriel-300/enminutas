"use client";

import { fmt } from "@/lib/format";
import { useState, useTransition } from "react";
import { sincronizarCostoProducto } from "./actions";

type Props = {
  productId:        string;
  costoProductoCaja: number;
  desactualizado:   boolean;
};

// El costo del producto ya no se edita a mano (tarea 82): sale siempre de la receta. Si quedó
// desactualizado (cambió el precio de algún insumo después de guardar la receta), un clic lo
// vuelve a calcular desde ahí -- nunca se puede tipear un valor suelto.
export function CostoCajaEdit({ productId, costoProductoCaja, desactualizado }: Props) {
  const [isPending, start] = useTransition();
  const [error, setError]  = useState<string | null>(null);

  function recalcular() {
    setError(null);
    start(async () => {
      const res = await sincronizarCostoProducto(productId);
      if ("error" in res) setError(res.error);
    });
  }

  if (!desactualizado) {
    return <span className="font-medium tabular-nums text-neutral-800">{fmt(costoProductoCaja)}</span>;
  }

  return (
    <button
      type="button"
      onClick={recalcular}
      disabled={isPending}
      title="El costo guardado difiere del costo real de la receta. Clic para recalcularlo."
      className="font-medium tabular-nums text-warning hover:underline disabled:opacity-50"
    >
      {fmt(costoProductoCaja)}
      <span className="ml-1">⚠</span>
      {isPending && <span className="ml-1 text-xs">recalculando…</span>}
      {error && <span className="block text-xs text-danger normal-case">{error}</span>}
    </button>
  );
}
