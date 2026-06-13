import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProductoForm } from "@/components/admin/producto-form";
import { crearProducto } from "../actions";

export const metadata: Metadata = { title: "Nuevo producto — Admin En Minutas" };

export default async function NuevoProductoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: categorias }, { data: lineas }] = await Promise.all([
    supabase.from("categories").select("id, name").order("name"),
    (supabase as any).from("lineas_producto").select("id, nombre").order("orden"),
  ]);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link href="/admin/productos" className="text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-2 inline-block">
          ← Volver a productos
        </Link>
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Nuevo producto</h1>
      </div>

      <ProductoForm
        categorias={(categorias ?? []) as any[]}
        lineas={(lineas ?? []) as any[]}
        action={crearProducto}
        submitLabel="Crear producto"
        cancelHref="/admin/productos"
      />
    </div>
  );
}
