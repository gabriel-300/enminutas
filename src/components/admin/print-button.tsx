"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 text-sm font-medium rounded-xl border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors print:hidden"
    >
      Imprimir
    </button>
  );
}
