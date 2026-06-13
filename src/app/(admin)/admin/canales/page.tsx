import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EliminarCanalBtn } from "./eliminar-canal-btn";

export const metadata: Metadata = { title: "Canales B2B — Admin En Minutas" };
export const revalidate = 0;

export default async function CanalesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const admin = createAdminClient();
  const { data: canales } = await (admin as any)
    .from("canales")
    .select("id, slug, nombre, descuento_pct, margen_std, margen_premium, markup_pvp, activo, sort_order")
    .order("sort_order");

  const pct = (n: number | null) => n != null ? `${Math.round(n * 100)}%` : "—";

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Canales B2B</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Cada canal define los márgenes para el cálculo dinámico de precios v5.
          </p>
        </div>
        <Link
          href="/admin/canales/nuevo"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 transition-colors"
        >
          + Nuevo canal
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500">Canal</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-right">Margen std</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-right">Margen prem.</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-right">Markup PVP</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-center">Activo</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(canales ?? []).map((c: any) => (
              <tr key={c.id} className={`hover:bg-neutral-50 ${!c.activo ? "opacity-50" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-medium text-neutral-900">{c.nombre}</p>
                  <p className="text-xs font-mono text-neutral-400">{c.slug}</p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-neutral-700">
                  {pct(c.margen_std)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-neutral-700">
                  {pct(c.margen_premium)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-neutral-500">
                  {pct(c.markup_pvp)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block size-2 rounded-full ${c.activo ? "bg-success" : "bg-neutral-300"}`} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/canales/${c.id}/editar`} className="text-xs text-tierra-700 hover:underline">
                      Editar
                    </Link>
                    <EliminarCanalBtn id={c.id} nombre={c.nombre} />
                  </div>
                </td>
              </tr>
            ))}
            {(!canales || canales.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-neutral-400">
                  No hay canales configurados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
