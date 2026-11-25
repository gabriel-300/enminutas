import { createAdminClient } from "@/lib/supabase/server";
import { mesValido } from "@/lib/fecha";
import { getParametros } from "@/lib/parametros";

const ESTADOS_RECONOCIDOS = ["delivered", "entrega_parcial", "liquidado"];
const GRUPO_LABEL: Record<string, string> = {
  materia_prima:  "Materia prima",
  gastos_fabrica: "Gastos de fábrica",
  estructura:     "Estructura",
};

export async function loadContador(mesInput: string | undefined) {
  const now = new Date();
  const mesParam = mesValido(mesInput) ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = mesParam.split("-").map(Number);
  const desde = new Date(year, month - 1, 1).toISOString();
  const hasta = new Date(year, month, 1).toISOString();
  const desdeFecha = desde.slice(0, 10);
  const hastaFecha = hasta.slice(0, 10);

  const db = createAdminClient() as any;
  const params = await getParametros();
  const ivaDiv = 1 + params.iva_pct;

  const [{ data: compras }, { data: ventas }] = await Promise.all([
    db.from("recepciones")
      .select("grupo_gasto, categoria_gasto, neto, iva, otros_impuestos, total")
      .gte("fecha", desdeFecha).lt("fecha", hastaFecha),
    db.from("orders")
      .select("total")
      .in("status", ESTADOS_RECONOCIDOS)
      .gte("entregado_at", desde).lt("entregado_at", hasta),
  ]);

  const comprasRows = (compras ?? []) as any[];
  const comprasTotales = comprasRows.reduce((acc, r) => ({
    neto: acc.neto + Number(r.neto ?? 0),
    iva:  acc.iva + Number(r.iva ?? 0),
    otros: acc.otros + Number(r.otros_impuestos ?? 0),
    total: acc.total + Number(r.total ?? 0),
  }), { neto: 0, iva: 0, otros: 0, total: 0 });

  const porGrupo = new Map<string, { label: string; cantidad: number; total: number }>();
  for (const r of comprasRows) {
    const acc = porGrupo.get(r.grupo_gasto) ?? { label: GRUPO_LABEL[r.grupo_gasto] ?? r.grupo_gasto, cantidad: 0, total: 0 };
    acc.cantidad += 1;
    acc.total += Number(r.total ?? 0);
    porGrupo.set(r.grupo_gasto, acc);
  }

  const ventasRows  = (ventas ?? []) as any[];
  const ventasTotal = ventasRows.reduce((s, o) => s + Number(o.total ?? 0), 0);
  const ventasNeto  = Math.round((ventasTotal / ivaDiv) * 100) / 100;
  const ventasIva   = Math.round((ventasTotal - ventasNeto) * 100) / 100;

  const mesNombre = new Date(year, month - 1, 1).toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  return {
    mesParam,
    mesNombre,
    comprasCantidad: comprasRows.length,
    comprasTotales,
    porGrupo: Array.from(porGrupo.values()).sort((a, b) => b.total - a.total),
    ventasCantidad: ventasRows.length,
    ventasTotal,
    ventasNeto,
    ventasIva,
  };
}
