"use client";
export function PrintButton() {
  return (
    <button onClick={() => window.print()}
      className="px-4 py-1.5 rounded-lg bg-white text-neutral-900 text-sm font-semibold hover:bg-neutral-100 transition-colors">
      Imprimir
    </button>
  );
}
