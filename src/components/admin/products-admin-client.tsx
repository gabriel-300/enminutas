"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil, Search, Trash2 } from "lucide-react";
import { toggleProductActive, toggleProductMuestra, eliminarProducto } from "@/app/(admin)/admin/productos/actions";
import { ButtonLink, IconButton, StatusBadge, Switch } from "@/components/ui";

type Product = {
  id:                 string;
  sku:                string;
  name:               string;
  is_active:          boolean;
  es_muestra:         boolean;
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

function Toggle({ id, initial, label, onToggle }: { id: string; initial: boolean; label: string; onToggle: (id: string, next: boolean) => Promise<void> }) {
  const [active, setActive]          = useState(initial);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const next = !active;
    setActive(next);
    startTransition(async () => {
      try { await onToggle(id, next); } catch { setActive(!next); }
    });
  }

  return <Switch checked={active} onCheckedChange={handleToggle} disabled={isPending} label={label} />;
}

const ActiveToggle  = ({ id, initial }: { id: string; initial: boolean }) =>
  <Toggle id={id} initial={initial} label="Activo" onToggle={toggleProductActive} />;

const MuestraToggle = ({ id, initial }: { id: string; initial: boolean }) =>
  <Toggle id={id} initial={initial} label="Muestra" onToggle={toggleProductMuestra} />;

// ── CategoriaBadge ────────────────────────────────────────────────────────────

function CategoriaBadge({ cat }: { cat: string | null }) {
  if (!cat) return <span className="text-neutral-500">—</span>;
  return <StatusBadge tone={cat === "Premium" ? "warning" : "neutral"}>{cat}</StatusBadge>;
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
    <div className={`bg-white rounded-xl border border-neutral-200 shadow-sm p-4 ${!p.is_active ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {p.codigo != null && (
              <span className="text-[13px] font-mono font-semibold text-n-800 bg-n-100 px-1.5 py-0.5 rounded">
                {p.codigo}
              </span>
            )}
            <p className="font-medium text-neutral-900 leading-snug">{p.name}</p>
          </div>
          <p className="text-xs text-neutral-600 font-mono mt-0.5">{p.sku}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {p.linea && <span className="text-xs text-neutral-600">{p.linea.nombre}</span>}
            {p.presentacion && <span className="text-xs text-neutral-600">· {p.presentacion}</span>}
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
            <p className="text-neutral-600 text-xs mb-0.5">{label}</p>
            <p className="text-xs font-medium text-neutral-700 tabular-nums">
              {val != null ? `$ ${Number(val).toLocaleString("es-AR")}` : "—"}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-3 text-xs text-neutral-600 flex-wrap">
          {p.u_bolsa != null && <span>{p.u_bolsa} u/bolsa</span>}
          {p.bolsas_caja != null && <span>{p.bolsas_caja} bols/caja</span>}
          {p.kg_caja != null && <span>{p.kg_caja} kg/caja</span>}
          {p.updated_at && (
            <span>Act. {new Date(p.updated_at).toLocaleDateString("es-AR")}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <ButtonLink href={`/admin/productos/${p.id}/editar`} variant="secondary" size="sm"><Pencil />Editar</ButtonLink>
          <IconButton label="Eliminar" variant="danger-soft" onClick={handleDelete} disabled={isPending}><Trash2 /></IconButton>
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
      ? <>$ {Number(n).toLocaleString("es-AR")}</>
      : <span className="text-neutral-500">—</span>;

  const num = (n: number | null) =>
    n != null ? n : <span className="text-neutral-500">—</span>;

  return (
    <tr className={`transition-colors hover:bg-brand-50 ${!p.is_active ? "opacity-50" : ""}`}>
      <td className="px-3 py-[11px] whitespace-nowrap">
        {p.codigo != null
          ? <span className="font-mono text-[13px] font-semibold text-n-800">{p.codigo}</span>
          : <span className="text-neutral-500">—</span>}
      </td>
      <td className="px-3 py-[11px] max-w-[260px]">
        <p className="truncate text-sm font-medium text-n-900" title={p.name}>{p.name}</p>
        <p className="font-mono text-xs text-n-600">{p.sku}</p>
      </td>
      <td className="px-3 py-[11px] text-sm text-n-700 whitespace-nowrap">
        {p.linea?.nombre ?? <span className="text-neutral-500">—</span>}
      </td>
      <td className="px-3 py-[11px] text-sm text-n-700 whitespace-nowrap">
        {p.presentacion ?? <span className="text-neutral-500">—</span>}
      </td>
      <td className="px-3 py-[11px] text-right tabular-nums text-n-700">{num(p.u_bolsa)}</td>
      <td className="px-3 py-[11px] text-right tabular-nums text-n-700">{num(p.bolsas_caja)}</td>
      <td className="px-3 py-[11px] text-right tabular-nums text-n-700">{num(p.kg_caja)}</td>
      <td className="px-3 py-[11px] text-right tabular-nums whitespace-nowrap font-semibold text-n-900">{money(p.costo)}</td>
      <td className="px-3 py-[11px] text-right tabular-nums whitespace-nowrap text-n-700">{money(p.pkg_unitario)}</td>
      <td className="px-3 py-[11px] text-right tabular-nums whitespace-nowrap text-n-700">{money(p.pkg_bulto)}</td>
      <td className="px-3 py-[11px]"><CategoriaBadge cat={p.categoria} /></td>
      <td className="px-3 py-[11px] text-sm text-n-700 tabular-nums whitespace-nowrap">
        {p.updated_at
          ? new Date(p.updated_at).toLocaleDateString("es-AR")
          : <span className="text-neutral-500">—</span>}
      </td>
      <td className="px-3 py-[11px]">
        <div className="flex justify-center">
          <ActiveToggle id={p.id} initial={p.is_active} />
        </div>
      </td>
      <td className="px-3 py-[11px]" title="Habilitar para pedidos de muestra">
        <div className="flex justify-center">
          <MuestraToggle id={p.id} initial={p.es_muestra ?? false} />
        </div>
      </td>
      <td className="px-3 py-[11px] whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <ButtonLink href={`/admin/productos/${p.id}/editar`} variant="secondary" size="sm"><Pencil />Editar</ButtonLink>
          <IconButton label="Eliminar" variant="danger-soft" onClick={handleDelete} disabled={isPending}><Trash2 /></IconButton>
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
      <div className="relative mb-5 max-w-[420px]">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-n-500" />
        <input
          type="search"
          placeholder="Buscar por nombre, SKU, código o línea…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-neutral-400 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700"
        />
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0
          ? <p className="text-sm text-neutral-600 text-center py-10">Sin resultados.</p>
          : filtered.map((p) => <ProductMobileCard key={p.id} p={p} />)}
      </div>

      {/* Desktop */}
      <div className="hidden md:block bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Cód.</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Producto</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Línea</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Presentación</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">U/Bolsa</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Bols/Caja</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Kg/Caja</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Costo $</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Pkg U $</th>
                <th className="px-3 py-2.5 text-right text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Pkg B $</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Categoría</th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Última act.</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Activo</th>
                <th className="px-3 py-2.5 text-center text-xs font-semibold text-n-600 whitespace-nowrap sticky top-0">Muestra</th>
                <th className="px-3 py-2.5 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-neutral-600">Sin resultados.</td>
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
