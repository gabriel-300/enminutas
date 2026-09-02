"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarReceta, eliminarReceta, sincronizarCostoProducto } from "@/app/(admin)/admin/cocina/recetas/actions";

type Step = { description: string; minutes: number; notes: string };
type Ing  = { insumo_id: string; cantidad: number; cantidadStr?: string };

export type InsumoOpcion = {
  id: string; nombre: string; unidad: string; precio_unitario: number;
};

type RecetaProps = {
  productId:    string;
  insumos:      InsumoOpcion[];
  recipe: {
    yieldCajas:    number;
    vidaUtilDias:  number;
    notes:         string;
    steps:         Step[];
    ingredients:   Ing[];
  } | null;
};

const STEP_TEMPLATES = [
  { description: "Pesar y medir ingredientes",          minutes: 5   },
  { description: "Preparar y limpiar lugar de trabajo", minutes: 3   },
  { description: "Mezclar/amasar",                      minutes: 10  },
  { description: "Armar/moldear unidades",               minutes: 15  },
  { description: "Congelar",                             minutes: 120 },
  { description: "Empacar en bolsas",                    minutes: 10  },
  { description: "Armar y etiquetar cajas",              minutes: 5   },
];

function fmtMin(min: number) {
  if (!min) return "—";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${min} min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const fmtARS = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

export function RecetaEditor({ productId, insumos, recipe }: RecetaProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const [yieldCajasStr,   setYieldCajasStr]   = useState(String(recipe?.yieldCajas ?? 1));
  const yieldCajas = parseFloat(yieldCajasStr.replace(",", ".")) || 1;
  const [vidaUtilDias, setVidaUtilDias] = useState(recipe?.vidaUtilDias ?? 180);
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [steps, setSteps] = useState<Step[]>(
    recipe?.steps.length ? recipe.steps : [{ description: "", minutes: 0, notes: "" }]
  );
  const [ings, setIngs] = useState<Ing[]>(
    (recipe?.ingredients ?? []).map(i => ({ ...i, cantidadStr: i.cantidadStr ?? String(i.cantidad) }))
  );

  // Mapa para lookup rápido de insumos
  const insumoMap = Object.fromEntries(insumos.map(i => [i.id, i]));

  // Cálculo de costos en tiempo real
  const costoLote = ings.reduce((s, ing) => {
    const ins = insumoMap[ing.insumo_id];
    return s + (ins ? ing.cantidad * ins.precio_unitario : 0);
  }, 0);
  const costoCaja = yieldCajas > 0 ? costoLote / yieldCajas : 0;
  const totalMinutos = steps.reduce((s, st) => s + (st.minutes || 0), 0);

  // ── Pasos ──────────────────────────────────────────────────────────────────
  const addStep = () => setSteps(p => [...p, { description: "", minutes: 0, notes: "" }]);
  const removeStep = (i: number) => setSteps(p => p.filter((_, idx) => idx !== i));
  const updateStep = (i: number, f: keyof Step, v: string | number) =>
    setSteps(p => p.map((s, idx) => idx === i ? { ...s, [f]: v } : s));
  const moveStep = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    setSteps(p => { const n = [...p]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  };

  // ── Ingredientes ───────────────────────────────────────────────────────────
  const addIng = () => setIngs(p => [...p, { insumo_id: "", cantidad: 0, cantidadStr: "" }]);
  const removeIng = (i: number) => setIngs(p => p.filter((_, idx) => idx !== i));
  const updateIngInsumo = (i: number, insumo_id: string) =>
    setIngs(p => p.map((ing, idx) => idx === i ? { ...ing, insumo_id } : ing));
  const updateIngCantidad = (i: number, raw: string) => {
    const parsed = parseFloat(raw.replace(",", "."));
    setIngs(p => p.map((ing, idx) =>
      idx === i ? { ...ing, cantidadStr: raw, cantidad: isNaN(parsed) ? 0 : parsed } : ing
    ));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (steps.filter(s => s.description.trim()).length === 0) {
      setError("Agregá al menos un paso con descripción.");
      return;
    }
    setError(null); setSuccess(null); setSyncMsg(null);

    const fd = new FormData();
    fd.set("product_id",     productId);
    fd.set("yield_cajas",    String(parseFloat(yieldCajasStr.replace(",", ".")) || 1));
    fd.set("vida_util_dias", String(vidaUtilDias));
    fd.set("notes",          notes);

    steps.forEach((s, i) => {
      fd.set(`steps[${i}][description]`, s.description);
      fd.set(`steps[${i}][minutes]`,     String(s.minutes));
      fd.set(`steps[${i}][notes]`,       s.notes);
    });

    ings.forEach((ing, i) => {
      fd.set(`ings[${i}][insumo_id]`, ing.insumo_id);
      fd.set(`ings[${i}][cantidad]`,  String(ing.cantidad));
    });

    startTransition(async () => {
      const result = await guardarReceta(fd);
      if ("error" in result) setError(result.error);
      else setSuccess("Receta guardada correctamente.");
    });
  }

  function handleEliminar() {
    if (!confirm("¿Eliminar esta receta? Se perderán todos los datos.")) return;
    startTransition(async () => {
      const result = await eliminarReceta(productId);
      if ("error" in result) setError(result.error);
      else router.push("/admin/cocina/recetas");
    });
  }

  function handleSincronizar() {
    if (!confirm("¿Actualizar el costo del producto con el costo calculado de la receta? Esto afecta el precio B2B.")) return;
    setSyncMsg(null);
    startTransition(async () => {
      const result = await sincronizarCostoProducto(productId);
      if ("error" in result) setSyncMsg(`Error: ${result.error}`);
      else setSyncMsg(`✓ Costo actualizado: ${fmtARS(costoCaja)} / caja`);
    });
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Config del lote */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <p className="text-sm font-semibold text-neutral-700 mb-4">Configuración del lote</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              Cajas que produce este lote estándar
            </label>
            <input type="text" inputMode="decimal" value={yieldCajasStr}
              onChange={e => setYieldCajasStr(e.target.value)}
              className={inputCls} disabled={isPending} />
            <p className="text-xs text-neutral-400 mt-1">
              Los ingredientes aplican para producir {yieldCajas} caja{yieldCajas !== 1 ? "s" : ""}.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              Vida útil del producto (días)
            </label>
            <input type="number" min="1" value={vidaUtilDias}
              onChange={e => setVidaUtilDias(parseInt(e.target.value) || 180)}
              className={inputCls} disabled={isPending} />
            <p className="text-xs text-neutral-400 mt-1">
              Se usa para calcular la fecha de vencimiento al registrar producción.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Notas generales</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Temperatura de horno, tips, etc." rows={3}
              className={`${inputCls} resize-none`} disabled={isPending} />
          </div>
        </div>

        {(totalMinutos > 0 || costoLote > 0) && (
          <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-4">
            {totalMinutos > 0 && (
              <div>
                <p className="text-xs text-neutral-500">Tiempo total del lote</p>
                <p className="text-sm font-semibold text-neutral-900">{fmtMin(totalMinutos)}</p>
              </div>
            )}
            {costoLote > 0 && (
              <div>
                <p className="text-xs text-neutral-500">Costo de materia prima</p>
                <p className="text-sm font-semibold text-neutral-900">
                  {fmtARS(costoLote)} / lote
                  <span className="text-tierra-700 ml-2">{fmtARS(costoCaja)} / caja</span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ingredientes */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-700">Ingredientes del lote</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              Qué se necesita para producir {yieldCajas} caja{yieldCajas !== 1 ? "s" : ""}
            </p>
          </div>
          {costoLote > 0 && (
            <div className="text-right">
              <span className="text-xs font-semibold text-neutral-700">{fmtARS(costoLote)} / lote</span>
              <span className="text-xs text-tierra-700 ml-2 font-semibold">{fmtARS(costoCaja)} / caja</span>
            </div>
          )}
        </div>

        {insumos.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-neutral-500">No hay insumos en el catálogo todavía.</p>
            <a href="/admin/cocina/insumos"
              className="inline-block mt-2 text-sm text-tierra-700 font-medium hover:underline">
              → Crear insumos primero
            </a>
          </div>
        ) : (
          <>
            {ings.length > 0 && (
              <div className="divide-y divide-neutral-100">
                {ings.map((ing, i) => {
                  const ins = insumoMap[ing.insumo_id];
                  const costoIng = ins ? ing.cantidad * ins.precio_unitario : 0;
                  return (
                    <div key={i} className="px-5 py-3 flex items-center gap-2">
                      <span className="text-xs font-mono text-neutral-300 w-5 text-center shrink-0">{i + 1}</span>

                      {/* Selector de insumo */}
                      <select
                        value={ing.insumo_id}
                        onChange={e => updateIngInsumo(i, e.target.value)}
                        disabled={isPending}
                        className="flex-1 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50 bg-white"
                      >
                        <option value="">— Seleccionar insumo —</option>
                        {insumos.map(ins => (
                          <option key={ins.id} value={ins.id}>
                            {ins.nombre} ({ins.unidad})
                          </option>
                        ))}
                      </select>

                      {/* Cantidad — guardamos el string para permitir "0,5" / "0.5" */}
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="text" inputMode="decimal"
                          placeholder="0"
                          value={ing.cantidadStr ?? ""}
                          onChange={e => updateIngCantidad(i, e.target.value)}
                          disabled={isPending}
                          className="w-20 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50 text-center"
                        />
                        {ins && (
                          <span className="text-xs text-neutral-400 font-mono w-8">{ins.unidad}</span>
                        )}
                      </div>

                      {/* Costo calculado */}
                      <div className="w-28 text-right">
                        {costoIng > 0 ? (
                          <span className="text-sm font-medium text-neutral-700 tabular-nums">
                            {fmtARS(costoIng)}
                          </span>
                        ) : (
                          <span className="text-sm text-neutral-300">—</span>
                        )}
                      </div>

                      <button type="button" onClick={() => removeIng(i)} disabled={isPending}
                        className="size-7 flex items-center justify-center rounded-lg border border-danger/30 text-danger hover:bg-danger-bg disabled:opacity-30 text-xs shrink-0">
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="px-5 py-4 border-t border-neutral-100 flex items-center gap-3">
              <button type="button" onClick={addIng} disabled={isPending}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors">
                + Agregar ingrediente
              </button>
              {ings.length === 0 && (
                <p className="text-xs text-neutral-400">Sin ingredientes no se puede generar la lista de compras.</p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Pasos */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-neutral-700">Pasos de producción</p>
          <span className="text-xs text-neutral-400">{steps.length} paso{steps.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="divide-y divide-neutral-100">
          {steps.map((step, i) => (
            <div key={i} className="px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-neutral-300 w-5 text-center">{i + 1}</span>
                <div className="flex-1 grid grid-cols-[1fr_100px] gap-2">
                  <input type="text" placeholder="Descripción del paso"
                    value={step.description}
                    onChange={e => updateStep(i, "description", e.target.value)}
                    className={inputCls} disabled={isPending} />
                  <div className="relative">
                    <input type="text" inputMode="decimal" placeholder="0"
                      value={step.minutes || ""}
                      onChange={e => updateStep(i, "minutes", parseFloat(e.target.value.replace(",", ".")) || 0)}
                      className={`${inputCls} pr-10`} disabled={isPending} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">min</span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0 || isPending}
                    className="size-7 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 text-xs">↑</button>
                  <button type="button" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1 || isPending}
                    className="size-7 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 text-xs">↓</button>
                  <button type="button" onClick={() => removeStep(i)} disabled={isPending}
                    className="size-7 flex items-center justify-center rounded-lg border border-danger/30 text-danger hover:bg-danger-bg disabled:opacity-30 text-xs">✕</button>
                </div>
              </div>
              <div className="pl-7">
                <input type="text" placeholder="Notas adicionales (opcional)"
                  value={step.notes}
                  onChange={e => updateStep(i, "notes", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50 text-neutral-600"
                  disabled={isPending} />
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-neutral-100 space-y-3">
          <button type="button" onClick={addStep} disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors">
            + Agregar paso
          </button>
          <div>
            <p className="text-xs text-neutral-400 mb-2">Pasos comunes:</p>
            <div className="flex flex-wrap gap-1.5">
              {STEP_TEMPLATES.map(tpl => (
                <button key={tpl.description} type="button" disabled={isPending}
                  onClick={() => setSteps(p => [...p, { description: tpl.description, minutes: tpl.minutes, notes: "" }])}
                  className="px-2.5 py-1 text-xs rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50 transition-colors">
                  {tpl.description}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mensajes */}
      {error   && <p className="text-sm text-danger px-1">{error}</p>}
      {success && <p className="text-sm text-success px-1">{success}</p>}
      {syncMsg && (
        <p className={`text-sm px-1 ${syncMsg.startsWith("Error") ? "text-danger" : "text-emerald-600"}`}>
          {syncMsg}
        </p>
      )}

      {/* Acciones */}
      <div className="flex items-center flex-wrap gap-3">
        <button type="submit" disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-tierra-700 text-white text-sm font-semibold hover:bg-tierra-800 disabled:opacity-50 transition-colors">
          {isPending ? "Guardando…" : "Guardar receta"}
        </button>
        <a href="/admin/cocina/recetas"
          className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
          Cancelar
        </a>
        {costoLote > 0 && (
          <button type="button" onClick={handleSincronizar} disabled={isPending}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors">
            Actualizar costo del producto ({fmtARS(costoCaja)}/caja)
          </button>
        )}
        {recipe && (
          <button type="button" onClick={handleEliminar} disabled={isPending}
            className="ml-auto text-xs text-danger hover:underline disabled:opacity-40">
            Eliminar receta
          </button>
        )}
      </div>
    </form>
  );
}
