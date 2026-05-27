"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarProducto } from "@/app/(admin)/admin/productos/actions";

export function EliminarProductoButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm("¿Eliminar este producto? Esta acción no se puede deshacer.")) return;
    startTransition(async () => {
      await eliminarProducto(productId);
      router.push("/admin/productos");
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="px-3 py-2 text-xs rounded-lg border border-danger text-danger hover:bg-danger-bg transition-colors disabled:opacity-50"
    >
      {isPending ? "Eliminando…" : "Eliminar producto"}
    </button>
  );
}
