import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NuevaFacturaClient } from "./nueva-client";

export const metadata: Metadata = { title: "Nueva factura — Admin" };

export default async function NuevaFacturaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  // Clientes B2B activos con datos fiscales
  const { data: perfiles } = await db
    .from("profiles")
    .select("id, full_name, document_number")
    .eq("b2b_status", "activo")
    .order("full_name");

  const { data: b2bAccounts } = await db
    .from("b2b_accounts")
    .select("profile_id, cuit, business_name, iva_condition");

  const accountMap = new Map(
    ((b2bAccounts ?? []) as any[]).map((a: any) => [a.profile_id, a])
  );

  const clientes = ((perfiles ?? []) as any[]).map((p: any) => {
    const acc = accountMap.get(p.id) as any;
    return {
      id:             p.id,
      razon_social:   acc?.business_name || p.full_name || "",
      cuit:           acc?.cuit || p.document_number || "",
      condicion_iva:  acc?.iva_condition || "responsable_inscripto",
    };
  }).filter(c => c.razon_social);

  // Productos del catálogo para autocompletar ítems
  const { data: productos } = await db
    .from("products")
    .select("id, name, cost")
    .eq("is_active", true)
    .order("name");

  return (
    <NuevaFacturaClient
      clientes={clientes}
      productos={(productos ?? []) as any[]}
    />
  );
}
