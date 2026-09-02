import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCategorias } from "./actions";
import { InsumosClient, type Insumo } from "./insumos-client";

export const metadata: Metadata = { title: "Insumos — Cocina En Minutas" };
export const revalidate = 0;

export default async function InsumosPage() {
  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [rawInsumos, categorias] = await Promise.all([
    adminClient
      .from("insumos")
      .select("id, nombre, unidad, precio_unitario, proveedor, updated_at, stock_actual, stock_minimo, punto_pedido, stock_maximo, categoria")
      .order("nombre")
      .then(({ data }: { data: any[] | null }) => data ?? []),
    getCategorias(),
  ]);

  const insumos = (rawInsumos as any[]).map(i => ({
    ...i,
    stock_actual: Number(i.stock_actual ?? 0),
    stock_minimo: Number(i.stock_minimo ?? 0),
    punto_pedido: Number(i.punto_pedido ?? 0),
    stock_maximo: Number(i.stock_maximo ?? 0),
  })) as Insumo[];

  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <Link href="/admin/cocina" className="text-sm text-neutral-400 hover:text-neutral-700 mb-2 inline-block">
          ← Cocina
        </Link>
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Insumos</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Catálogo de materias primas con precios. Las recetas los referencian — actualizá un precio acá y se recalcula en todas las recetas.
        </p>
      </div>

      <InsumosClient insumos={insumos} categorias={categorias} />
    </div>
  );
}
