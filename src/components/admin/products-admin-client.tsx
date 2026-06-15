"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleProductActive, eliminarProducto } from "@/app/(admin)/admin/productos/actions";

type Product = {
  id:                 string;
  sku:                string;
  name:               string;
  is_active:          boolean;
  presentacion:       string | null;
  codigo:             number | null;
  costo:              number | null;
  pkg_unitario:       number | null;
  pkg_bulto:          number | null;
  u_bolsa:            number | null;
  bolsas_caja:        number | null;
  kg_caja:            number | null;
  categoria:          string | null;
  updated_at:         string | null;
  linea:              { nombre: string } | null;
};

function ActiveToggle({ id, initial }: { id: string; initial: boolean }) {
  const [active, setActive]          = useState(initial);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      try { await toggleProductActive(id, next); } catch { setActive(!next); }
    });
  }

  return (
    <button onClick={handleToggle} disabled={isPending}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${active ? "bg-success" : "bg-neutral-300"}`}>
      <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${active ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

// ── CategoriaBadge ────────────────────────────────────────────────────────────

function CategoriaBadge({ cat }: { cat: string | null }) {
  if (!cat) return <span className="text-neutral-300">—</span>;
  const cls = cat === "Premium"
    ? "bg-amber-50 text-amber-700"
    : "bg-neutral-100 text-neutral-600";
  return (
    <span className={`inline-block text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${cls}`}>
      {cat}
    </span>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────

function ProductMobileCard({ p }: { p: Product }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => { await eliminarProducto(p.id); router.refresh(); });
  }

  return (
    <div className={`bg-white rounded-2xl border border-neutral-200 p-4 ${!p.is_active ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {p.codigo != null && (
              <span className="text-xs font-mono font-semibold text-tierra-700 bg-tierra-50 px-1.5 py-0.5 rounded">
                {p.codigo}
              </span>
            )}
            <p className="font-medium text-neutral-900 leading-snug">{p.name}</p>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">{p.sku}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {p.linea && <span className="text-xs text-neutral-500">{p.linea.nombre}</span>}
            {p.presentacion && <span className="text-xs text-neutral-400">· {p.presentacion}</span>}
            <CategoriaBadge cat={p.categoria} />
          </div>
        </div>
        <ActiveToggle id={p.id} initial={p.is_active} />
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        {[
          { label: "Costo", val: p.costo },
          { label: "Pkg U", val: p.pkg_unitario },
          { label: "Pkg B", val: p.pkg_bulto },
        ].map(({ label, val }) => (
          <div key={label} className="bg-neutral-50 rounded-lg p-2 text-center">
            <p className="text-neutral-400 text-[10px] mb-0.5">{label}</p>
            <p className="text-xs font-medium text-neutral-700 tabular-nums">
              {val != null ? `$ ${Number(val).toLocaleString("es-AR")}` : "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-3 text-xs text-neutral-500 flex-wrap">
          {p.u_bolsa != null && <span>{p.u_bolsa} u/bolsa</span>}
          {p.bolsas_caja != null && <span>{p.bolsas_caja} bols/caja</span>}
          {p.kg_caja != null && <span>{p.kg_caja} kg/caja</span>}
          {p.updated_at && (
            <span>Act. {new Date(p.updated_at).toLocaleDateString("es-AR")}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/admin/productos/${p.id}/editar`} className="text-xs text-tierra-700 hover:underline">Editar</Link>
          <button onClick={handleDelete} disabled={isPending} className="text-xs text-danger hover:underline disabled:opacity-40">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

// ── Desktop row ───────────────────────────────────────────────────────────────

function ProductRow({ p }: { p: Product }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => { await eliminarProducto(p.id); router.refresh(); });
  }

  const money = (n: number | null) =>
    n != null
      ? <span className="font-medium text-neutral-700">$ {Number(n).toLocaleString("es-AR")}</span>
      : <span className="text-neutral-300">—</span>;

  const num = (n: number | null) =>
    n != null ? n : <span className="text-neutral-300">—</span>;

  return (
    <tr className={`hover:bg-neutral-50 transition-colors ${!p.is_active ? "opacity-50" : ""}`}>
      <td className="px-2 py-2 text-center whitespace-nowrap">
        {p.codigo != null
          ? <span className="text-xs font-mono font-semibold text-tierra-700">{p.codigo}</span>
          : <span className="text-neutral-300">—</span>}
      </td>
      <td className="px-2 py-2 max-w-[180px]">
        <p className="font-medium text-neutral-900 text-xs leading-snug truncate">{p.name}</p>
        <p className="text-[10px] text-neutral-400 font-mono">{p.sku}</p>
      </td>
      <td className="px-2 py-2 text-xs text-neutral-500 whitespace-nowrap">
        {p.linea?.nombre ?? <span className="text-neutral-300">—</span>}
      </td>
      <td className="px-2 py-2 text-xs text-neutral-500 whitespace-nowrap">
        {p.presentacion ?? <span className="text-neutral-300">—</span>}
      </td>
      <td className="px-2 py-2 text-center text-xs tabular-nums text-neutral-600">{num(p.u_bolsa)}</td>
      <td className="px-2 py-2 text-center text-xs tabular-nums text-neutral-600">{num(p.bolsas_caja)}</td>
      <td className="px-2 py-2 text-center text-xs tabular-nums text-neutral-600">{num(p.kg_caja)}</td>
      <td className="px-2 py-2 text-right text-xs tabular-nums whitespace-nowrap">{money(p.costo)}</td>
      <td className="px-2 py-2 text-right text-xs tabular-nums whitespace-nowrap">{money(p.pkg_unitario)}</td>
      <td className="px-2 py-2 text-right text-xs tabular-nums whitespace-nowrap">{money(p.pkg_bulto)}</td>
      <td className="px-2 py-2 text-center"><CategoriaBadge cat={p.categoria} /></td>
      <td className="px-2 py-2 text-center text-xs text-neutral-500 whitespace-nowrap">
        {p.updated_at
          ? new Date(p.updated_at).toLocaleDateString("es-AR")
          : <span className="text-neutral-300">—</span>}
      </td>
      <td className="px-2 py-2">
        <div className="flex justify-center">
          <ActiveToggle id={p.id} initial={p.is_active} />
        </div>
      </td>
      <td className="px-2 py-2 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <Link href={`/admin/productos/${p.id}/editar`} className="text-xs text-tierra-700 hover:underline">Editar</Link>
          <button onClick={handleDelete} disabled={isPending} className="text-xs text-danger hover:underline disabled:opacity-40">Eliminar</button>
        </div>
      </td>
    </tr>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ProductsAdminClient({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");

  const filtered = search.trim() === ""
    ? products
    : products.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.codigo != null && String(p.codigo).includes(q)) ||
          (p.linea?.nombre ?? "").toLowerCase().includes(q) ||
          (p.categoria ?? "").toLowerCase().includes(q)
        );
      });

  return (
    <>
      <div className="mb-4">
        <input
          type="search"
          placeholder="Buscar por nombre, SKU, código o línea…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-4 py-2 rounded-xl border border-neutral-200 text-sm bg-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-tierra-700/20 focus:border-tierra-700"
        />
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0
          ? <p className="text-sm text-neutral-400 text-center py-10">Sin resultados.</p>
          : filtered.map((p) => <ProductMobileCard key={p.id} p={p} />)}
      </div>

      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/50 text-left">
                <th className="px-2 py-3 font-medium text-neutral-500 text-center text-xs whitespace-nowrap">Cód.</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-xs">Producto</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-xs whitespace-nowrap">Línea</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-xs whitespace-nowrap">Presentación</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-center text-xs whitespace-nowrap">U/Bolsa</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-center text-xs whitespace-nowrap">Bols/Caja</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-center text-xs whitespace-nowrap">Kg/Caja</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-right text-xs whitespace-nowrap">Costo $</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-right text-xs whitespace-nowrap">Pkg U $</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-right text-xs whitespace-nowrap">Pkg B $</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-center text-xs">Categoría</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-center text-xs whitespace-nowrap">Última act.</th>
                <th className="px-2 py-3 font-medium text-neutral-500 text-center text-xs">Activo</th>
                <th className="px-2 py-3 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-neutral-400">Sin resultados.</td>
                </tr>
              )}
              {filtered.map((p) => <ProductRow key={p.id} p={p} />)}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
