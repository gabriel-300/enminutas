import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PlantillasClient } from "./plantillas-client";

export const metadata: Metadata = { title: "Mis plantillas — Portal B2B En Minutas" };
export const revalidate = 0;

export default async function PlantillasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRaw } = await (supabase as any)
    .from("profiles")
    .select("b2b_status")
    .eq("id", user.id)
    .single();

  if (!profileRaw || profileRaw.b2b_status !== "activo") redirect("/b2b/pendiente");

  const { data: plantillas } = await supabase
    .from("plantillas_pedido")
    .select(`
      id, nombre, created_at,
      plantilla_items (
        cantidad,
        products (id, name, unit_label)
      )
    `)
    .eq("cliente_id", user.id)
    .order("created_at", { ascending: false });

  const lista = ((plantillas ?? []) as any[]).map((p: any) => ({
    id:         p.id,
    nombre:     p.nombre,
    created_at: p.created_at,
    items: (p.plantilla_items ?? []).map((i: any) => ({
      productoId: i.products?.id ?? "",
      cantidad:   i.cantidad,
      nombre:     i.products?.name ?? "Producto",
      unitLabel:  i.products?.unit_label ?? null,
    })),
  }));

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-5 md:py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">
            Mis plantillas
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Pedidos frecuentes guardados para reutilizar
          </p>
        </div>
        <Link
          href="/b2b/catalogo"
          className="text-sm font-medium text-tierra-700 hover:underline"
        >
          Ir al catálogo →
        </Link>
      </div>

      <PlantillasClient plantillas={lista} />
    </div>
  );
}
