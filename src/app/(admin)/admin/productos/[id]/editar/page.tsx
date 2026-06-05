import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ProductoForm } from "@/components/admin/producto-form";
import { EliminarProductoButton } from "@/components/admin/eliminar-producto-button";
import { actualizarProducto } from "../../actions";

export const metadata: Metadata = { title: "Editar producto — Admin En Minutas" };

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: product }, { data: categorias }] = await Promise.all([
    supabase
      .from("products")
      .select(`
        id, sku, name, unit_label, short_description, description, cooking_methods,
        weight_grams, price_b2c, price_b2b, is_active,
        category_id, cover_image_url, extra_images, kg_caja, bolsas_caja,
        precio_lista
      `)
      .eq("id", id)
      .single(),
    supabase.from("categories").select("id, name").order("name"),
  ]);

  if (!product) notFound();

  const p = product as any;

  async function handleUpdate(formData: FormData) {
    "use server";
    await actualizarProducto(id, formData);
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            href="/admin/productos"
            className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-2 inline-block"
          >
            ← Volver a productos
          </Link>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">
            Editar producto
          </h1>
          <p className="text-sm text-neutral-400 font-mono mt-0.5">{p.sku}</p>
        </div>
        <EliminarProductoButton productId={id} />
      </div>

      <ProductoForm
        categorias={(categorias ?? []) as any[]}
        defaultValues={{
          sku:               p.sku,
          name:              p.name,
          unit_label:        p.unit_label,
          short_description: p.short_description,
          description:       p.description,
          cooking_methods:   Array.isArray(p.cooking_methods) ? p.cooking_methods.join("\n") : "",
          weight_grams:      p.weight_grams,
          price_b2c:    p.price_b2c,
          price_b2b:    p.price_b2b,
          is_active:    p.is_active,
          category_id:      p.category_id,
          cover_image_url:  p.cover_image_url,
          extra_images:     p.extra_images ?? [],
          kg_caja:       p.kg_caja,
          bolsas_caja:   p.bolsas_caja,
          precio_lista:  p.precio_lista,
        }}
        action={handleUpdate}
        submitLabel="Guardar cambios"
        cancelHref="/admin/productos"
      />
    </div>
  );
}
