import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const db = createAdminClient() as any;
  const [{ data: products }, { data: recetas }] = await Promise.all([
    db.from("products").select("id, codigo, name, costo, receta_producto_id").not("codigo", "is", null).order("codigo"),
    db.from("recipes").select("product_id"),
  ]);

  // Los que tienen receta no van: su costo se sincroniza solo desde Recetas (tarea 82).
  const conReceta = new Set(((recetas ?? []) as any[]).map((r) => r.product_id));
  const sinReceta = ((products ?? []) as any[]).filter((p) => !conReceta.has(p.id) && !p.receta_producto_id);

  // Columna "nombre" sin comillas — separador ; evita conflictos con Excel Argentina
  const rows = sinReceta.map((p: any) => {
    const nombre = (p.name as string).replace(/;/g, " ");
    return [p.codigo, nombre, p.costo ?? 0].join(";");
  });

  // BOM UTF-8 (﻿) para que Excel abra con encoding correcto
  // sep=; le indica a Excel que el separador es punto y coma
  const csv = "﻿" + "sep=;\nCódigo;Producto (no modificar);Costo por bolsa\n" + rows.join("\n");

  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plantilla-precios-${fecha}.csv"`,
    },
  });
}
