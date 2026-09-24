"use client";

import { useState, useTransition, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Plus, Trash2, FileText, ClipboardList, ChevronDown, ChevronRight, Camera } from "lucide-react";
import { registrarRecepcion, leerRemitoRecepcion, type InsumoBasico, type RecepcionHistorial, type CandidatoInsumo } from "./actions";

const fmtPrecio = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 3 }).format(n);

const fmtFecha = (s: string) =>
  new Date(s + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

const hoy = () => new Date().toISOString().slice(0, 10);

const IVA_OPCIONES = [
  { label: "0%  (en negro / exento)", value: 0 },
  { label: "10.5% (IVA reducido)",    value: 10.5 },
  { label: "21%  (IVA general)",      value: 21 },
];

type ItemRow = {
  key:               string;
  insumo_id:         string;
  unidad:            string;
  stock_actual:      number;
  precio_unitario:   string;
  cantidad:          string;
  iva_pct:           number;
  fecha_vencimiento: string;
  ocrHint:           string | null;         // texto tal cual lo leyó la IA, cuando no matcheó un insumo
  candidatos:        CandidatoInsumo[];      // sugerencias de insumo cuando no hubo match único claro
};

let rowKey = 0;
const newRow = (): ItemRow => ({
  key:               String(rowKey++),
  insumo_id:         "",
  unidad:            "",
  stock_actual:      0,
  precio_unitario:   "",
  cantidad:          "",
  iva_pct:           21,
  fecha_vencimiento: "",
  ocrHint:           null,
  candidatos:        [],
});

// Alarma de precio anómalo respecto al precio actual del insumo:
// - "fuerte" cuando el nuevo precio queda ~7x o más grande/chico que el
//   anterior -- el patrón típico de un dígito de más o de menos al cargar.
// - "suave" para cualquier otra variación >= 25% -- puede ser inflación
//   real, solo para que se vea, no necesariamente un error.
function variacionPrecio(precioNuevo: number, precioAnterior: number): { nivel: "fuerte" | "suave"; pct: number } | null {
  if (!precioAnterior || !precioNuevo || precioNuevo === precioAnterior) return null;
  const ratio = precioNuevo / precioAnterior;
  const pct   = (ratio - 1) * 100;
  if (ratio >= 7 || ratio <= 1 / 7) return { nivel: "fuerte", pct };
  if (Math.abs(pct) >= 25) return { nivel: "suave", pct };
  return null;
}

type Props = {
  insumos:   InsumoBasico[];
  historial: RecepcionHistorial[];
};

export function RecepcionesClient({ insumos, historial }: Props) {
  const [formOpen, setFormOpen] = useState(false);

  // Cabecera
  const [tipo,      setTipo]      = useState<"factura" | "remito">("factura");
  const [numero,    setNumero]    = useState("");
  const [proveedor, setProveedor] = useState("");
  const [cuit,      setCuit]      = useState("");
  const [fecha,     setFecha]     = useState(hoy());
  const [notas,     setNotas]     = useState("");
  const [otrosImp,  setOtrosImp]  = useState("");

  // Ítems
  const [rows, setRows] = useState<ItemRow[]>([newRow()]);

  const [error,     setError]    = useState<string | null>(null);
  const [ok,        setOk]       = useState<string | null>(null);
  const [isPending, start]       = useTransition();

  // Lectura de remito/factura con IA
  const [leyendoIA,    setLeyendoIA]    = useState(false);
  const [ocrWarnings,  setOcrWarnings]  = useState<string[]>([]);
  const [imagenUrl,    setImagenUrl]    = useState<string | null>(null);
  const [subiendoImg,  setSubiendoImg]  = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createBrowserClient> | null>(null);
  if (!supabaseRef.current) {
    supabaseRef.current = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

  function handleInsumoChange(key: string, insumoId: string) {
    const ins = insumoMap[insumoId];
    setRows(prev => prev.map(r =>
      r.key !== key ? r : {
        ...r,
        insumo_id:       insumoId,
        unidad:          ins?.unidad ?? "",
        stock_actual:    ins?.stock_actual ?? 0,
        precio_unitario: ins ? String(ins.precio_unitario) : "",
        ocrHint:         null,
        candidatos:      [],
      }
    ));
  }

  // Achica la foto antes de mandarla a leer -- una foto de celular sin
  // achicar es demasiado pesada para mandar como base64.
  async function resizeImageToBase64(file: File, maxDim = 1600, quality = 0.7): Promise<{ base64: string; mimeType: string }> {
    const bitmap = await createImageBitmap(file);
    const scale  = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    return { base64: dataUrl.split(",")[1], mimeType: "image/jpeg" };
  }

  async function subirEvidencia(file: File) {
    setSubiendoImg(true);
    try {
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
      const { error: upErr } = await supabaseRef.current!.storage.from("recepciones").upload(path, file, {
        contentType: file.type || "image/jpeg",
      });
      if (upErr) return;
      const { data } = supabaseRef.current!.storage.from("recepciones").getPublicUrl(path);
      setImagenUrl(data.publicUrl);
    } finally {
      setSubiendoImg(false);
    }
  }

  // Lee la foto de la factura/remito con IA y precarga cabecera + ítems.
  // La misma foto queda como evidencia adjunta (imagen_url).
  async function handleLeerConIA(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null); setOcrWarnings([]);
    setLeyendoIA(true);
    subirEvidencia(file);

    try {
      const { base64, mimeType } = await resizeImageToBase64(file);
      const res = await leerRemitoRecepcion(base64, mimeType);
      if (res.error) { setError(res.error); return; }

      const lineas = res.lineas ?? [];
      if (lineas.length === 0) { setError("No se encontraron líneas en la foto"); return; }

      if (res.cabecera?.proveedor && !proveedor) setProveedor(res.cabecera.proveedor);
      if (res.cabecera?.cuit && !cuit)           setCuit(res.cabecera.cuit);
      if (res.cabecera?.numero && !numero)       setNumero(res.cabecera.numero);
      if (res.cabecera?.fecha && /^\d{4}-\d{2}-\d{2}$/.test(res.cabecera.fecha)) setFecha(res.cabecera.fecha);

      setRows(lineas.map((l) => {
        const ins = l.insumoIdMatch ? insumoMap[l.insumoIdMatch] : null;
        return {
          key:               String(rowKey++),
          insumo_id:         l.insumoIdMatch ?? "",
          unidad:            ins?.unidad ?? "",
          stock_actual:      ins?.stock_actual ?? 0,
          precio_unitario:   String(l.precio),
          cantidad:          String(l.cantidad),
          iva_pct:           21,
          fecha_vencimiento: "",
          ocrHint:           ins ? null : l.producto,
          candidatos:        ins ? [] : l.candidatos,
        };
      }));
      setOcrWarnings(res.advertencias ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer la foto");
    } finally {
      setLeyendoIA(false);
    }
  }

  function updateRow<K extends keyof ItemRow>(key: string, field: K, value: ItemRow[K]) {
    setRows(prev => prev.map(r => r.key !== key ? r : { ...r, [field]: value }));
  }

  function removeRow(key: string) {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.key !== key) : prev);
  }

  function addRow() { setRows(prev => [...prev, newRow()]); }

  // Totales
  const totales = rows.reduce(
    (acc, r) => {
      const cant   = parseFloat(r.cantidad.replace(",", ".")) || 0;
      const precio = parseFloat(r.precio_unitario.replace(",", ".")) || 0;
      const neto   = cant * precio;
      const iva    = neto * (r.iva_pct / 100);
      return { neto: acc.neto + neto, iva: acc.iva + iva };
    },
    { neto: 0, iva: 0 },
  );
  const otrosNum   = parseFloat(otrosImp.replace(",", ".")) || 0;
  const totalFinal = totales.neto + totales.iva + otrosNum;

  function resetForm() {
    setTipo("factura"); setNumero(""); setProveedor(""); setCuit("");
    setFecha(hoy()); setNotas(""); setOtrosImp(""); setRows([newRow()]);
    setError(null); setOcrWarnings([]); setImagenUrl(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setOk(null);

    const items = rows
      .filter(r => r.insumo_id)
      .map(r => ({
        insumo_id:         r.insumo_id,
        cantidad:          parseFloat(r.cantidad.replace(",", ".")) || 0,
        unidad:            r.unidad,
        precio_unitario:   parseFloat(r.precio_unitario.replace(",", ".")) || 0,
        iva_pct:           r.iva_pct,
        fecha_vencimiento: r.fecha_vencimiento || null,
      }))
      .filter(i => i.cantidad > 0);

    if (items.length === 0) return setError("Completá al menos un ítem con insumo y cantidad");

    start(async () => {
      const res = await registrarRecepcion(
        tipo, numero, proveedor, fecha, notas || null, otrosNum, items, imagenUrl, cuit || null,
      );
      if ("error" in res) { setError(res.error); return; }
      setOk(`${tipo === "factura" ? "Factura" : "Remito"} ${numero} registrado. Stock y precios actualizados.`);
      resetForm();
      setFormOpen(false);
    });
  }

  const inputCls   = "w-full px-3 py-2 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50 bg-white";
  const inputSmCls = "px-2 py-1.5 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50 bg-white";

  return (
    <div className="space-y-6">

      {!formOpen && (
        <button
          onClick={() => { setFormOpen(true); setOk(null); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-800 transition-colors"
        >
          <Plus className="size-4" />
          Nueva recepción
        </button>
      )}

      {ok && (
        <p className="text-sm text-success bg-success-bg border border-success-border rounded-xl px-4 py-3">
          ✓ {ok}
        </p>
      )}

      {/* Formulario */}
      {formOpen && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-neutral-800">Nueva recepción de mercadería</p>
              <p className="text-xs text-neutral-600 mt-0.5">
                Insumos con IVA: ingresá el precio <strong>neto (sin IVA)</strong>. El sistema calcula el IVA y cierra el total.
              </p>
            </div>
            <button onClick={() => { setFormOpen(false); resetForm(); }}
              className="shrink-0 text-xs text-neutral-600 hover:text-neutral-600 px-3 py-1.5 border border-neutral-200 rounded-lg">
              Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-5">

            {/* Leer remito/factura con IA -- precarga cabecera e ítems a partir de una foto */}
            <div className="bg-crema-50 border border-tierra-700/20 rounded-xl px-4 py-3 flex items-start gap-3 flex-wrap">
              <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors shrink-0 ${
                leyendoIA ? "bg-neutral-200 text-neutral-600 cursor-wait" : "bg-brand-700 text-white hover:bg-brand-800 cursor-pointer"
              }`}>
                {leyendoIA ? (
                  <>
                    <span className="size-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Leyendo…
                  </>
                ) : (
                  <><Camera className="size-4" /> Leer remito/factura con foto (IA)</>
                )}
                <input type="file" accept="image/*" className="hidden" disabled={leyendoIA} onChange={handleLeerConIA} />
              </label>
              <p className="text-xs text-neutral-600 flex-1 min-w-[200px]">
                Sacá una foto del remito o la mercadería y precarga los insumos, cantidades y precios abajo — revisá antes de guardar.
                Para remitos escritos a mano o sin insumos en el catálogo, cargá manual.
                {subiendoImg && " (subiendo foto…)"}
              </p>
            </div>

            {ocrWarnings.length > 0 && (
              <div className="text-xs text-warning bg-warning-bg border border-warning-border rounded-xl px-4 py-3 space-y-1">
                <p className="font-medium">La lectura automática es experimental — revisá antes de guardar:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {ocrWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            {/* Cabecera */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Tipo *</label>
                <div className="flex rounded-xl overflow-hidden border border-neutral-200">
                  {(["factura", "remito"] as const).map(t => (
                    <button
                      key={t} type="button"
                      onClick={() => setTipo(t)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium transition-colors ${
                        tipo === t ? "bg-brand-700 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {t === "factura" ? <FileText className="size-3.5" /> : <ClipboardList className="size-3.5" />}
                      {t === "factura" ? "Factura" : "Remito"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Número *</label>
                <input value={numero} onChange={e => setNumero(e.target.value)} required
                  placeholder="0001-00012345" className={inputCls} disabled={isPending} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Proveedor *</label>
                <input value={proveedor} onChange={e => setProveedor(e.target.value)} required
                  placeholder="Nombre del proveedor" className={inputCls} disabled={isPending}
                  list="proveedores-list" />
                <datalist id="proveedores-list">
                  {[...new Set(insumos.map(i => i.proveedor).filter(Boolean))].map(p => (
                    <option key={p!} value={p!} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Fecha</label>
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                  className={inputCls} disabled={isPending} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">
                  CUIT <span className="font-normal text-neutral-600">(opcional)</span>
                </label>
                <input value={cuit} onChange={e => setCuit(e.target.value)}
                  placeholder="XX-XXXXXXXX-X" className={inputCls} disabled={isPending} />
              </div>
            </div>

            {/* Tabla ítems */}
            <div className="border border-neutral-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 920 }}>
                  <thead>
                    <tr className="bg-neutral-50 border-b border-neutral-100 text-left">
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-600">Insumo</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-600 w-24">Cantidad</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-600 w-10">Un.</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-600 w-32">Precio neto/u.</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-600 w-40">IVA</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-600 w-32">Vencimiento</th>
                      <th className="px-3 py-2.5 text-xs font-semibold text-neutral-600 w-28 text-right">Subtotal c/IVA</th>
                      <th className="px-3 py-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    {rows.map(row => {
                      const cant      = parseFloat(row.cantidad.replace(",", ".")) || 0;
                      const precio    = parseFloat(row.precio_unitario.replace(",", ".")) || 0;
                      const neto      = cant * precio;
                      const ivaAmt    = neto * (row.iva_pct / 100);
                      const subTotal  = neto + ivaAmt;
                      const stockPost = row.insumo_id ? row.stock_actual + cant : null;
                      const precioAnterior = row.insumo_id ? insumoMap[row.insumo_id]?.precio_unitario ?? null : null;
                      const alarma = precioAnterior != null ? variacionPrecio(precio, precioAnterior) : null;

                      return (
                        <tr key={row.key} className="hover:bg-neutral-50/50">
                          <td className="px-3 py-2">
                            <select
                              value={row.insumo_id}
                              onChange={e => handleInsumoChange(row.key, e.target.value)}
                              className={`${inputSmCls} w-full`} disabled={isPending}
                            >
                              <option value="">— Insumo —</option>
                              {insumos.map(i => (
                                <option key={i.id} value={i.id}>{i.nombre}</option>
                              ))}
                            </select>
                            {stockPost !== null && (
                              <p className="text-xs text-neutral-600 mt-0.5 px-1">
                                Stock: {fmtNum(row.stock_actual)} →{" "}
                                <span className="text-success font-medium">{fmtNum(stockPost)}</span>{" "}
                                {row.unidad}
                              </p>
                            )}
                            {row.ocrHint && !row.insumo_id && (
                              <div className="mt-0.5 px-1">
                                <p className="text-xs text-warning">
                                  El remito decía: "{row.ocrHint}"{row.candidatos.length === 0 && " — elegí el insumo"}
                                </p>
                                {row.candidatos.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {row.candidatos.map(c => (
                                      <button
                                        key={c.id} type="button"
                                        onClick={() => handleInsumoChange(row.key, c.id)}
                                        className="px-2 py-0.5 text-xs rounded-full border border-warning-border bg-warning-bg text-warning hover:bg-warning-bg transition-colors"
                                      >
                                        {c.nombre}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={row.cantidad}
                              onChange={e => updateRow(row.key, "cantidad", e.target.value)}
                              inputMode="decimal" placeholder="0"
                              className={`${inputSmCls} w-full text-right`} disabled={isPending}
                            />
                          </td>
                          <td className="px-3 py-2 text-xs text-neutral-600 font-mono">
                            {row.unidad || "—"}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs text-neutral-600">$</span>
                              <input
                                value={row.precio_unitario}
                                onChange={e => updateRow(row.key, "precio_unitario", e.target.value)}
                                inputMode="decimal" placeholder="0"
                                className={`${inputSmCls} w-full text-right`} disabled={isPending}
                              />
                            </div>
                            {alarma && (
                              <p className={`text-xs mt-0.5 px-1 font-medium ${alarma.nivel === "fuerte" ? "text-danger" : "text-warning"}`}>
                                {alarma.nivel === "fuerte" ? "⚠ ¿Precio mal cargado?" : "⚠"} Antes {fmtPrecio(precioAnterior!)}
                                {" "}({alarma.pct > 0 ? "+" : ""}{alarma.pct.toFixed(0)}%)
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={row.iva_pct}
                              onChange={e => updateRow(row.key, "iva_pct", parseFloat(e.target.value))}
                              className={`${inputSmCls} w-full text-xs`} disabled={isPending}
                            >
                              {IVA_OPCIONES.map(o => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                            {row.iva_pct > 0 && neto > 0 && (
                              <p className="text-xs text-neutral-600 mt-0.5 px-1 tabular-nums">
                                IVA: {fmtPrecio(ivaAmt)}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={row.fecha_vencimiento}
                              onChange={e => updateRow(row.key, "fecha_vencimiento", e.target.value)}
                              className={`${inputSmCls} w-full text-xs`} disabled={isPending}
                            />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-neutral-800">
                            {subTotal > 0
                              ? fmtPrecio(subTotal)
                              : <span className="text-neutral-500 font-normal">—</span>
                            }
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeRow(row.key)}
                              disabled={rows.length === 1 || isPending}
                              className="p-1 text-neutral-500 hover:text-danger hover:bg-danger-bg rounded-lg transition-colors disabled:opacity-20">
                              <Trash2 className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-neutral-200 bg-neutral-50/50">
                      <td className="px-3 py-2" colSpan={6}>
                        <button type="button" onClick={addRow} disabled={isPending}
                          className="flex items-center gap-1.5 text-sm text-brand-700 hover:underline disabled:opacity-40">
                          <Plus className="size-3.5" /> Agregar ítem
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right text-xs tabular-nums text-neutral-600 space-y-0.5" colSpan={2}>
                        <div>Neto: <span className="text-neutral-700 font-medium">{fmtPrecio(totales.neto)}</span></div>
                        {totales.iva > 0 && (
                          <div>IVA: <span className="text-neutral-700 font-medium">{fmtPrecio(totales.iva)}</span></div>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Otros impuestos + notas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">
                  Otros impuestos / cargos
                  <span className="font-normal ml-1 text-neutral-600">(percepciones, flete, etc.)</span>
                </label>
                <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden">
                  <span className="px-3 py-2 text-sm text-neutral-600 bg-neutral-50 border-r border-neutral-200">$</span>
                  <input value={otrosImp} onChange={e => setOtrosImp(e.target.value)}
                    inputMode="decimal" placeholder="0"
                    className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 text-right disabled:opacity-50"
                    disabled={isPending} />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-neutral-800 mb-1.5">Notas (opcional)</label>
                <input value={notas} onChange={e => setNotas(e.target.value)}
                  placeholder="Observaciones…"
                  className={inputCls} disabled={isPending} />
              </div>
            </div>

            {/* Resumen total */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 flex items-end justify-between gap-4">
              <div className="text-xs text-neutral-600 space-y-0.5 tabular-nums">
                <div>Subtotal neto: <span className="text-neutral-700 font-medium">{fmtPrecio(totales.neto)}</span></div>
                <div>IVA total:     <span className="text-neutral-700 font-medium">{fmtPrecio(totales.iva)}</span></div>
                {otrosNum > 0 && (
                  <div>Otros cargos: <span className="text-neutral-700 font-medium">{fmtPrecio(otrosNum)}</span></div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-neutral-600 mb-0.5">Total {tipo}</div>
                <div className="text-2xl font-bold tabular-nums text-neutral-900">
                  {fmtPrecio(totalFinal)}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-danger bg-danger-bg border border-danger-border rounded-xl px-4 py-3">{error}</p>
            )}

            {imagenUrl && (
              <a href={imagenUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-tierra-700 hover:underline">
                <Camera className="size-3.5" /> Ver foto adjunta
              </a>
            )}

            <button type="submit" disabled={isPending}
              className="px-6 py-2.5 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-800 disabled:opacity-40 transition-colors">
              {isPending ? "Registrando…" : "Confirmar recepción"}
            </button>
          </form>
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <HistorialTable historial={historial} />
      )}

      {historial.length === 0 && !formOpen && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-8 py-12 text-center">
          <p className="text-sm text-neutral-600">Todavía no hay recepciones registradas.</p>
          <p className="text-xs text-neutral-500 mt-1">Usá el botón de arriba para cargar tu primera factura o remito.</p>
        </div>
      )}
    </div>
  );
}

function HistorialTable({ historial }: { historial: RecepcionHistorial[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded(prev => prev === id ? null : id);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-neutral-100">
        <p className="text-sm font-semibold text-neutral-800">Historial de recepciones</p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-left">
            <th className="px-4 py-3 w-6"></th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-600">Fecha</th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-600">Tipo / Número</th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-600">Proveedor</th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-600 text-center">Ítems</th>
            <th className="px-4 py-3 text-xs font-semibold text-neutral-600 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {historial.map(h => {
            const isOpen = expanded === h.id;
            return (
              <>
                <tr
                  key={h.id}
                  onClick={() => toggle(h.id)}
                  className={`border-t border-neutral-50 cursor-pointer transition-colors ${isOpen ? "bg-neutral-50" : "hover:bg-neutral-50"}`}
                >
                  <td className="px-4 py-3 text-neutral-500">
                    {isOpen
                      ? <ChevronDown className="size-3.5" />
                      : <ChevronRight className="size-3.5" />
                    }
                  </td>
                  <td className="px-4 py-3 text-neutral-600 text-xs">{fmtFecha(h.fecha)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full mr-2 ${
                      h.tipo === "factura" ? "bg-info-bg text-info" : "bg-neutral-100 text-neutral-600"
                    }`}>
                      {h.tipo === "factura" ? "Factura" : "Remito"}
                    </span>
                    <span className="font-mono text-sm text-neutral-800">{h.numero}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-neutral-800">{h.proveedor}</td>
                  <td className="px-4 py-3 text-center text-neutral-600 text-xs">{h.items.length}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-neutral-800">
                    {h.total !== null ? fmtPrecio(h.total) : "—"}
                  </td>
                </tr>

                {isOpen && (
                  <tr key={`${h.id}-detail`} className="bg-neutral-50 border-t border-neutral-100">
                    <td colSpan={6} className="px-6 pb-4 pt-2">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-neutral-600 border-b border-neutral-200">
                            <th className="text-xs py-1.5 pr-4 font-semibold">Insumo</th>
                            <th className="text-xs py-1.5 pr-4 font-semibold text-right">Cantidad</th>
                            <th className="text-xs py-1.5 pr-4 font-semibold">Un.</th>
                            <th className="text-xs py-1.5 pr-4 font-semibold text-right">Precio neto/u.</th>
                            <th className="text-xs py-1.5 pr-4 font-semibold text-right">IVA</th>
                            <th className="text-xs py-1.5 pr-4 font-semibold text-right">Subtotal c/IVA</th>
                            <th className="text-xs py-1.5 font-semibold">Vencimiento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {h.items.map(it => (
                            <tr key={it.id} className="text-neutral-700">
                              <td className="py-1.5 pr-4 font-medium">{it.insumo_nombre}</td>
                              <td className="py-1.5 pr-4 text-right tabular-nums">{fmtNum(it.cantidad)}</td>
                              <td className="py-1.5 pr-4 font-mono text-neutral-600">{it.unidad}</td>
                              <td className="py-1.5 pr-4 text-right tabular-nums">{fmtPrecio(it.precio_unitario)}</td>
                              <td className="py-1.5 pr-4 text-right tabular-nums text-neutral-600">
                                {it.iva_pct > 0 ? `${it.iva_pct}%` : "—"}
                              </td>
                              <td className="py-1.5 pr-4 text-right tabular-nums font-semibold">{fmtPrecio(it.subtotal_civa)}</td>
                              <td className="py-1.5 text-neutral-600">
                                {it.fecha_vencimiento ? fmtFecha(it.fecha_vencimiento) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Pie del detalle */}
                      <div className="mt-3 flex items-start justify-between gap-4">
                        <div className="text-xs text-neutral-600 space-y-1">
                          {h.proveedor_cuit && <p>CUIT: <span className="font-mono text-neutral-600">{h.proveedor_cuit}</span></p>}
                          {h.notas && <p className="italic">Notas: {h.notas}</p>}
                          {h.imagen_url && (
                            <a href={h.imagen_url} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-tierra-700 hover:underline">
                              <Camera className="size-3" /> Ver foto adjunta
                            </a>
                          )}
                        </div>
                        <div className="text-xs text-neutral-600 text-right space-y-0.5 tabular-nums">
                          <div>Subtotal neto: <span className="text-neutral-700 font-medium">{fmtPrecio(h.items.reduce((s, i) => s + i.subtotal_neto, 0))}</span></div>
                          <div>IVA total: <span className="text-neutral-700 font-medium">{fmtPrecio(h.items.reduce((s, i) => s + (i.subtotal_civa - i.subtotal_neto), 0))}</span></div>
                          {h.otros_impuestos > 0 && (
                            <div>Otros cargos: <span className="text-neutral-700 font-medium">{fmtPrecio(h.otros_impuestos)}</span></div>
                          )}
                          <div className="pt-1 border-t border-neutral-200 font-semibold text-neutral-800 text-sm">
                            Total: {h.total !== null ? fmtPrecio(h.total) : "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
