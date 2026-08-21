import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { LineasClient } from "./lineas-client";

export const metadata: Metadata = { title: "Líneas de producto — Admin" };
export const revalidate = 0;

export default async function LineasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const { data: lineasRaw } = await db
    .from("lineas_producto")
    .select("id, nombre, orden")
    .order("orden");

  const { data: conteos } = await db
    .from("products")
    .select("linea_id")
    .eq("is_active", true);

  const conteosMap: Record<number, number> = {};
  for (const p of (conteos ?? []) as { linea_id: number | null }[]) {
    if (p.linea_id != null)
      conteosMap[p.linea_id] = (conteosMap[p.linea_id] ?? 0) + 1;
  }

  const lineas = (lineasRaw ?? []).map((l: any) => ({
    ...l,
    total: conteosMap[l.id] ?? 0,
  }));

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/configuracion" className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold font-display text-neutral-900">Líneas de producto</h1>
          <p className="text-sm text-neutral-400 mt-0.5">Agrupaciones para organizar el catálogo</p>
        </div>
      </div>

      <LineasClient lineas={lineas} />
    </div>
  );
}
