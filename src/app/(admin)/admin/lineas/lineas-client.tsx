"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { crearLinea, editarLinea, eliminarLinea } from "./actions";

type Linea = { id: number; nombre: string; orden: number; total: number };

function LineaRow({ l, onError }: { l: Linea; onError: (e: string) => void }) {
  const [editing, setEditing]   = useState(false);
  const [valor, setValor]       = useState(l.nombre);
  const [isPending, startTransition] = useTransition();

  function handleGuardar() {
    if (!valor.trim() || valor.trim() === l.nombre) { setEditing(false); return; }
    startTransition(async () => {
      const res = await editarLinea(l.id, valor.trim());
      if (res.error) { onError(res.error); setValor(l.nombre); }
      setEditing(false);
    });
  }

  function handleEliminar() {
    if (!confirm(`¿Eliminar la línea "${l.nombre}"?`)) return;
    startTransition(async () => {
      const res = await eliminarLinea(l.id);
      if (res.error) onError(res.error);
    });
  }

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className="text-xs font-mono text-neutral-300 w-6">{l.orden}</span>

      {editing ? (
        <>
          <input
            autoFocus
            value={valor}
            onChange={e => setValor(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleGuardar(); if (e.key === "Escape") { setEditing(false); setValor(l.nombre); } }}
            className="flex-1 px-2 py-1 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#16233f]/20"
            disabled={isPending}
          />
          <button onClick={handleGuardar} disabled={isPending} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50">
            <Check className="size-4" />
          </button>
          <button onClick={() => { setEditing(false); setValor(l.nombre); }} className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100">
            <X className="size-4" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm font-medium text-neutral-800">{l.nombre}</span>
          <span className="text-xs text-neutral-400 mr-1">{l.total} producto{l.total !== 1 ? "s" : ""}</span>
          <button onClick={() => setEditing(true)} disabled={isPending} className="p-1.5 rounded-lg text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 transition-colors">
            <Pencil className="size-4" />
          </button>
          <button
            onClick={handleEliminar}
            disabled={isPending || l.total > 0}
            title={l.total > 0 ? "Tiene productos asignados" : "Eliminar"}
            className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Trash2 className="size-4" />
          </button>
        </>
      )}
    </div>
  );
}

export function LineasClient({ lineas }: { lineas: Linea[] }) {
  const [nombre, setNombre] = useState("");
  const [error, setError]   = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await crearLinea(nombre.trim());
      if (res.error) { setError(res.error); return; }
      setNombre("");
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCrear} className="flex gap-2">
        <input
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Nombre de la línea (ej: Empanadas)"
          className="flex-1 px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20"
          maxLength={80}
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending || !nombre.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#16233f] text-white text-sm font-medium rounded-xl disabled:opacity-50"
        >
          <Plus className="size-4" />
          Agregar
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100">
        {lineas.length === 0 && (
          <p className="text-sm text-neutral-400 text-center py-10">No hay líneas cargadas.</p>
        )}
        {lineas.map(l => (
          <LineaRow key={l.id} l={l} onError={setError} />
        ))}
      </div>
    </div>
  );
}
