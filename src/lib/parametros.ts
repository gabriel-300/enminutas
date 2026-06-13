import { createAdminClient } from "@/lib/supabase/server";

export type Parametros = {
  iva_pct:      number;
  comision_pct: number;
};

const DEFAULTS: Parametros = { iva_pct: 0.21, comision_pct: 0.15 };

export async function getParametros(): Promise<Parametros> {
  try {
    const db = createAdminClient() as any;
    const { data } = await db
      .from("parametros_globales")
      .select("clave, valor");

    if (!data || data.length === 0) return DEFAULTS;

    const map = Object.fromEntries(data.map((r: any) => [r.clave, Number(r.valor)]));
    return {
      iva_pct:      map["iva_pct"]      ?? DEFAULTS.iva_pct,
      comision_pct: map["comision_pct"] ?? DEFAULTS.comision_pct,
    };
  } catch {
    return DEFAULTS;
  }
}
