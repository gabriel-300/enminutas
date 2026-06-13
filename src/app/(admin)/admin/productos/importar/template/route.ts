import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.app_metadata?.role !== "admin") {
    return new NextResponse("No autorizado", { status: 401 });
  }

  const { data: products } = await (createAdminClient() as any)
    .from("products")
    .select("codigo, name, costo, pkg_unitario, pkg_bulto")
    .not("codigo", "is", null)
    .order("codigo");

  // Columna "nombre" sin comillas — separador ; evita conflictos con Excel Argentina
  const rows = (products ?? []).map((p: any) => {
    const nombre = (p.name as string).replace(/;/g, " ");
    return [p.codigo, nombre, p.costo ?? 0, p.pkg_unitario ?? 0, p.pkg_bulto ?? 0].join(";");
  });

  // BOM UTF-8 (﻿) para que Excel abra con encoding correcto
  // sep=; le indica a Excel que el separador es punto y coma
  const csv = "﻿" + "sep=;\nCódigo;Producto (no modificar);Costo por bolsa;Empaque unitario;Empaque bulto\n" + rows.join("\n");

  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plantilla-precios-${fecha}.csv"`,
    },
  });
}
