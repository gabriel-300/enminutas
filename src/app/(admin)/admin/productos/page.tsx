import type { Metadata } from "next";
import { Plus, Upload } from "lucide-react";
import { ButtonLink, PageHeader } from "@/components/ui";
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
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <PageHeader
        className="mb-5"
        title="Productos"
        subtitle={`${products?.length ?? 0} productos`}
        actions={
          <>
            <ButtonLink href="/admin/productos/importar" variant="secondary"><Upload />Importar precios</ButtonLink>
            <ButtonLink href="/admin/productos/nuevo"><Plus />Nuevo producto</ButtonLink>
          </>
        }
      />

      <ProductsAdminClient products={products as any[]} />
    </div>
  );
}
