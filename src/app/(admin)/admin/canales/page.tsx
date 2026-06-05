import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { eliminarCanal } from "./actions";

export const metadata: Metadata = { title: "Canales B2B — Admin En Minutas" };
export const revalidate = 0;

export default async function CanalesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const admin = createAdminClient();
  const { data: canales } = await admin
    .from("canales")
    .select("id, slug, nombre, descuento_pct, activo, sort_order")
    .order("sort_order") as any;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Canales B2B</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Cada canal define el descuento % aplicado sobre el precio de lista.
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
              <th className="px-4 py-3 font-medium text-neutral-500">Slug</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-right">Descuento</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-center">Activo</th>
              <th className="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {(canales ?? []).map((c: any) => (
              <tr key={c.id} className={`hover:bg-neutral-50 ${!c.activo ? "opacity-50" : ""}`}>
                <td className="px-4 py-3 font-medium text-neutral-900">{c.nombre}</td>
                <td className="px-4 py-3 font-mono text-xs text-neutral-400">{c.slug}</td>
                <td className="px-4 py-3 text-right tabular-nums font-medium text-neutral-700">
                  {c.descuento_pct > 0 ? `−${c.descuento_pct}%` : "Sin descuento"}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-block size-2 rounded-full ${c.activo ? "bg-success" : "bg-neutral-300"}`} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/canales/${c.id}/editar`}
                      className="text-xs text-tierra-700 hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={eliminarCanal.bind(null, c.id)}>
                      <button
                        type="submit"
                        className="text-xs text-danger hover:underline"
                        onClick={(e) => {
                          if (!confirm(`¿Eliminar el canal "${c.nombre}"?`)) e.preventDefault();
                        }}
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {(!canales || canales.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                  No hay canales configurados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        El precio final para un cliente = precio lista × (1 − descuento canal − descuento extra cliente) + flete zona.
      </p>
    </div>
  );
}
