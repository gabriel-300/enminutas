"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  vincularPresentacion, desvincularPresentacion, darRecetaPropia, crearPresentacion,
  fusionarPresentacion, guardarEnvase,
} from "@/app/(admin)/admin/cocina/recetas/actions";

export type EnvaseFila = { insumo_id: string; cantidad_por_caja: number };

export type PresentacionVinculada = {
  id: string; name: string; sku: string | null; unit_label: string | null;
  kg_caja: number | null; cajasPorLote: number | null; envase: EnvaseFila[];
};

export type ProductoVinculable = {
  id: string; name: string; sku: string | null; unit_label: string | null; kg_caja: number | null;
};

export type InsumoOpcion = { id: string; nombre: string; unidad: string; precio_unitario: number };

const fmt = (n: number) => new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type LineaOpcion = { id: number; nombre: string };

const FORM_VACIO = {
  name: "", sku: "", unit_label: "", presentacion: "",
  kg_caja: "", bolsas_caja: "", u_bolsa: "", costo: "", linea_id: "",
};

const num = (s: string) => parseFloat(s.replace(",", "."));

const inputCls = "w-full px-3 py-2 text-sm border border-neutral-400 rounded-lg bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50";

export function PresentacionesReceta({
  baseId, baseName, baseKgCaja, baseLineaId, lineas, puedeCrear, puedeFusionar, vinculadas, candidatos,
  fusionables, insumos, envaseBase,
}: {
  baseId:        string;
  baseName:      string;
  baseKgCaja:    number | null;
  baseLineaId:   number | null;
  lineas:        LineaOpcion[];
  puedeCrear:    boolean;
  puedeFusionar: boolean;
  vinculadas:    PresentacionVinculada[];
  candidatos:    ProductoVinculable[];
  fusionables:   ProductoVinculable[];
  insumos:       InsumoOpcion[];
  envaseBase:    EnvaseFila[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [elegido, setElegido] = useState("");
  const fusionablesSet = new Set(fusionables.map(f => f.id));

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
  const fusRelacionados = fusionables.filter(c => clave && norm(c.name).includes(clave));
  const fusOtros = fusionables.filter(c => !fusRelacionados.includes(c));
  const etiqueta = (c: ProductoVinculable) =>
    `${c.name}${c.unit_label ? ` · ${c.unit_label}` : ""}${c.sku ? ` (${c.sku})` : ""}${c.kg_caja ? "" : " — sin kg/caja"}`;

  function vincular() {
    if (!elegido) return;
    setError(null);
    const esFusion = fusionablesSet.has(elegido);
    if (esFusion) {
      const nombre = fusionables.find(f => f.id === elegido)?.name ?? "";
      if (!confirm(
        `"${nombre}" tiene receta propia. Al fusionarla se descarta esa receta (pasos e ingredientes) ` +
        `y usa la de "${baseName}" de ahora en más. Su envase (si lo cargaste) no se pierde. ¿Continuar?`
      )) return;
    }
    startTransition(async () => {
      const res = esFusion ? await fusionarPresentacion(baseId, elegido) : await vincularPresentacion(baseId, elegido);
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

  function independizar(id: string, name: string) {
    if (!confirm(`¿Darle a "${name}" una receta propia? Se crea una copia de esta receta (con el rinde convertido a sus cajas) que podés editar sin afectar a las demás presentaciones.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await darRecetaPropia(id);
      if ("error" in res) setError(res.error);
      else router.push(`/admin/cocina/recetas/${id}`);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden mt-6">
      <div className="px-5 py-4 border-b border-neutral-100">
        <p className="text-sm font-semibold text-neutral-700">Presentaciones que usan esta receta</p>
        <p className="text-xs text-neutral-600 mt-0.5">
          Al producir podés elegir en cuál sale el lote. Las cajas se calculan por peso (kg por caja de cada producto).
          Si una presentación necesita <em>producción</em> distinta (pasos o ingredientes), dale «Receta propia».
          Si solo cambia el envase (bolsa, caja, etiqueta), cargalo abajo en «Envase» de cada una.
        </p>
      </div>

      {!(baseKgCaja && baseKgCaja > 0) && (
        <p className="px-5 py-3 text-xs text-warning bg-warning-bg border-b border-warning-border">
          Este producto no tiene kg por caja cargado: sin ese dato no se pueden calcular las equivalencias. Cargalo en Productos.
        </p>
      )}

      <div className="px-5 py-3 border-b border-neutral-100">
        <EnvaseEditor productId={baseId} productName={baseName} insumos={insumos} initial={envaseBase} />
      </div>

      {vinculadas.length === 0 ? (
        <p className="px-5 py-4 text-sm text-neutral-600">
          Todavía no hay otras presentaciones vinculadas. Se produce solo el producto de esta receta.
        </p>
      ) : (
        <div className="divide-y divide-neutral-100">
          {vinculadas.map(p => (
            <div key={p.id} className="px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{p.name}</p>
                  <p className="text-xs text-neutral-600">
                    {p.sku && <span className="font-mono mr-2">{p.sku}</span>}
                    {p.unit_label}
                    {p.kg_caja ? ` · ${fmt(p.kg_caja)} kg/caja` : ""}
                  </p>
                </div>
                <p className="text-xs text-neutral-600 tabular-nums shrink-0">
                  {p.cajasPorLote !== null ? `1 lote = ${fmt(p.cajasPorLote)} cajas` : "falta kg/caja"}
                </p>
                <button type="button" onClick={() => independizar(p.id, p.name)} disabled={isPending}
                  title="Crea una copia de esta receta para que la presentación tenga la suya"
                  className="text-xs text-tierra-700 hover:underline disabled:opacity-40 shrink-0">
                  Receta propia
                </button>
                <button type="button" onClick={() => desvincular(p.id, p.name)} disabled={isPending}
                  className="text-xs text-danger hover:underline disabled:opacity-40 shrink-0">
                  Quitar
                </button>
              </div>
              <EnvaseEditor productId={p.id} productName={p.name} insumos={insumos} initial={p.envase} />
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-4 border-t border-neutral-100 space-y-2">
        <div className="flex items-center gap-2">
          <select value={elegido} onChange={e => setElegido(e.target.value)} disabled={isPending}
            className="flex-1 min-w-0 truncate px-3 py-2 text-sm border border-neutral-400 rounded-lg bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50">
            <option value="">— Agregar presentación —</option>
            {relacionados.length > 0 && (
              <optgroup label={`Relacionados con ${baseName}, sin receta propia`}>
                {relacionados.map(c => <option key={c.id} value={c.id}>{etiqueta(c)}</option>)}
              </optgroup>
            )}
            {otros.length > 0 && (
              <optgroup label="Otros productos sin receta">
                {otros.map(c => <option key={c.id} value={c.id}>{etiqueta(c)}</option>)}
              </optgroup>
            )}
            {puedeFusionar && fusRelacionados.length > 0 && (
              <optgroup label={`Relacionados con ${baseName}, con receta propia (se fusiona)`}>
                {fusRelacionados.map(c => <option key={c.id} value={c.id}>{etiqueta(c)}</option>)}
              </optgroup>
            )}
            {puedeFusionar && fusOtros.length > 0 && (
              <optgroup label="Otros productos con receta propia (se fusiona)">
                {fusOtros.map(c => <option key={c.id} value={c.id}>{etiqueta(c)}</option>)}
              </optgroup>
            )}
          </select>
          <button type="button" onClick={vincular} disabled={isPending || !elegido}
            className="shrink-0 px-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors">
            {elegido && fusionablesSet.has(elegido) ? "Fusionar" : "Vincular"}
          </button>
        </div>
        {relacionados.length === 0 && fusRelacionados.length === 0 && (
          <p className="text-xs text-warning">
            No hay productos relacionados con «{baseName}» sin vincular.
          </p>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      {/* Crear una presentación que todavía no existe como producto */}
      <div className="px-5 py-4 border-t border-neutral-100 space-y-3">
        {creadoId && (
          <p className="text-sm text-success bg-success-bg border border-success-border rounded-xl px-4 py-3">
            ✓ Presentación creada y vinculada a esta receta. Quedó <strong>inactiva</strong>: revisá precios y activala en{" "}
            <Link href={`/admin/productos/${creadoId}/editar`} className="underline font-medium">Productos</Link>{" "}
            para poder producirla y venderla.
          </p>
        )}

        {!creando ? (
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" onClick={() => { setCreando(true); setCreadoId(null); }} disabled={!puedeCrear || isPending}
              className="px-4 py-2 rounded-lg bg-tierra-700 text-white text-sm font-semibold hover:bg-tierra-800 disabled:opacity-40 transition-colors">
              + Nueva presentación
            </button>
            <p className="text-xs text-neutral-600">
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
                <span className="block text-xs font-medium text-neutral-600 mb-1">Nombre *</span>
                <input className={inputCls} value={form.name} onChange={e => setCampo("name", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-600 mb-1">SKU *</span>
                <input className={inputCls} placeholder="ej. BOC-MAND-500" value={form.sku} onChange={e => setCampo("sku", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-600 mb-1">Unidad de venta *</span>
                <input className={inputCls} placeholder="ej. caja 10 cajitas x 500g" value={form.unit_label} onChange={e => setCampo("unit_label", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-600 mb-1">Presentación (texto corto)</span>
                <input className={inputCls} placeholder="ej. 10 caja x 500g" value={form.presentacion} onChange={e => setCampo("presentacion", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-600 mb-1">Línea</span>
                <select className={inputCls} value={form.linea_id} onChange={e => setCampo("linea_id", e.target.value)} disabled={isPending}>
                  <option value="">— la misma que el producto base —</option>
                  {lineas.map(l => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-600 mb-1">Kg por caja *</span>
                <input className={inputCls} inputMode="decimal" placeholder="ej. 5,6" value={form.kg_caja} onChange={e => setCampo("kg_caja", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-600 mb-1">Bolsas / cajitas por caja *</span>
                <input className={inputCls} inputMode="numeric" placeholder="ej. 10" value={form.bolsas_caja} onChange={e => setCampo("bolsas_caja", e.target.value)} disabled={isPending} />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-neutral-600 mb-1">Unidades por bolsa / cajita *</span>
                <input className={inputCls} inputMode="numeric" placeholder="ej. 20" value={form.u_bolsa} onChange={e => setCampo("u_bolsa", e.target.value)} disabled={isPending} />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-xs font-medium text-neutral-600 mb-1">Costo total por bolsa / cajita ($, con packaging)</span>
                <input className={inputCls} inputMode="decimal" placeholder="vacío = se calcula desde la receta por peso" value={form.costo} onChange={e => setCampo("costo", e.target.value)} disabled={isPending} />
              </label>
            </div>
            <p className="text-xs text-neutral-600">
              Se hereda del producto base: categoría, descripción e imagen. Se crea <strong>inactivo</strong> y sin precios de tienda; se activa desde Productos.
            </p>
            {errorCrear && <p className="text-sm text-danger">{errorCrear}</p>}
            <div className="flex items-center gap-2">
              <button type="button" onClick={crear} disabled={isPending}
                className="px-4 py-2 rounded-lg bg-tierra-700 text-white text-sm font-semibold hover:bg-tierra-800 disabled:opacity-50 transition-colors">
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

// Envase (bolsa, caja, etiqueta) de una presentación puntual. Se descuenta por caja producida,
// no por lote de receta, para que varias presentaciones compartan receta con envases distintos.
function EnvaseEditor({
  productId, productName, insumos, initial,
}: {
  productId:   string;
  productName: string;
  insumos:     InsumoOpcion[];
  initial:     EnvaseFila[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [filas, setFilas] = useState<{ insumo_id: string; cantidadStr: string }[]>(
    initial.length > 0
      ? initial.map(i => ({ insumo_id: i.insumo_id, cantidadStr: String(i.cantidad_por_caja) }))
      : [{ insumo_id: "", cantidadStr: "" }]
  );
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));
  const costoTotal = filas.reduce((s, f) => {
    const ins = insumoMap[f.insumo_id];
    const cant = parseFloat((f.cantidadStr || "0").replace(",", "."));
    return s + (ins && cant > 0 ? cant * ins.precio_unitario : 0);
  }, 0);

  function guardar() {
    setError(null); setOk(false);
    const items = filas
      .filter(f => f.insumo_id && parseFloat((f.cantidadStr || "0").replace(",", ".")) > 0)
      .map(f => ({ insumo_id: f.insumo_id, cantidad_por_caja: parseFloat(f.cantidadStr.replace(",", ".")) }));
    startTransition(async () => {
      const res = await guardarEnvase(productId, items);
      if ("error" in res) setError(res.error);
      else { setOk(true); router.refresh(); }
    });
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="mt-1.5 text-xs text-neutral-600 hover:underline">
        Envase{initial.length > 0 ? ` (${initial.length})` : ""}
      </button>
    );
  }

  return (
    <div className="mt-2 pl-3 border-l-2 border-neutral-200 space-y-2">
      <p className="text-xs font-medium text-neutral-700">Envase de {productName} (por caja producida)</p>
      {filas.map((f, i) => {
        const ins = insumoMap[f.insumo_id];
        return (
          <div key={i} className="flex items-center gap-2">
            <select value={f.insumo_id} disabled={isPending}
              onChange={e => setFilas(p => p.map((x, idx) => idx === i ? { ...x, insumo_id: e.target.value } : x))}
              className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-neutral-400 rounded-lg bg-white focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50">
              <option value="">— Insumo —</option>
              {insumos.map(o => <option key={o.id} value={o.id}>{o.nombre} ({o.unidad})</option>)}
            </select>
            <input type="text" inputMode="decimal" placeholder="0" value={f.cantidadStr} disabled={isPending}
              onChange={e => setFilas(p => p.map((x, idx) => idx === i ? { ...x, cantidadStr: e.target.value } : x))}
              className="w-20 px-2 py-1.5 text-xs border border-neutral-400 rounded-lg text-center focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50" />
            {ins && <span className="text-xs text-neutral-600 font-mono w-8 shrink-0">{ins.unidad}</span>}
            <button type="button" onClick={() => setFilas(p => p.filter((_, idx) => idx !== i))} disabled={isPending}
              className="size-6 flex items-center justify-center rounded-lg border border-danger-border text-danger hover:bg-danger-bg disabled:opacity-30 text-xs shrink-0">
              ✕
            </button>
          </div>
        );
      })}
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={() => setFilas(p => [...p, { insumo_id: "", cantidadStr: "" }])} disabled={isPending}
          className="px-2.5 py-1 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors">
          + Insumo
        </button>
        <button type="button" onClick={guardar} disabled={isPending}
          className="px-3 py-1 text-xs font-semibold rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
          {isPending ? "Guardando…" : "Guardar envase"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} disabled={isPending}
          className="text-xs text-neutral-500 hover:underline disabled:opacity-40">
          Cerrar
        </button>
        {costoTotal > 0 && <span className="text-xs text-neutral-600 ml-auto">{fmtARS(costoTotal)} / caja</span>}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {ok && <p className="text-xs text-success">Envase guardado.</p>}
    </div>
  );
}
