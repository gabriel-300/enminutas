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

  const [{ data: lineasRaw }, { data: conteos }, { data: disp }, { data: canales }] = await Promise.all([
    db.from("lineas_producto").select("id, nombre, orden, canal_exclusivo_id").order("orden"),
    db.from("products").select("linea_id, es_muestra, costo, bolsas_caja, u_bolsa, categoria").eq("is_active", true),
    db.from("disponibilidad_lineas").select("linea_id").eq("disponible", true),
    db.from("canales").select("id, nombre"),
  ]);

  const conteosMap: Record<number, number> = {};
  // Un producto activo no aparece en el catálogo B2B si le falta costo, bolsas por caja, unidades por bolsa o categoría.
  const sinDatosMap: Record<number, number> = {};
  for (const p of (conteos ?? []) as any[]) {
    if (p.linea_id == null) continue;
    conteosMap[p.linea_id] = (conteosMap[p.linea_id] ?? 0) + 1;
    const completo = p.costo && p.bolsas_caja && p.u_bolsa && p.categoria;
    if (!p.es_muestra && !completo) sinDatosMap[p.linea_id] = (sinDatosMap[p.linea_id] ?? 0) + 1;
  }
  const visibles = new Set(((disp ?? []) as { linea_id: number }[]).map(d => d.linea_id));
  const nombreCanal = new Map(((canales ?? []) as any[]).map(c => [c.id, c.nombre as string]));

  const lineas = (lineasRaw ?? []).map((l: any) => ({
    id: l.id, nombre: l.nombre, orden: l.orden,
    total: conteosMap[l.id] ?? 0,
    visible: visibles.has(l.id),
    canalExclusivo: l.canal_exclusivo_id ? (nombreCanal.get(l.canal_exclusivo_id) ?? "otro") : null,
    sinDatos: sinDatosMap[l.id] ?? 0,
  }));

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16 max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/configuracion" className="p-1.5 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold font-display text-neutral-900">Líneas de producto</h1>
          <p className="text-sm text-neutral-600 mt-0.5">Agrupaciones del catálogo. El interruptor define si la línea se ve en el catálogo B2B de los clientes.</p>
        </div>
      </div>

      <LineasClient lineas={lineas} />
    </div>
  );
}
