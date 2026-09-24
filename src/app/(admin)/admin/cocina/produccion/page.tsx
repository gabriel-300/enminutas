import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getProductosConReceta, getHistorialProduccion } from "./actions";
import { ProduccionClient } from "./produccion-client";

export const metadata: Metadata = { title: "Producción — Cocina En Minutas" };
export const revalidate = 0;

export default async function ProduccionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = user.app_metadata?.role as string | undefined;
  if (role !== "admin" && role !== "produccion") redirect("/admin");

  const [productos, historial] = await Promise.all([
    getProductosConReceta(),
    getHistorialProduccion(),
  ]);

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <div className="mb-6">
        <Link href="/admin/cocina" className="text-sm text-neutral-600 hover:text-neutral-700 mb-2 inline-block">
          ← Cocina
        </Link>
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Producción</h1>
        <p className="text-sm text-neutral-600 mt-1">
          Registrá lotes de producción. Al confirmar se descuentan automáticamente los insumos de la receta.
        </p>
      </div>

      {productos.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-8 py-12 text-center">
          <p className="text-sm text-neutral-600">
            No hay productos con receta cargada.{" "}
            <Link href="/admin/cocina/recetas" className="text-brand-700 hover:underline font-medium">
              Ir a Recetas →
            </Link>
          </p>
        </div>
      ) : (
        <ProduccionClient productos={productos} historial={historial} />
      )}
    </div>
  );
}
