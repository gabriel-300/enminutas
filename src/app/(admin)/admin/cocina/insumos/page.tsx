import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InsumosClient, type Insumo } from "./insumos-client";

export const metadata: Metadata = { title: "Insumos — Cocina En Minutas" };
export const revalidate = 0;

export default async function InsumosPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: raw } = await adminClient
    .from("insumos")
    .select("id, nombre, unidad, precio_unitario, proveedor, updated_at")
    .order("nombre");

  const insumos = (raw ?? []) as Insumo[];

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/admin/cocina" className="text-sm text-neutral-400 hover:text-neutral-700 mb-2 inline-block">
          ← Cocina
        </Link>
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Insumos</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Catálogo de materias primas con precios. Las recetas los referencian — actualizá un precio acá y se recalcula en todas las recetas.
        </p>
      </div>

      <div className="mb-5 p-4 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs text-neutral-500 space-y-1">
        <p className="font-semibold text-neutral-600">Formato del CSV para importar precios:</p>
        <p className="font-mono bg-white border border-neutral-200 rounded-lg px-3 py-2 text-neutral-700">
          nombre,precio<br />
          Harina 000,1850<br />
          Huevo,320<br />
          Mozzarella,8200
        </p>
        <p>El nombre debe coincidir exactamente con el catálogo (sin distinción de mayúsculas). Solo actualiza insumos existentes.</p>
      </div>

      <InsumosClient insumos={insumos} />
    </div>
  );
}
