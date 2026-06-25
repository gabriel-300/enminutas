import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DepositosClient } from "./depositos-client";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata: Metadata = { title: "Depósitos — Admin" };
export const revalidate = 0;

export default async function DepositosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const { data: depositosRaw } = await db
    .from("depositos")
    .select("id, nombre, descripcion, direccion, activo")
    .order("activo", { ascending: false })
    .order("nombre");

  // Contar lotes por depósito
  const { data: lotesCount } = await db
    .from("lotes")
    .select("deposito_id")
    .eq("activo", true);

  const countMap: Record<string, number> = {};
  for (const l of (lotesCount ?? []) as any[]) {
    if (l.deposito_id) {
      countMap[l.deposito_id] = (countMap[l.deposito_id] ?? 0) + 1;
    }
  }

  const depositos = ((depositosRaw ?? []) as any[]).map(d => ({
    ...d,
    lotes_count: countMap[d.id] ?? 0,
  }));

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/admin/configuracion"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600 mb-3"
        >
          <ChevronLeft className="size-4" /> Configuración
        </Link>
        <h1 className="text-2xl font-bold font-display text-neutral-900">Depósitos</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Ubicaciones físicas de almacenamiento. Los lotes de stock se asignan a un depósito.
        </p>
      </div>

      <DepositosClient depositos={depositos} />
    </div>
  );
}
