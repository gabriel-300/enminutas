"use client";

import { useState, useTransition } from "react";
import { Plus, X, Edit2, Check, Warehouse } from "lucide-react";
import { crearDeposito, editarDeposito, toggleDeposito } from "./actions";

type Deposito = {
  id: string;
  nombre: string;
  descripcion: string | null;
  direccion: string | null;
  activo: boolean;
  lotes_count: number;
};

const inputClass = "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 focus:border-[#16233f]";
const labelClass = "block text-xs font-medium text-neutral-500 mb-1";

function DepositoForm({
  initial,
  onSave,
  onCancel,
  pending,
}: {
  initial?: Deposito;
  onSave: (p: { nombre: string; descripcion?: string; direccion?: string }) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [nombre, setNombre]       = useState(initial?.nombre ?? "");
  const [desc, setDesc]           = useState(initial?.descripcion ?? "");
  const [dir, setDir]             = useState(initial?.direccion ?? "");

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-neutral-900">
        {initial ? "Editar depósito" : "Nuevo depósito"}
      </h3>
      <div>
        <label className={labelClass}>Nombre *</label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Depósito Principal, Cámara Fría..."
          className={inputClass}
          required
        />
      </div>
      <div>
        <label className={labelClass}>Descripción</label>
        <input
          type="text"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Descripción opcional"
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Dirección</label>
        <input
          type="text"
          value={dir}
          onChange={e => setDir(e.target.value)}
          placeholder="Dirección física (opcional)"
          className={inputClass}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={pending}
          className="flex-1 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={() => { if (nombre.trim()) onSave({ nombre, descripcion: desc || undefined, direccion: dir || undefined }); }}
          disabled={pending || !nombre.trim()}
          className="flex-1 py-2 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

export function DepositosClient({ depositos }: { depositos: Deposito[] }) {
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, start]          = useTransition();
  const [error, setError]         = useState<string | null>(null);

  function handleCrear(p: Parameters<typeof crearDeposito>[0]) {
    start(async () => {
      const res = await crearDeposito(p);
      if (res.error) { setError(res.error); return; }
      setShowForm(false);
      setError(null);
    });
  }

  function handleEditar(id: string, p: Parameters<typeof editarDeposito>[1]) {
    start(async () => {
      const res = await editarDeposito(id, p);
      if (res.error) { setError(res.error); return; }
      setEditingId(null);
      setError(null);
    });
  }

  function handleToggle(id: string, activo: boolean) {
    start(async () => {
      const res = await toggleDeposito(id, activo);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(v => !v); setEditingId(null); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors"
        >
          {showForm ? <X className="size-4" /> : <Plus className="size-4" />}
          {showForm ? "Cancelar" : "Nuevo depósito"}
        </button>
      </div>

      {showForm && (
        <DepositoForm
          onSave={handleCrear}
          onCancel={() => setShowForm(false)}
          pending={pending}
        />
      )}

      <div className="space-y-3">
        {depositos.map(d => (
          <div key={d.id}>
            {editingId === d.id ? (
              <DepositoForm
                initial={d}
                onSave={p => handleEditar(d.id, p)}
                onCancel={() => setEditingId(null)}
                pending={pending}
              />
            ) : (
              <div className={`bg-white rounded-2xl border p-5 flex items-start gap-4 ${!d.activo ? "opacity-50" : "border-neutral-200"}`}>
                <div className="size-10 rounded-xl bg-neutral-100 flex items-center justify-center shrink-0">
                  <Warehouse className="size-5 text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-neutral-900">{d.nombre}</p>
                    {!d.activo && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-400">Inactivo</span>
                    )}
                    <span className="text-xs text-neutral-400">
                      {d.lotes_count} lote{d.lotes_count !== 1 ? "s" : ""} asignado{d.lotes_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {d.descripcion && <p className="text-sm text-neutral-500 mt-0.5">{d.descripcion}</p>}
                  {d.direccion  && <p className="text-xs text-neutral-400 mt-0.5">{d.direccion}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setEditingId(d.id)}
                    disabled={pending}
                    className="p-2 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-30"
                    title="Editar"
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    onClick={() => handleToggle(d.id, !d.activo)}
                    disabled={pending}
                    className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
                      d.activo
                        ? "text-neutral-400 hover:text-red-500 hover:bg-red-50"
                        : "text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50"
                    }`}
                    title={d.activo ? "Desactivar" : "Activar"}
                  >
                    {d.activo ? <X className="size-4" /> : <Check className="size-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
