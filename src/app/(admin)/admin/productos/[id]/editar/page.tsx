import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ProductoForm } from "@/components/admin/producto-form";
import { EliminarProductoButton } from "@/components/admin/eliminar-producto-button";
import { actualizarProducto } from "../../actions";

export const metadata: Metadata = { title: "Editar producto — Admin En Minutas" };

export default async function EditarProductoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: product }, { data: categorias }, { data: lineas }] = await Promise.all([
    (supabase as any)
      .from("products")
      .select(`
        id, sku, name, unit_label, short_description, description, cooking_methods,
        weight_grams, price_b2c, is_active,
        category_id, cover_image_url, extra_images,
        codigo, presentacion, linea_id, categoria,
        costo, bolsas_caja, u_bolsa, kg_caja,
        pkg_unitario, pkg_bulto, divisiones_display, min_quantity_b2b
      `)
      .eq("id", id)
      .single(),
    supabase.from("categories").select("id, name").order("name"),
    (supabase as any).from("lineas_producto").select("id, nombre").order("orden"),
  ]);

  if (!product) notFound();

  const p = product as any;

  async function handleUpdate(formData: FormData) {
    "use server";
    await actualizarProducto(id, formData);
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/admin/productos" className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-2 inline-block">
            ← Volver a productos
          </Link>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Editar producto</h1>
          <p className="text-sm text-neutral-400 font-mono mt-0.5">{p.sku}</p>
        </div>
        <EliminarProductoButton productId={id} />
      </div>

      <ProductoForm
        categorias={(categorias ?? []) as any[]}
        lineas={(lineas ?? []) as any[]}
        defaultValues={{
          sku:               p.sku,
          name:              p.name,
          unit_label:        p.unit_label,
          short_description: p.short_description,
          description:       p.description,
          cooking_methods:   Array.isArray(p.cooking_methods) ? p.cooking_methods.join("\n") : "",
          weight_grams:      p.weight_grams,
          price_b2c:         p.price_b2c,
          is_active:         p.is_active,
          category_id:       p.category_id,
          cover_image_url:   p.cover_image_url,
          extra_images:      p.extra_images ?? [],
          // B2B v5
          codigo:             p.codigo,
          presentacion:       p.presentacion,
          linea_id:           p.linea_id,
          categoria:          p.categoria ?? "Estándar",
          costo:              p.costo,
          bolsas_caja:        p.bolsas_caja,
          u_bolsa:            p.u_bolsa,
          kg_caja:            p.kg_caja,
          pkg_unitario:       p.pkg_unitario,
          pkg_bulto:          p.pkg_bulto,
          divisiones_display: p.divisiones_display,
          min_quantity_b2b:   p.min_quantity_b2b,
        }}
        action={handleUpdate}
        submitLabel="Guardar cambios"
        cancelHref="/admin/productos"
      />
    </div>
  );
}
