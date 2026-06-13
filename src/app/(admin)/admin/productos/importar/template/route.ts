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

  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;

  const rows = (products ?? []).map((p: any) =>
    [p.codigo, escape(p.name), p.costo ?? 0, p.pkg_unitario ?? 0, p.pkg_bulto ?? 0].join(",")
  );

  const csv = ["codigo,nombre,costo,pkg_unitario,pkg_bulto", ...rows].join("\n");
  const fecha = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="plantilla-precios-${fecha}.csv"`,
    },
  });
}
