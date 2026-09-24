import { listAllUsers } from "@/lib/supabase/users";
import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NuevaMuestraClient, type Contacto, type ProductoMuestra } from "@/components/admin/muestras/nueva-muestra-client";

export const metadata: Metadata = { title: "Nueva muestra — Admin En Minutas" };
export const revalidate = 0;

export default async function NuevaMuestraPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = user.app_metadata?.role as string | undefined;
  if (!["admin", "vendedor"].includes(role ?? "")) redirect("/admin/dashboard");
  const esAdmin = role === "admin";

  const db = createAdminClient() as any;
  const hoy = new Date().toISOString().slice(0, 10);

  // profiles.role no es confiable (desincronizado en producción): los clientes se identifican
  // por app_metadata, igual que el resto de la app.
  const allUsers = await listAllUsers();
  const clientesAuth = (allUsers ?? []).filter((u: any) => ["customer_b2b", "customer_b2c"].includes(u.app_metadata?.role));
  const clienteIds = clientesAuth.map((u: any) => u.id as string);
  const emailPorId = new Map<string, string>(clientesAuth.map((u: any) => [u.id as string, (u.email ?? "") as string]));

  const [{ data: rawProductos }, { data: rawLotes }, { data: rawProspectos }, { data: rawClientes }, { data: rawZonas }] = await Promise.all([
    db.from("products")
      .select("id, name, sku, unit_label")
      .eq("is_active", true)
      .eq("es_muestra", true)
      .order("name"),
    db.from("lotes")
      .select("producto_id, cantidad_actual")
      .eq("activo", true)
      .gt("cantidad_actual", 0)
      .or(`fecha_vencimiento.is.null,fecha_vencimiento.gte.${hoy}`),
    db.from("pipeline_prospectos")
      .select("id, empresa, contacto_nombre, contacto_telefono, contacto_email, direccion, zona")
      .neq("estado", "perdido")
      .order("empresa"),
    clienteIds.length > 0
      ? db.from("profiles").select("id, full_name, phone").in("id", clienteIds).order("full_name")
      : Promise.resolve({ data: [] }),
    db.from("delivery_zones").select("id, name").eq("is_active", true).order("name"),
  ]);

  const stock = new Map<string, number>();
  for (const l of (rawLotes ?? []) as any[]) {
    stock.set(l.producto_id, (stock.get(l.producto_id) ?? 0) + Number(l.cantidad_actual));
  }

  const productos: ProductoMuestra[] = ((rawProductos ?? []) as any[]).map((p) => ({
    id: p.id, name: p.name, sku: p.sku, unit_label: p.unit_label, disponible: stock.get(p.id) ?? 0,
  }));

  const zonas = (rawZonas ?? []) as { id: string; name: string }[];
  const zonaIdPorNombre = new Map(zonas.map((z) => [z.name, z.id]));

  const contactos: Contacto[] = [
    ...((rawProspectos ?? []) as any[]).map((x): Contacto => ({
      key: `p:${x.id}`, tipo: "prospecto", prospectoId: x.id, customerId: null,
      nombre: x.empresa, contactoNombre: x.contacto_nombre ?? "", email: x.contacto_email ?? "",
      telefono: x.contacto_telefono ?? "", direccion: x.direccion ?? "", zonaId: zonaIdPorNombre.get(x.zona ?? "") ?? "",
    })),
    ...((rawClientes ?? []) as any[]).map((c): Contacto => ({
      key: `c:${c.id}`, tipo: "cliente", prospectoId: null, customerId: c.id,
      nombre: c.full_name, contactoNombre: "", email: emailPorId.get(c.id) ?? "",
      telefono: c.phone ?? "", direccion: "", zonaId: "",
    })),
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
          <a href="/admin/muestras" className="hover:text-neutral-600">Muestras</a>
          <span>/</span>
          <span className="text-neutral-600">{esAdmin ? "Nueva" : "Solicitar"}</span>
        </div>
        <h1 className="text-2xl font-semibold font-display text-neutral-900">
          {esAdmin ? "Nueva muestra" : "Solicitar muestra"}
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          {esAdmin
            ? "Sin precio · Queda aprobada y va a Producción · El stock baja de los lotes al despacharla"
            : "Sin precio · Queda pendiente de aprobación del admin · El stock baja de los lotes al despacharla"}
        </p>
      </div>

      <NuevaMuestraClient productos={productos} contactos={contactos} zonas={zonas} esAdmin={esAdmin} />
    </div>
  );
}
