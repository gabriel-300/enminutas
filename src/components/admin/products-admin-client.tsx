"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleProductActive, updateProductPrice, eliminarProducto } from "@/app/(admin)/admin/productos/actions";

const fmt = (n: number) => `$ ${Number(n).toLocaleString("es-AR")}`;

type Product = {
  id:            string;
  sku:           string;
  name:          string;
  price_b2c:     number;
  is_active:     boolean;
  unit_label:    string;
  stock_cajas:   number;
  stock_minimo:  number;
  precio_lista:  number | null;
  category:      { name: string } | null;
};

function ProductRow({ p }: { p: Product }) {
  const [active,     setActive]     = useState(p.is_active);
  const [isPending,  startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => { await eliminarProducto(p.id); router.refresh(); });
  }

  function handleToggle() {
    const next = !active;
    setActive(next);
    startTransition(async () => { try { await toggleProductActive(p.id, next); } catch { setActive(!next); } });
  }

  const tienePrecios = !!p.precio_lista;

  return (
    <tr className={`hover:bg-neutral-50 transition-colors ${!active ? "opacity-50" : ""}`}>
      {/* Producto */}
      <td className="px-4 py-3">
        <p className="font-medium text-neutral-900">{p.name}</p>
        <p className="text-xs text-neutral-400 font-mono">{p.sku} · {p.unit_label}</p>
      </td>

      {/* Categoría */}
      <td className="px-4 py-3 text-neutral-500">{p.category?.name ?? "—"}</td>

      {/* Stock */}
      <td className="px-4 py-3 text-center">
        {p.stock_minimo > 0 ? (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums ${
            p.stock_cajas === 0              ? "bg-danger-bg text-danger"
            : p.stock_cajas < p.stock_minimo ? "bg-warning-bg text-warning"
            : "bg-success-bg text-success"
          }`}>
            {p.stock_cajas}/{p.stock_minimo}
          </span>
        ) : (
          <span className="text-xs text-neutral-400 tabular-nums">{p.stock_cajas}</span>
        )}
      </td>

      {/* Precio lista B2B */}
      <td className="px-4 py-3 text-right tabular-nums">
        {tienePrecios ? (
          <span className="text-sm font-medium text-neutral-700">{fmt(p.precio_lista!)}</span>
        ) : (
          <span className="text-xs text-neutral-300">Sin precio</span>
        )}
      </td>

      {/* Activo */}
      <td className="px-4 py-3">
        <div className="flex justify-center">
          <button
            onClick={handleToggle}
            disabled={isPending}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${active ? "bg-success" : "bg-neutral-300"}`}
          >
            <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`} />
          </button>
        </div>
      </td>

      {/* Acciones */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href={`/admin/productos/${p.id}/editar`} className="text-xs text-tierra-700 hover:underline">Editar</Link>
          <button onClick={handleDelete} disabled={isPending} className="text-xs text-danger hover:underline disabled:opacity-40">Eliminar</button>
        </div>
      </td>
    </tr>
  );
}

export function ProductsAdminClient({ products }: { products: Product[] }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left">
            <th className="px-4 py-3 font-medium text-neutral-500">Producto</th>
            <th className="px-4 py-3 font-medium text-neutral-500">Categoría</th>
            <th className="px-4 py-3 font-medium text-neutral-500 text-center">Stock</th>
            <th className="px-4 py-3 font-medium text-neutral-500 text-right">Precio lista</th>
            <th className="px-4 py-3 font-medium text-neutral-500 text-center">Activo</th>
            <th className="px-4 py-3 w-28"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {products.map((p) => <ProductRow key={p.id} p={p} />)}
        </tbody>
      </table>
    </div>
  );
}
