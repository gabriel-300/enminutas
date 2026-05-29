"use client";

import { useEffect } from "react";

export function PrintTrigger() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-neutral-900 text-white text-sm font-medium rounded-lg hover:opacity-90"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
