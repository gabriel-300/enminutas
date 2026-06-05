"use client";

import { useTransition } from "react";
import { eliminarCanal } from "./actions";

export function EliminarCanalBtn({ id, nombre }: { id: string; nombre: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`¿Eliminar el canal "${nombre}"?`)) return;
    startTransition(() => eliminarCanal(id));
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-danger hover:underline disabled:opacity-50"
    >
      {isPending ? "Eliminando…" : "Eliminar"}
    </button>
  );
}
