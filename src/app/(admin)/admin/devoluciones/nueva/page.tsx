import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NuevaDevolucionClient } from "./nueva-client";

export const metadata: Metadata = { title: "Nueva devolución — Admin" };

export default async function NuevaDevolucionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const { data: perfiles } = await db
    .from("profiles")
    .select("id, full_name")
    .not("full_name", "is", null)
    .order("full_name");

  const { data: productos } = await db
    .from("products")
    .select("id, name, price_b2b")
    .eq("is_active", true)
    .order("name");

  return (
    <NuevaDevolucionClient
      clientes={(perfiles ?? []) as any[]}
      productos={(productos ?? []) as any[]}
    />
  );
}
