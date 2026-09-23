"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { vincularPresentacion, desvincularPresentacion, crearPresentacion } from "@/app/(admin)/admin/cocina/recetas/actions";

export type PresentacionVinculada = {
  id: string; name: string; sku: string | null; unit_label: string | null;
  kg_caja: number | null; cajasPorLote: number | null;
};

export type ProductoVinculable = {
  id: string; name: string; sku: string | null; unit_label: string | null; kg_caja: number | null;
};

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type LineaOpcion = { id: number; nombre: string };

const FORM_VACIO = {
  name: "", sku: "", unit_label: "", presentacion: "",
  kg_caja: "", bolsas_caja: "", u_bolsa: "", pkg_unitario: "", pkg_bulto: "", costo: "", linea_id: "",
};

const num = (s: string) => parseFloat(s.replace(",", "."));

const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50";

export function PresentacionesReceta({
  baseId, baseName, baseKgCaja, baseLineaId, lineas, puedeCrear, vinculadas, candidatos,
}: {
  baseId:      string;
  baseName:    string;
  baseKgCaja:  number | null;
  baseLineaId: number | null;
  lineas:      LineaOpcion[];
  puedeCrear:  boolean;
  vinculadas:  PresentacionVinculada[];
  candidatos:  ProductoVinculable[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState("");

  const [creando, setCreando] = useState(false);
  const [form, setForm] = useState({ ...FORM_VACIO, name: baseName, linea_id: baseLineaId ? String(baseLineaId) : "" });
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [creadoId, setCreadoId] = useState<string | null>(null);
  const setCampo = (k: keyof typeof FORM_VACIO, v: string) => setForm(f => ({ ...f, [k]: v }));

  function crear() {
    setErrorCrear(null);
    setCreadoId(null);
    startTransition(async () => {
      const res = await crearPresentacion(baseId, {
        name:         form.name,
        sku:          form.sku,
        unit_label:   form.unit_label,
        presentacion: form.presentacion,
        kg_caja:      num(form.kg_caja),
        bolsas_caja:  num(form.bolsas_caja),
        u_bolsa:      num(form.u_bolsa),
        pkg_unitario: form.pkg_unitario ? num(form.pkg_unitario) : null,
        pkg_bulto:    form.pkg_bulto ? num(form.pkg_bulto) : null,
        costo:        form.costo ? num(form.costo) : null,
        linea_id:     form.linea_id ? Number(form.linea_id) : null,
      });
      if ("error" in res) { setErrorCrear(res.error); return; }
      setCreadoId(res.id);
      setCreando(false);
      setForm({ ...FORM_VACIO, name: baseName, linea_id: baseLineaId ? String(baseLineaId) : "" });
      router.refresh();
    });
  }

  // Relacionados = comparten la primera palabra del nombre (ej. "Bastoncito", "Chipa")
  const clave = norm(baseName).split(/\s+/)[0] ?? "";
  const relacionados = candidatos.filter(c => clave && norm(c.name).includes(clave));
  const otros = candidatos.filter(c => !relacionados.includes(c));
  const etiqueta = (c: ProductoVinculable) =>
    `${c.name}${c.unit_label ? ` · ${c.unit_label}` : ""}${c.sku ? ` (${c.sku})` : ""}${c.kg_caja ? "" : " — sin kg/caja"}`;

  function vincular() {
    if (!elegido) return;
    setError(null);
    startTransition(async () => {
      const res = await vincularPresentacion(baseId, elegido);
      if ("error" in res) setError(res.error);
      else { setElegido(""); router.refresh(); }
    });
  }

  function desvincular(id: string, name: string) {
    if (!confirm(`¿Desvincular "${name}" de esta receta? Ya no podrá producirse con ella.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await desvincularPresentacion(id);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden mt-6">
      <div className="px-5 py-4 border-b border-neutral-100">
        <p className="text-sm font-semibold text-neutral-700">Presentaciones que usan esta receta</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          Al producir podés elegir en cuál sale el lote. Las cajas se calculan por peso (kg por caja de cada producto).
        </p>
      </div>

      {!(baseKgCaja && baseKgCaja > 0) && (
        <p className="px-5 py-3 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
          Este producto no tiene kg por caja cargado: sin ese dato no se pueden calcular las equivalencias. Cargalo en Productos.
        </p>
      )}

      {vinculadas.length === 0 ? (
        <p className="px-5 py-4 text-sm text-neutral-400">
          Todavía no hay otras presentaciones vinculadas. Se produce solo el producto de esta receta.
        </p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {vinculadas.map(p => (
            <div key={p.id} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-800 truncate">{p.name}</p>
                <p className="text-xs text-neutral-400">
                  {p.sku && <span className="font-mono mr-2">{p.sku}</span>}
                  {p.unit_label}
                  {p.kg_caja ? ` · ${fmt(p.kg_caja)} kg/caja` : ""}
                </p>
              </div>
              <p className="text-xs text-neutral-500 tabular-nums shrink-0">
                {p.cajasPorLote !== null ? `1 lote = ${fmt(p.cajasPorLote)} cajas` : "falta kg/caja"}
              </p>
              <button type="button" onClick={() => desvincular(p.id, p.name)} disabled={isPending}
                className="text-xs text-danger hover:underline disabled:opacity-40 shrink-0">
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-4 border-t border-neutral-100 space-y-2">
        <div className="flex items-center gap-2">
          <select value={elegido} onChange={e => setElegido(e.target.value)} disabled={isPending}
            className="flex-1 min-w-0 truncate px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50">
            <option value="">— Agregar presentación (producto sin receta propia) —</option>
            {relacionados.length > 0 && (
              <optgroup label={`Relacionados con ${baseName}`}>
                {relacionados.map(c => <option key={c.id} value={c.id}>{etiqueta(c)}</option>)}
              </optgroup>
            )}
            {otros.length > 0 && (
              <optgroup label="Otros productos sin receta">
                {otros.map(c => <option key={c.id} value={c.id}>{etiqueta(c)}</option>)}
              </optgroup>
            )}
          </select>
          <button type="button" onClick={vincular} disabled={isPending || !elegido}
            className="shrink-0 px-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors">
            Vincular
          </button>
        </div>
        {relacionados.length === 0 && (
          <p className="text-xs text-amber-700">
            No hay productos sin receta relacionados con «{baseName}».
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {/* Crear una presentación que todavía no existe como producto */}
      <div className="px-5 py-4 border-t border-neutral-100 space-y-3">
        {creadoId && (
          <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            ✓ Presentación creada y vinculada a esta receta. Quedó <strong>inactiva</strong>: revisá precios y activala en{" "}
            <Link href={`/admin/productos/${creadoId}/editar`} className="underline font-medium">Productos</Link>{" "}
            para poder producirla y venderla.
          </p>
        )}

        {!creando ? (
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={() => { setCreando(true); setCreadoId(null); }} disabled={!puedeCrear || isPending}
              className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-semibold hover:bg-tierra-800 disabled:opacity-40 transition-colors">
              + Nueva presentación
            </button>
            <p className="text-xs text-neutral-400">
              {puedeCrear
                ? "¿No existe el producto (ej. caja de 500 g o empanada x32)? Crealo desde acá, ya vinculado a esta receta."
                : "Solo un administrador puede crear productos."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-neutral-700">Nueva presentación de {baseName}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block sm:col-span-2">
                <span className="block text-xs font-medium text-neutral-500 mb-1">Nombre *</span>
                <input className={inputCls} value={form.name} onChange={e => setCampo("name", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-500 mb-1">SKU *</span>
                <input className={inputCls} placeholder="ej. BOC-MAND-500" value={form.sku} onChange={e => setCampo("sku", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-500 mb-1">Unidad de venta *</span>
                <input className={inputCls} placeholder="ej. caja 10 cajitas x 500g" value={form.unit_label} onChange={e => setCampo("unit_label", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-500 mb-1">Presentación (texto corto)</span>
                <input className={inputCls} placeholder="ej. 10 caja x 500g" value={form.presentacion} onChange={e => setCampo("presentacion", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-500 mb-1">Línea</span>
                <select className={inputCls} value={form.linea_id} onChange={e => setCampo("linea_id", e.target.value)} disabled={isPending}>
                  <option value="">— la misma que el producto base —</option>
                  {lineas.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-500 mb-1">Kg por caja *</span>
                <input className={inputCls} inputMode="decimal" placeholder="ej. 5,6" value={form.kg_caja} onChange={e => setCampo("kg_caja", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-500 mb-1">Bolsas / cajitas por caja *</span>
                <input className={inputCls} inputMode="numeric" placeholder="ej. 10" value={form.bolsas_caja} onChange={e => setCampo("bolsas_caja", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-500 mb-1">Unidades por bolsa / cajita *</span>
                <input className={inputCls} inputMode="numeric" placeholder="ej. 20" value={form.u_bolsa} onChange={e => setCampo("u_bolsa", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-500 mb-1">Envase por bolsa / cajita ($)</span>
                <input className={inputCls} inputMode="decimal" placeholder="ej. 750" value={form.pkg_unitario} onChange={e => setCampo("pkg_unitario", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-500 mb-1">Envase por caja ($)</span>
                <input className={inputCls} inputMode="decimal" placeholder="ej. 900" value={form.pkg_bulto} onChange={e => setCampo("pkg_bulto", e.target.value)} disabled={isPending} />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-xs font-medium text-neutral-500 mb-1">Costo por bolsa / cajita ($)</span>
                <input className={inputCls} inputMode="decimal" placeholder="vacío = se calcula desde la receta por peso" value={form.costo} onChange={e => setCampo("costo", e.target.value)} disabled={isPending} />
              </label>
            </div>
            <p className="text-xs text-neutral-400">
              Se hereda del producto base: categoría, descripción e imagen. Se crea <strong>inactivo</strong> y sin precios de tienda; se activa desde Productos.
            </p>
            {errorCrear && <p className="text-sm text-danger">{errorCrear}</p>}
            <div className="flex items-center gap-2">
              <button type="button" onClick={crear} disabled={isPending}
                className="px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-semibold hover:bg-tierra-800 disabled:opacity-50 transition-colors">
                {isPending ? "Creando…" : "Crear y vincular"}
              </button>
              <button type="button" onClick={() => { setCreando(false); setErrorCrear(null); }} disabled={isPending}
                className="px-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
