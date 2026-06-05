import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { actualizarCanal } from "../../actions";

export const metadata: Metadata = { title: "Editar canal — Admin En Minutas" };

export default async function EditarCanalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const admin = createAdminClient();
  const { data: canal } = await admin.from("canales").select("*").eq("id", id).single() as any;
  if (!canal) notFound();

  const action = actualizarCanal.bind(null, id);

  return (
    <div className="p-8 max-w-lg">
      <Link href="/admin/canales" className="text-sm text-neutral-400 hover:text-neutral-700 mb-4 inline-block">
        ← Canales B2B
      </Link>
      <h1 className="text-2xl font-semibold font-display text-neutral-900 mb-6">Editar canal</h1>

      <form action={action} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Nombre *</label>
            <input name="nombre" defaultValue={canal.nombre} required
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Slug</label>
            <input value={canal.slug} readOnly
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl bg-neutral-50 font-mono text-neutral-400 cursor-not-allowed" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Descuento % sobre lista</label>
            <input name="descuento_pct" type="number" defaultValue={canal.descuento_pct} min="0" max="99" step="0.01"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">Orden</label>
            <input name="sort_order" type="number" defaultValue={canal.sort_order} min="0"
              className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" name="activo" id="activo" defaultChecked={canal.activo} className="size-4 rounded accent-tierra-700" />
          <label htmlFor="activo" className="text-sm text-neutral-700">Canal activo</label>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" className="px-5 py-2.5 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 transition-colors">
            Guardar cambios
          </button>
          <Link href="/admin/canales" className="px-5 py-2.5 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
