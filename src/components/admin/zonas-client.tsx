"use client";

import { useState, useTransition } from "react";
import { crearZona, actualizarZona, eliminarZona } from "@/app/(admin)/admin/zonas/actions";

type Zona = { id: string; name: string; flete_kg: number | null; base_fee: number | null; client_count: number };

function ZonaRow({ zona }: { zona: Zona }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(zona.name);
  const [flete, setFlete] = useState(String(zona.flete_kg ?? ""));
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const fd = new FormData();
    fd.set("name", name);
    fd.set("flete_kg", flete);
    startTransition(async () => {
      await actualizarZona(zona.id, fd);
      setEditing(false);
    });
  }

  function handleDelete() {
    if (zona.client_count > 0) {
      alert(`No se puede eliminar: tiene ${zona.client_count} cliente${zona.client_count !== 1 ? "s" : ""} asignado${zona.client_count !== 1 ? "s" : ""}.`);
      return;
    }
    if (!confirm(`¿Eliminar la zona "${zona.name}"?`)) return;
    startTransition(() => eliminarZona(zona.id));
  }

  if (editing) {
    return (
      <tr className="bg-crema-50">
        <td className="px-4 py-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-2 py-1 text-sm border border-tierra-700 rounded-lg focus:outline-none w-full"
            disabled={isPending}
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="number"
            value={flete}
            onChange={(e) => setFlete(e.target.value)}
            placeholder="$/kg"
            className="px-2 py-1 text-sm border border-tierra-700 rounded-lg focus:outline-none w-28"
            disabled={isPending}
          />
        </td>
        <td className="px-4 py-3 text-neutral-400 text-sm">{zona.client_count} clientes</td>
        <td className="px-4 py-3">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="text-xs text-success font-medium hover:underline disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              onClick={() => { setName(zona.name); setFlete(String(zona.flete_kg ?? "")); setEditing(false); }}
              className="text-xs text-neutral-400 hover:underline"
            >
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      <td className="px-4 py-3 font-medium text-neutral-900">{zona.name}</td>
      <td className="px-4 py-3 text-neutral-600 tabular-nums">
        {zona.flete_kg ? `$ ${Number(zona.flete_kg).toLocaleString("es-AR")} /kg` : "—"}
      </td>
      <td className="px-4 py-3 text-neutral-400 text-sm">
        {zona.client_count} cliente{zona.client_count !== 1 ? "s" : ""}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-3">
          <button
            onClick={() => setEditing(true)}
            disabled={isPending}
            className="text-xs text-tierra-700 hover:underline disabled:opacity-50"
          >
            Editar
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending || zona.client_count > 0}
            className="text-xs text-danger hover:underline disabled:opacity-30"
          >
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
    startTransition(async () => {
      await crearZona(fd);
      form.reset();
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={handleCreate} className="flex gap-3">
        <input
          name="name"
          placeholder="Nombre de la zona…"
          required
          className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
          disabled={isPending}
        />
        <input
          name="flete_kg"
          type="number"
          placeholder="$/kg"
          className="w-28 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
          disabled={isPending}
        />
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
        >
          Agregar
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500">Zona</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Flete</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Clientes</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {zonas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-neutral-400">
                  No hay zonas configuradas.
                </td>
              </tr>
            )}
            {zonas.map((z) => <ZonaRow key={z.id} zona={z} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
