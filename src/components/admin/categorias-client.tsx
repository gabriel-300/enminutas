"use client";

import { useState, useTransition } from "react";
import { crearCategoria, actualizarCategoria, eliminarCategoria } from "@/app/(admin)/admin/categorias/actions";

type Categoria = { id: string; name: string; product_count: number };

function CategoriaRow({ cat }: { cat: Categoria }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(cat.name);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!value.trim() || value === cat.name) { setEditing(false); return; }
    const fd = new FormData();
    fd.set("name", value);
    startTransition(async () => {
      await actualizarCategoria(cat.id, fd);
      setEditing(false);
    });
  }

  function handleDelete() {
    if (cat.product_count > 0) {
      alert(`No se puede eliminar: tiene ${cat.product_count} producto${cat.product_count !== 1 ? "s" : ""} asignado${cat.product_count !== 1 ? "s" : ""}.`);
      return;
    }
    if (!confirm(`¿Eliminar la categoría "${cat.name}"?`)) return;
    startTransition(() => eliminarCategoria(cat.id));
  }

  return (
    <tr className="hover:bg-neutral-50 transition-colors">
      <td className="px-4 py-3">
        {editing ? (
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") { setValue(cat.name); setEditing(false); }
            }}
            autoFocus
            className="px-2 py-1 text-sm border border-tierra-700 rounded-lg focus:outline-none w-full max-w-xs"
            disabled={isPending}
          />
        ) : (
          <span className="font-medium text-neutral-900">{cat.name}</span>
        )}
      </td>
      <td className="px-4 py-3 text-neutral-400 text-sm">
        {cat.product_count} producto{cat.product_count !== 1 ? "s" : ""}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              disabled={isPending}
              className="text-xs text-tierra-700 hover:underline disabled:opacity-50"
            >
              Renombrar
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={isPending || cat.product_count > 0}
            className="text-xs text-danger hover:underline disabled:opacity-30"
          >
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  );
}

export function CategoriasClient({ categorias }: { categorias: Categoria[] }) {
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const form = e.currentTarget;
    startTransition(async () => {
      await crearCategoria(fd);
      form.reset();
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Form nueva categoría */}
      <form onSubmit={handleCreate} className="flex gap-3">
        <input
          name="name"
          placeholder="Nueva categoría…"
          required
          className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
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
              <th className="px-4 py-3 font-medium text-neutral-500">Nombre</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Productos</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {categorias.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-neutral-400">
                  No hay categorías todavía.
                </td>
              </tr>
            )}
            {categorias.map((c) => <CategoriaRow key={c.id} cat={c} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
