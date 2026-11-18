import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listAllUsers } from "@/lib/supabase/users";
import { AjustesInternosClient } from "@/components/admin/ajustes-internos-client";
import { listarAjustesInternos } from "./actions";

export const metadata: Metadata = { title: "Ajustes internos — Admin En Minutas" };
export const revalidate = 0;

export default async function AjustesInternosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const adminClient = createAdminClient() as any;

  const [users, { data: proveedoresRaw }, ajustes] = await Promise.all([
    listAllUsers(),
    adminClient.from("proveedores").select("id, nombre").eq("activo", true).order("nombre"),
    listarAjustesInternos(),
  ]);

  const b2bIds = users.filter((u) => u.app_metadata?.role === "customer_b2b").map((u) => u.id);
  const { data: perfiles } = b2bIds.length > 0
    ? await adminClient.from("profiles").select("id, full_name").in("id", b2bIds)
    : { data: [] };
  const nombrePorId: Record<string, string> = Object.fromEntries((perfiles ?? []).map((p: any) => [p.id, p.full_name]));

  const clientes = users
    .filter((u) => u.app_metadata?.role === "customer_b2b")
    .map((u) => ({ id: u.id, nombre: nombrePorId[u.id] || u.email || u.id }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const proveedores = ((proveedoresRaw ?? []) as any[]).map((p) => ({ id: p.id, nombre: p.nombre as string }));

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold font-display text-neutral-900">Ajustes internos</h1>
        <p className="text-sm text-neutral-600 mt-1">
          DRI (débito interno) y CRI (crédito interno): corrigen errores de carga en cobros o pagos sin borrar nada.
          Solo cuentan para la deuda una vez aprobados.
        </p>
      </div>

      <AjustesInternosClient clientes={clientes} proveedores={proveedores} ajustesIniciales={ajustes} />
    </div>
  );
}
