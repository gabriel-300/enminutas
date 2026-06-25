"use client";

import { useState, useTransition, useId } from "react";
import { guardarPlantillaDesdeOrden } from "@/app/(b2b)/b2b/plantillas/actions";
import { BookmarkPlus, X, Check } from "lucide-react";

export function GuardarPlantillaButton({ orderId }: { orderId: string }) {
  const formId = useId();
  const [open, setOpen]       = useState(false);
  const [nombre, setNombre]   = useState("");
  const [pending, start]      = useTransition();
  const [error, setError]     = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);

  function handleGuardar(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { setError("Ingresá un nombre"); return; }
    setError(null);
    start(async () => {
      const res = await guardarPlantillaDesdeOrden(orderId, nombre);
      if (res.error) { setError(res.error); return; }
      setGuardado(true);
      setTimeout(() => { setOpen(false); setGuardado(false); setNombre(""); }, 1500);
    });
  }

  if (guardado) {
    return (
      <div className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-emerald-700">
        <Check className="size-4" /> Plantilla guardada
      </div>
    );
  }

  if (open) {
    return (
      <form onSubmit={handleGuardar} className="flex gap-2 mt-2">
        <input
          id={`${formId}-nombre`}
          autoFocus
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Nombre de la plantilla…"
          className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tierra-500/20 focus:border-tierra-500"
        />
        <button type="submit" disabled={pending}
          className="px-3 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors">
          {pending ? "…" : "Guardar"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(null); setNombre(""); }}
          className="px-2 py-2 rounded-xl border border-neutral-200 text-neutral-400 hover:bg-neutral-50 transition-colors">
          <X className="size-4" />
        </button>
        {error && <p className="absolute text-xs text-red-600 mt-12">{error}</p>}
      </form>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors mt-2"
    >
      <BookmarkPlus className="size-4" />
      Guardar como plantilla
    </button>
  );
}
