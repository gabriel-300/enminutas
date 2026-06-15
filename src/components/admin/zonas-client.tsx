"use client";

import { useState, useTransition } from "react";
import { crearZona, actualizarZona, eliminarZona } from "@/app/(admin)/admin/zonas/actions";

const fmtNum = (n: number) => `$ ${Number(n).toLocaleString("es-AR")}`;

type Zona = {
  id:           string;
  codigo:       string;
  name:         string;
  km:           number;
  precio_km:    number;
  capacidad_kg: number;
  client_count: number;
  updated_at:   string | null;
};

function costoViaje(km: number, precio_km: number) {
  return Math.round(km * 2 * precio_km);
}

function ZonaRow({ zona }: { zona: Zona }) {
  const [editing, setEditing]        = useState(false);
  const [codigo, setCodigo]          = useState(zona.codigo);
  const [name, setName]              = useState(zona.name);
  const [km, setKm]                  = useState(String(zona.km));
  const [precioKm, setPrecioKm]      = useState(String(zona.precio_km));
  const [capacidad, setCapacidad]    = useState(String(zona.capacidad_kg));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const fd = new FormData();
    fd.set("codigo", codigo); fd.set("name", name);
    fd.set("km", km); fd.set("precio_km", precioKm); fd.set("capacidad_kg", capacidad);
    startTransition(async () => { await actualizarZona(zona.id, fd); setEditing(false); });
  }

  function handleCancel() {
    setCodigo(zona.codigo); setName(zona.name); setKm(String(zona.km));
    setPrecioKm(String(zona.precio_km)); setCapacidad(String(zona.capacidad_kg));
    setEditing(false);
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar la zona "${zona.name}"?`)) return;
    startTransition(() => eliminarZona(zona.id));
  }

  const inp = "px-2 py-1 text-sm border border-tierra-700/60 rounded-lg focus:outline-none focus:border-tierra-700";
  const costo = costoViaje(zona.km, zona.precio_km);
  const esLocal = zona.km === 0;

  if (editing) {
    const previewCosto = costoViaje(Number(km), Number(precioKm));
    return (
      <tr className="bg-crema-50">
        <td className="px-3 py-3">
          <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            maxLength={6} className={`${inp} w-16 font-mono text-xs`} disabled={isPending} />
        </td>
        <td className="px-3 py-3">
          <input value={name} onChange={(e) => setName(e.target.value)}
            className={`${inp} w-full`} disabled={isPending} />
        </td>
        <td className="px-3 py-3">
          <input type="number" value={km} onChange={(e) => setKm(e.target.value)}
            placeholder="0" className={`${inp} w-20`} disabled={isPending} />
        </td>
        <td className="px-3 py-3">
          <input type="number" value={precioKm} onChange={(e) => setPrecioKm(e.target.value)}
            placeholder="800" className={`${inp} w-24`} disabled={isPending} />
        </td>
        <td className="px-3 py-3 text-sm font-medium text-neutral-700 tabular-nums">
          {previewCosto > 0 ? fmtNum(previewCosto) : <span className="text-neutral-300">—</span>}
        </td>
        <td className="px-3 py-3">
          <input type="number" value={capacidad} onChange={(e) => setCapacidad(e.target.value)}
            placeholder="1200" className={`${inp} w-20`} disabled={isPending} />
        </td>
        <td className="px-3 py-3" colSpan={3}>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={isPending}
              className="text-xs text-success font-medium hover:underline disabled:opacity-50">
              Guardar
            </button>
            <button onClick={handleCancel} className="text-xs text-neutral-400 hover:underline">
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      <td className="px-3 py-3">
        <span className="text-xs font-mono font-semibold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
          {zona.codigo || "—"}
        </span>
      </td>
      <td className="px-3 py-3 font-medium text-neutral-900">{zona.name}</td>
      <td className="px-3 py-3 tabular-nums text-neutral-600 text-sm">
        {esLocal ? <span className="text-neutral-300">—</span> : `${zona.km} km`}
      </td>
      <td className="px-3 py-3 tabular-nums text-neutral-600 text-sm">
        {zona.precio_km > 0 ? `${fmtNum(zona.precio_km)}/km` : <span className="text-neutral-300">—</span>}
      </td>
      <td className="px-3 py-3 tabular-nums font-semibold text-neutral-800 text-sm">
        {costo > 0 ? fmtNum(costo) : <span className="text-neutral-300">—</span>}
      </td>
      <td className="px-3 py-3 tabular-nums text-neutral-500 text-sm">
        {zona.capacidad_kg > 0 ? `${zona.capacidad_kg.toLocaleString("es-AR")} kg` : "—"}
      </td>
      <td className="px-3 py-3 text-sm">
        <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
          <span className="size-1.5 rounded-full bg-success inline-block" />
          Activo
        </span>
      </td>
      <td className="px-3 py-3 text-xs text-neutral-500 whitespace-nowrap">
        {zona.updated_at
          ? new Date(zona.updated_at).toLocaleDateString("es-AR")
          : <span className="text-neutral-300">—</span>}
      </td>
      <td className="px-3 py-3">
        <div className="flex gap-3">
          <button onClick={() => setEditing(true)} disabled={isPending}
            className="text-xs text-tierra-700 hover:underline disabled:opacity-50">
            Editar
          </button>
          <button onClick={handleDelete} disabled={isPending || zona.client_count > 0}
            className="text-xs text-danger hover:underline disabled:opacity-30"
            title={zona.client_count > 0 ? `${zona.client_count} clientes asignados` : ""}>
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}

export function ZonasClient({ zonas }: { zonas: Zona[] }) {
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => { await crearZona(fd); form.reset(); });
  }

  return (
    <div className="space-y-6">
      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left bg-neutral-50">
              <th className="px-3 py-3 font-medium text-neutral-500 w-16">Cód.</th>
              <th className="px-3 py-3 font-medium text-neutral-500">Zona</th>
              <th className="px-3 py-3 font-medium text-neutral-500">km desde Posadas</th>
              <th className="px-3 py-3 font-medium text-neutral-500">$ por km</th>
              <th className="px-3 py-3 font-medium text-neutral-500">Costo viaje</th>
              <th className="px-3 py-3 font-medium text-neutral-500">Capacidad kg</th>
              <th className="px-3 py-3 font-medium text-neutral-500">Estado</th>
              <th className="px-3 py-3 font-medium text-neutral-500 whitespace-nowrap">Última act.</th>
              <th className="px-3 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {zonas.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-neutral-400">
                  No hay zonas configuradas.
                </td>
              </tr>
            )}
            {zonas.map((z) => <ZonaRow key={z.id} zona={z} />)}
          </tbody>
        </table>
      </div>

      {/* Formulario nueva zona */}
      <details className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <summary className="px-5 py-4 text-sm font-medium text-neutral-700 cursor-pointer hover:bg-neutral-50 transition-colors select-none">
          + Agregar zona
        </summary>
        <form onSubmit={handleCreate} className="px-5 pb-5 pt-3 space-y-4 border-t border-neutral-100">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Código * <span className="font-normal">(ej: ROS)</span></label>
              <input name="codigo" placeholder="ROS" required maxLength={6} disabled={isPending}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 font-mono uppercase" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-neutral-500 mb-1">Nombre *</label>
              <input name="name" placeholder="Rosario" required disabled={isPending}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">km ida</label>
              <input name="km" type="number" placeholder="800" min="0" disabled={isPending}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">$/km</label>
              <input name="precio_km" type="number" placeholder="800" min="0" disabled={isPending}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Capacidad (kg)</label>
              <input name="capacidad_kg" type="number" placeholder="1200" min="0" disabled={isPending}
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
            </div>
          </div>
          <p className="text-xs text-neutral-400">
            Flete = km × 2 × $/km. Posadas/NEA: km = 0 (incluido en precio).
          </p>
          <button type="submit" disabled={isPending}
            className="px-5 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors">
            {isPending ? "Guardando…" : "Agregar zona"}
          </button>
        </form>
      </details>
    </div>
  );
}
