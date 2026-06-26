import { createAdminClient } from "@/lib/supabase/server";

export async function getAlertasCount(): Promise<number> {
  const db = createAdminClient() as any;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const hoyStr     = hoy.toISOString().slice(0, 10);
  const en7diasStr = new Date(hoy.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const en3diasStr = new Date(hoy.getTime() + 3 * 86400000).toISOString().slice(0, 10);
  const hace3dias  = new Date(hoy.getTime() - 3 * 86400000).toISOString();

  const results = await Promise.allSettled([
    db.from("lotes").select("id", { count: "exact", head: true }).eq("activo", true).lt("fecha_vencimiento", hoyStr),
    db.from("lotes").select("id", { count: "exact", head: true }).eq("activo", true).gt("cantidad_actual", 0).gte("fecha_vencimiento", hoyStr).lte("fecha_vencimiento", en7diasStr),
    db.from("cheques").select("id", { count: "exact", head: true }).in("estado", ["en_cartera", "depositado"]).lte("fecha_acreditacion", en3diasStr),
    db.from("pipeline_prospectos").select("id", { count: "exact", head: true }).not("estado", "in", '("ganado","perdido")').not("fecha_proximo_contacto", "is", null).lt("fecha_proximo_contacto", hoyStr),
    db.from("orders").select("id", { count: "exact", head: true }).in("status", ["despachado", "en_distribucion"]).lt("despachado_at", hace3dias),
  ]);

  let count = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.count && r.value.count > 0) count++;
  }
  return count;
}
