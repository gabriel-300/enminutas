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

  const { data: products, error } = await supabase
    .from("products")
    .select(`
      id, sku, name, price_b2c, is_active, unit_label,
      stock_cajas, stock_minimo, precio_lista,
      category:categories (name)
    `)
    .order("is_active", { ascending: false })
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
      <div className="mb-5 md:mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">Productos</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {products?.length ?? 0} productos
          </p>
        </div>
        <Link
          href="/admin/productos/nuevo"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 transition-colors"
        >
          + Nuevo producto
        </Link>
      </div>

      <ProductsAdminClient products={products as any[]} />
    </div>
  );
}
