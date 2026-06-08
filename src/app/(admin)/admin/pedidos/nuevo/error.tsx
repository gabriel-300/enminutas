"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[nuevo-pedido error boundary] digest:", error.digest, "message:", error.message);
  }, [error]);

  return (
    <div className="p-8 max-w-md">
      <h2 className="text-lg font-semibold text-neutral-900 mb-2">
        Error al cargar el formulario
      </h2>
      <p className="text-sm text-neutral-500 mb-4">
        Hubo un problema al preparar el formulario. Por favor reintentá.
      </p>
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={() => unstable_retry()}
          className="px-4 py-2 bg-tierra-700 text-white rounded-xl text-sm font-medium hover:bg-tierra-800 transition-colors"
        >
          Reintentar
        </button>
        <Link
          href="/admin/pedidos"
          className="px-4 py-2 border border-neutral-200 text-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 transition-colors"
        >
          Volver a pedidos
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-neutral-400 mt-4 font-mono">ID: {error.digest}</p>
      )}
    </div>
  );
}
