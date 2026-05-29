"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarReceta, eliminarReceta } from "@/app/(admin)/admin/cocina/recetas/actions";

type Step = { description: string; minutes: number; notes: string };

type RecetaProps = {
  productId: string;
  recipe: {
    yieldCajas: number;
    notes:      string;
    steps:      Step[];
  } | null;
};

const STEP_TEMPLATES = [
  { description: "Pesar y medir ingredientes", minutes: 5 },
  { description: "Preparar y limpiar lugar de trabajo", minutes: 3 },
  { description: "Mezclar/amasar", minutes: 10 },
  { description: "Armar/moldear unidades", minutes: 15 },
  { description: "Congelar", minutes: 120 },
  { description: "Empacar en bolsas", minutes: 10 },
  { description: "Armar y etiquetar cajas", minutes: 5 },
];

function fmtMin(min: number) {
  if (!min) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function RecetaEditor({ productId, recipe }: RecetaProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [yieldCajas, setYieldCajas] = useState(recipe?.yieldCajas ?? 1);
  const [notes,      setNotes]      = useState(recipe?.notes ?? "");
  const [steps,      setSteps]      = useState<Step[]>(
    recipe?.steps.length ? recipe.steps : [{ description: "", minutes: 0, notes: "" }]
  );

  const totalMinutos = steps.reduce((s, st) => s + (st.minutes || 0), 0);

  function addStep() {
    setSteps((prev) => [...prev, { description: "", minutes: 0, notes: "" }]);
  }

  function removeStep(i: number) {
    setSteps((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateStep(i: number, field: keyof Step, value: string | number) {
    setSteps((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  function moveStep(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function addTemplate(tpl: { description: string; minutes: number }) {
    setSteps((prev) => [...prev, { description: tpl.description, minutes: tpl.minutes, notes: "" }]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (steps.filter((s) => s.description.trim()).length === 0) {
      setError("Agregá al menos un paso con descripción.");
      return;
    }
    setError(null); setSuccess(null);

    const fd = new FormData();
    fd.set("product_id",  productId);
    fd.set("yield_cajas", String(yieldCajas));
    fd.set("notes",       notes);
    steps.forEach((s, i) => {
      fd.set(`steps[${i}][description]`, s.description);
      fd.set(`steps[${i}][minutes]`,     String(s.minutes));
      fd.set(`steps[${i}][notes]`,       s.notes);
    });

    startTransition(async () => {
      try {
        await guardarReceta(fd);
        setSuccess("Receta guardada correctamente.");
      } catch (err: any) {
        setError(err.message ?? "Error al guardar");
      }
    });
  }

  function handleEliminar() {
    if (!confirm("¿Eliminar esta receta? Se perderán todos los pasos.")) return;
    startTransition(async () => {
      await eliminarReceta(productId);
      router.push("/admin/cocina/recetas");
    });
  }

  const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Config del lote */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <p className="text-sm font-semibold text-neutral-700 mb-4">Configuración del lote</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              Cajas que produce este lote estándar
            </label>
            <input
              type="number" min={1} value={yieldCajas}
              onChange={(e) => setYieldCajas(parseInt(e.target.value) || 1)}
              className={inputCls}
              disabled={isPending}
            />
            <p className="text-xs text-neutral-400 mt-1">
              Los tiempos de cada paso aplican para producir {yieldCajas} caja{yieldCajas !== 1 ? "s" : ""}.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">Notas generales</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Temperatura de horno, tips, etc."
              rows={3}
              className={`${inputCls} resize-none`}
              disabled={isPending}
            />
          </div>
        </div>

        {totalMinutos > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
            <p className="text-xs text-neutral-500">Tiempo total del lote de {yieldCajas} caja{yieldCajas !== 1 ? "s" : ""}</p>
            <p className="text-sm font-semibold text-neutral-900">{fmtMin(totalMinutos)}</p>
          </div>
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
                  <input
                    type="text"
                    placeholder="Descripción del paso (ej: Pelar y picar cebolla)"
                    value={step.description}
                    onChange={(e) => updateStep(i, "description", e.target.value)}
                    className={inputCls}
                    disabled={isPending}
                  />
                  <div className="relative">
                    <input
                      type="number" min={0} step={0.5}
                      placeholder="0"
                      value={step.minutes || ""}
                      onChange={(e) => updateStep(i, "minutes", parseFloat(e.target.value) || 0)}
                      className={`${inputCls} pr-10`}
                      disabled={isPending}
                    />
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
                <input
                  type="text"
                  placeholder="Notas adicionales (opcional)"
                  value={step.notes}
                  onChange={(e) => updateStep(i, "notes", e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50 text-neutral-600 placeholder:text-neutral-300"
                  disabled={isPending}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-neutral-100 space-y-3">
          <button type="button" onClick={addStep} disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition-colors">
            + Agregar paso
          </button>

          {/* Templates rápidos */}
          <div>
            <p className="text-xs text-neutral-400 mb-2">Pasos comunes:</p>
            <div className="flex flex-wrap gap-1.5">
              {STEP_TEMPLATES.map((tpl) => (
                <button key={tpl.description} type="button" onClick={() => addTemplate(tpl)} disabled={isPending}
                  className="px-2.5 py-1 text-xs rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50 transition-colors">
                  {tpl.description}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Acciones */}
      {error   && <p className="text-sm text-danger px-1">{error}</p>}
      {success && <p className="text-sm text-success px-1">{success}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending}
          className="px-5 py-2.5 rounded-xl bg-tierra-700 text-white text-sm font-semibold hover:bg-tierra-800 disabled:opacity-50 transition-colors">
          {isPending ? "Guardando…" : "Guardar receta"}
        </button>
        <a href="/admin/cocina/recetas" className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors">
          Cancelar
        </a>
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
