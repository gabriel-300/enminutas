"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[pedidos-list error boundary]", error.digest, error.message);
  }, [error]);

  return (
    <div className="p-8 max-w-md">
      <h2 className="text-lg font-semibold text-neutral-900 mb-2">
        Error al cargar los pedidos
      </h2>
      <p className="text-sm text-neutral-500 mb-1">
        {error.message || "Error inesperado en el servidor."}
      </p>
      {error.digest && (
        <p className="text-xs text-neutral-400 mb-4 font-mono">ID: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="px-4 py-2 bg-tierra-700 text-white rounded-xl text-sm font-medium hover:bg-tierra-800 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
