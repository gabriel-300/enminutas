import { factorABase, cajasPorLote } from "@/lib/receta-base";

export type RecetaResumen = {
  yieldCajas:   number | null;
  totalMinutos: number;
  pasos:        number;
  /** costo de materia prima por caja (sin el packaging marcado en los insumos) */
  costoCaja:    number;
  /** packaging por caja (insumos marcados por bolsa / por caja), va aparte en Pkg U / Pkg B */
  pkgCaja:      number;
  /** producto dueño de la receta, si este producto es una presentación */
  baseId?:      string;
};

/**
 * Resumen de receta por producto (tiempo, pasos, rendimiento y costo por caja).
 * Las presentaciones heredan la receta del producto base, prorrateando rendimiento y costo por peso.
 */
export function armarRecetaMap(
  products: { id: string; kg_caja: number | null; receta_producto_id: string | null }[],
  recipes:  any[],
  todos:    { id: string; kg_caja: number | null }[],
): Record<string, RecetaResumen> {
  const recipeMap: Record<string, RecetaResumen> = {};

  for (const r of recipes) {
    const totalMinutos = (r.steps ?? []).reduce((s: number, st: any) => s + Number(st.minutes), 0);
    let costoLote = 0, pkgLote = 0;
    for (const ing of (r.ingredients ?? []) as any[]) {
      const importe = Number(ing.cantidad) * Number(ing.insumo?.precio_unitario ?? 0);
      if (ing.insumo?.packaging_uso) pkgLote += importe; else costoLote += importe;
    }
    const costoCaja = r.yield_cajas > 0 ? costoLote / r.yield_cajas : 0;
    const pkgCaja   = r.yield_cajas > 0 ? pkgLote / r.yield_cajas : 0;
    recipeMap[r.product_id] = {
      yieldCajas: r.yield_cajas,
      totalMinutos,
      pasos: r.steps?.length ?? 0,
      costoCaja,
      pkgCaja,
    };
  }

  const kgCajaDe = (id: string) => todos.find((p) => p.id === id)?.kg_caja;

  for (const p of products) {
    const base = p.receta_producto_id ? recipeMap[p.receta_producto_id] : null;
    if (!base || recipeMap[p.id]) continue;
    const factor = factorABase(p.kg_caja, kgCajaDe(p.receta_producto_id!));
    recipeMap[p.id] = {
      yieldCajas:   cajasPorLote(base.yieldCajas, factor),
      totalMinutos: base.totalMinutos,
      pasos:        base.pasos,
      costoCaja:    factor !== null ? base.costoCaja * factor : 0,
      pkgCaja:      factor !== null ? base.pkgCaja * factor : 0,
      baseId:       p.receta_producto_id!,
    };
  }

  return recipeMap;
}
