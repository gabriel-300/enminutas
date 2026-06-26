import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProductsAdminClient } from "@/components/admin/products-admin-client";

export const metadata: Metadata = { title: "Productos — Admin En Minutas" };
export const revalidate = 0;

export default async function AdminProductosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: products, error } = await (supabase as any)
    .from("products")
    .select(`
      id, sku, name, is_active, es_muestra, presentacion,
      codigo, costo, pkg_unitario, pkg_bulto,
      u_bolsa, bolsas_caja, kg_caja,
      categoria, updated_at,
      linea:lineas_producto!linea_id (nombre)
    `)
    .order("is_active", { ascending: false })
    .order("codigo", { ascending: true, nullsFirst: false })
    .order("name");

  if (error) {
    return (
      <div className="p-8 text-sm text-danger">
        Error al cargar productos: {error.message}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-5 md:mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Productos</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {products?.length ?? 0} productos
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/productos/importar"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            ↑ Importar precios
          </Link>
          <Link
            href="/admin/productos/nuevo"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 transition-colors"
          >
            + Nuevo producto
          </Link>
        </div>
      </div>

      <ProductsAdminClient products={products as any[]} />
    </div>
  );
}
