import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getParametros } from "@/lib/parametros";
import { actualizarParametros } from "./actions";

export const metadata: Metadata = { title: "Parámetros — Admin En Minutas" };
export const revalidate = 0;

export default async function ParametrosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  // Fetch también historial de actualización
  const db = supabase as any;
  const { data: rows } = await db
    .from("parametros_globales")
    .select("clave, valor, descripcion, actualizado_at, actualizado_por")
    .order("clave");

  const params = await getParametros();

  const rowMap = Object.fromEntries(
    (rows ?? []).map((r: any) => [r.clave, r])
  );

  const fmtDate = (iso: string | null) => iso
    ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
    : "—";

  return (
    <div className="p-4 md:p-8 max-w-xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">
          Parámetros — Configuración global
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Valores que aplican a todos los cálculos de precio B2B.
        </p>
      </div>

      <form action={actualizarParametros} className="space-y-6">
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Fórmula de precio</p>
            <p className="text-xs text-neutral-400 mt-1 font-mono">
              FINAL c/IVA = (Lista s/IVA × (1 + IVA%)) + (Lista s/IVA × Comisión%)
            </p>
          </div>

          <div className="divide-y divide-neutral-100">
            {/* IVA */}
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900">IVA</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {rowMap["iva_pct"]?.descripcion ?? "Se aplica sobre la Lista s/IVA"}
                </p>
                <p className="text-xs text-neutral-300 mt-1">
                  Actualizado: {fmtDate(rowMap["iva_pct"]?.actualizado_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  name="iva_pct"
                  type="number"
                  defaultValue={Math.round(params.iva_pct * 100)}
                  min="1" max="99" step="1" required
                  className="w-20 px-3 py-2 text-sm text-right border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 tabular-nums font-semibold"
                />
                <span className="text-sm text-neutral-500">%</span>
              </div>
            </div>

            {/* Comisión */}
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-neutral-900">Comisión</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {rowMap["comision_pct"]?.descripcion ?? "Sobre la Lista s/IVA (acordado con Alex)"}
                </p>
                <p className="text-xs text-neutral-300 mt-1">
                  Actualizado: {fmtDate(rowMap["comision_pct"]?.actualizado_at)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  name="comision_pct"
                  type="number"
                  defaultValue={Math.round(params.comision_pct * 100)}
                  min="0" max="99" step="1" required
                  className="w-20 px-3 py-2 text-sm text-right border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 tabular-nums font-semibold"
                />
                <span className="text-sm text-neutral-500">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen live */}
        <div className="bg-crema-50 rounded-2xl border border-crema-200 px-5 py-4 text-sm text-neutral-600 space-y-1">
          <p className="font-medium text-neutral-800">Efecto en precios:</p>
          <p>
            Comisión actual: <span className="font-semibold text-tierra-700">
              {Math.round(params.comision_pct * 100)}%
            </span> sobre Lista s/IVA
          </p>
          <p>
            IVA actual: <span className="font-semibold text-tierra-700">
              {Math.round(params.iva_pct * 100)}%
            </span> sobre Lista s/IVA
          </p>
          <p className="text-xs text-neutral-400 pt-1">
            Multiplicador total: ×{(1 + params.iva_pct + params.comision_pct).toFixed(2)} sobre Lista s/IVA
            (ej: si comisión sube a 18% → ×{(1 + params.iva_pct + 0.18).toFixed(2)})
          </p>
        </div>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 transition-colors"
        >
          Guardar parámetros
        </button>
      </form>
    </div>
  );
}
