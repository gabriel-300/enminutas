import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ImportarProductosClient } from "@/components/admin/importar-productos-client";

export const metadata: Metadata = { title: "Importar precios — Admin En Minutas" };
export const revalidate = 0;

export default async function ImportarPreciosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link
          href="/admin/productos"
          className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-2 inline-block"
        >
          ← Volver a productos
        </Link>
        <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">
          Importar precios
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Actualizá costos de forma masiva desde una planilla Excel / CSV.
        </p>
      </div>

      <div className="mb-6 bg-crema-50 border border-crema-200 rounded-2xl px-5 py-4 text-xs text-neutral-600 space-y-1.5">
        <p className="font-semibold text-neutral-800">¿Cómo funciona?</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Descargá la plantilla CSV con los precios actuales.</li>
          <li>Abrila en Excel o Google Sheets y editá la columna <strong>costo</strong> (y opcionalmente <strong>pkg_unitario</strong> / <strong>pkg_bulto</strong>).</li>
          <li>Guardá como CSV y subila acá.</li>
          <li>El sistema te muestra qué va a cambiar antes de confirmar.</li>
        </ol>
        <p className="text-neutral-400 pt-1">
          El campo <strong>codigo</strong> no debe modificarse — se usa para identificar cada producto.
          Los precios B2B se recalculan automáticamente al guardar.
        </p>
      </div>

      <ImportarProductosClient />
    </div>
  );
}
