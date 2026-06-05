"use client";

import { useState, useTransition } from "react";
import {
  agregarDireccion,
  editarDireccion,
  eliminarDireccion,
  setPrincipalDireccion,
} from "../direcciones-actions";

type Zona      = { id: string; name: string; flete_kg: number };
type Direccion = {
  id:           string;
  alias:        string;
  calle:        string | null;
  numero:       string | null;
  piso:         string | null;
  ciudad:       string | null;
  es_principal: boolean;
  zona_id:      string | null;
  zona:         { name: string; flete_kg: number } | null;
};

const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

function DireccionForm({
  profileId,
  zonas,
  defaults,
  onCancel,
  onSubmit,
  isPending,
}: {
  profileId:  string;
  zonas:      Zona[];
  defaults?:  Partial<Direccion>;
  onCancel:   () => void;
  onSubmit:   (fd: FormData) => void;
  isPending:  boolean;
}) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }}
      className="space-y-3 pt-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Nombre / Alias *</label>
          <input name="alias" defaultValue={defaults?.alias ?? ""} required placeholder="Ej: Sucursal Centro" className={inputCls} disabled={isPending} />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">Zona de entrega</label>
          <select name="zona_id" defaultValue={defaults?.zona_id ?? ""} className={`${inputCls} bg-white`} disabled={isPending}>
            <option value="">Sin zona</option>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} {z.flete_kg > 0 ? `· ${fmt(z.flete_kg)}/kg` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <input name="calle"  defaultValue={defaults?.calle  ?? ""} placeholder="Calle"  className={`${inputCls} col-span-2`} disabled={isPending} />
        <input name="numero" defaultValue={defaults?.numero ?? ""} placeholder="Número" className={inputCls} disabled={isPending} />
        <input name="piso"   defaultValue={defaults?.piso   ?? ""} placeholder="Piso/Dpto" className={inputCls} disabled={isPending} />
      </div>
      <input name="ciudad" defaultValue={defaults?.ciudad ?? ""} placeholder="Ciudad / Barrio" className={inputCls} disabled={isPending} />
      <div className="flex items-center gap-3">
        <input type="checkbox" name="es_principal" id={`principal-${defaults?.id ?? "new"}`}
          defaultChecked={defaults?.es_principal ?? false}
          className="size-4 rounded accent-tierra-700" disabled={isPending} />
        <label htmlFor={`principal-${defaults?.id ?? "new"}`} className="text-xs text-neutral-600">
          Dirección principal
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={isPending}
          className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50">
          {isPending ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={onCancel} disabled={isPending}
          className="px-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function DireccionesClient({
  profileId,
  direcciones,
  zonas,
}: {
  profileId:   string;
  direcciones: Direccion[];
  zonas:       Zona[];
}) {
  const [showAdd,   setShowAdd]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAgregar(fd: FormData) {
    startTransition(async () => {
      await agregarDireccion(profileId, fd);
      setShowAdd(false);
    });
  }

  function handleEditar(id: string, fd: FormData) {
    startTransition(async () => {
      await editarDireccion(id, profileId, fd);
      setEditingId(null);
    });
  }

  function handleEliminar(id: string, alias: string) {
    if (!confirm(`¿Eliminar la dirección "${alias}"?`)) return;
    startTransition(() => eliminarDireccion(id, profileId));
  }

  function handlePrincipal(id: string) {
    startTransition(() => setPrincipalDireccion(id, profileId));
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">
          Direcciones de entrega
          <span className="ml-2 text-xs text-neutral-400 font-normal">{direcciones.length} registrada{direcciones.length !== 1 ? "s" : ""}</span>
        </p>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} disabled={isPending}
            className="text-xs text-tierra-700 hover:underline disabled:opacity-50">
            + Agregar dirección
          </button>
        )}
      </div>

      <div className="divide-y divide-neutral-100">
        {direcciones.length === 0 && !showAdd && (
          <p className="px-5 py-8 text-sm text-neutral-400 text-center">
            Sin direcciones registradas.
          </p>
        )}

        {direcciones.map((d) => (
          <div key={d.id} className="px-5 py-4">
            {editingId === d.id ? (
              <DireccionForm
                profileId={profileId}
                zonas={zonas}
                defaults={d}
                onCancel={() => setEditingId(null)}
                onSubmit={(fd) => handleEditar(d.id, fd)}
                isPending={isPending}
              />
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-neutral-900">{d.alias}</p>
                    {d.es_principal && (
                      <span className="px-1.5 py-0.5 bg-tierra-100 text-tierra-700 text-xs rounded-md font-medium">Principal</span>
                    )}
                  </div>
                  {(d.calle || d.ciudad) && (
                    <p className="text-xs text-neutral-500">
                      {[d.calle, d.numero, d.piso, d.ciudad].filter(Boolean).join(", ")}
                    </p>
                  )}
                  {d.zona ? (
                    <p className="text-xs text-neutral-400">
                      {d.zona.name}
                      {d.zona.flete_kg > 0 && ` · flete ${fmt(d.zona.flete_kg)}/kg`}
                    </p>
                  ) : (
                    <p className="text-xs text-neutral-300">Sin zona asignada</p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!d.es_principal && (
                    <button onClick={() => handlePrincipal(d.id)} disabled={isPending}
                      className="text-xs text-neutral-400 hover:text-tierra-700 disabled:opacity-50">
                      Marcar principal
                    </button>
                  )}
                  <button onClick={() => setEditingId(d.id)} disabled={isPending}
                    className="text-xs text-tierra-700 hover:underline disabled:opacity-50">
                    Editar
                  </button>
                  <button onClick={() => handleEliminar(d.id, d.alias)} disabled={isPending}
                    className="text-xs text-danger hover:underline disabled:opacity-50">
                    Eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {showAdd && (
          <div className="px-5 py-4 bg-neutral-50">
            <p className="text-xs font-medium text-neutral-500 mb-1">Nueva dirección</p>
            <DireccionForm
              profileId={profileId}
              zonas={zonas}
              onCancel={() => setShowAdd(false)}
              onSubmit={handleAgregar}
              isPending={isPending}
            />
          </div>
        )}
      </div>
    </div>
  );
}
