import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listarOrdenesAprobadas } from "../actions";
import { PagosPendientesClient } from "./pagos-pendientes-client";

export const metadata: Metadata = { title: "Órdenes pendientes de pago — Admin" };
export const revalidate = 0;

const ROLES_PERMITIDOS = ["admin", "caja"];

// Bandeja global de órdenes aprobadas, de todos los proveedores.
export default async function PagosPendientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = user.app_metadata?.role as string | undefined;
  if (!role || !ROLES_PERMITIDOS.includes(role)) redirect("/admin/dashboard");

  const ordenes = await listarOrdenesAprobadas();
  return <PagosPendientesClient ordenes={ordenes} />;
}
