import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { crearCanal } from "../actions";

export const metadata: Metadata = { title: "Nuevo canal — Admin En Minutas" };

export default async function NuevoCanalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  return (
    <div className="p-8 max-w-lg">
      <Link href="/admin/canales" className="text-sm text-neutral-400 hover:text-neutral-700 mb-4 inline-block">
        ← Canales B2B
      </Link>
      <h1 className="text-2xl font-semibold font-display text-neutral-900 mb-6">Nuevo canal</h1>

      <form action={crearCanal} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Nombre *</label>
            <input name="nombre" required placeholder="Gastronomía"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Slug * <span className="font-normal text-neutral-400">(único)</span></label>
            <input name="slug" required placeholder="gastro"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 font-mono" />
          </div>
        </div>

        {/* Márgenes v5 */}
        <div>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Márgenes de precio (fórmula v5)</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Margen std %</label>
              <input name="margen_std" type="number" defaultValue={40} min="0" max="99" step="1" required
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Margen premium %</label>
              <input name="margen_premium" type="number" defaultValue={45} min="0" max="99" step="1" required
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">Markup PVP %</label>
              <input name="markup_pvp" type="number" defaultValue={80} min="0" max="500" step="1" required
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
            </div>
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            Ingresá el valor en porcentaje (ej: 40 = 40%). El cálculo usa la fórmula: lista = costo / (1 − margen) + packaging.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Orden</label>
            <input name="sort_order" type="number" defaultValue={0} min="0"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Desc. lista % (legado)</label>
            <input name="descuento_pct" type="number" defaultValue={0} min="0" max="99" step="0.01"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 transition-colors">
            Crear canal
          </button>
          <Link href="/admin/canales" className="px-5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
