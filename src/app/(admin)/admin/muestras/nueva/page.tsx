import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NuevaMuestraClient } from "@/components/admin/muestras/nueva-muestra-client";

export const metadata: Metadata = { title: "Nueva muestra — Admin En Minutas" };
export const revalidate = 0;

export default async function NuevaMuestraPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = user.app_metadata?.role as string | undefined;
  if (!["admin", "vendedor"].includes(role ?? "")) redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  // profiles.role no es confiable (desincronizado en producción) — "customer"
  // tampoco es un valor válido del enum, así que este filtro no devolvía
  // ningún cliente nunca. Se identifica clientes reales via app_metadata,
  // igual que el resto de la app.
  const { data: { users: allUsers } } = await db.auth.admin.listUsers({ perPage: 1000 });
  const clienteIds = (allUsers ?? [])
    .filter((u: any) => ["customer_b2b", "customer_b2c"].includes(u.app_metadata?.role))
    .map((u: any) => u.id as string);

  const [{ data: rawProductos }, { data: rawClientes }] = await Promise.all([
    db.from("products")
      .select("id, name, sku, codigo, presentacion")
      .eq("is_active", true)
      .eq("es_muestra", true)
      .order("name"),
    clienteIds.length > 0
      ? db.from("profiles").select("id, full_name, phone").in("id", clienteIds).order("full_name")
      : Promise.resolve({ data: [] }),
  ]);

  const productos = (rawProductos ?? []) as {
    id:           string;
    name:         string;
    sku:          string | null;
    codigo:       string | null;
    presentacion: string | null;
  }[];

  const clientes = (rawClientes ?? []) as {
    id:       string;
    full_name: string;
    phone:    string | null;
  }[];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
          <a href="/admin/muestras" className="hover:text-neutral-600">Muestras</a>
          <span>/</span>
          <span className="text-neutral-600">Nueva</span>
        </div>
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Nuevo pedido de muestra</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Sin precio · Reduce stock al despachar · Para cualquier contacto
        </p>
      </div>

      <NuevaMuestraClient productos={productos} clientes={clientes} />
    </div>
  );
}
