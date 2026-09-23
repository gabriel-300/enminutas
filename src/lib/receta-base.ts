// Presentaciones que comparten receta.
//
// Una receta pertenece a un producto "base" (recipes.product_id). Otras presentaciones
// del mismo producto (ej. caja 10 x 500g vs caja 5 x 2kg) apuntan a esa receta con
// products.receta_producto_id. La equivalencia entre presentaciones es por peso (kg_caja):
// 1 lote de la receta rinde `yield_cajas` cajas del producto base = yield_cajas * kg_caja_base kg.

type Num = number | string | null | undefined;

/** Cajas del producto base que equivalen a 1 caja de la presentación (por peso). null si falta kg_caja. */
export function factorABase(kgCajaPresentacion: Num, kgCajaBase: Num): number | null {
  const a = Number(kgCajaPresentacion);
  const b = Number(kgCajaBase);
  if (!(a > 0) || !(b > 0)) return null;
  return a / b;
}

/** Cajas de la presentación que rinde 1 lote de la receta base. null si falta kg_caja. */
export function cajasPorLote(yieldBase: Num, factor: number | null): number | null {
  const y = Number(yieldBase);
  if (factor === null || !(factor > 0) || !(y > 0)) return null;
  return y / factor;
}

/** Kg que rinde 1 lote de la receta. null si el producto base no tiene kg_caja. */
export function kgPorLote(yieldBase: Num, kgCajaBase: Num): number | null {
  const y = Number(yieldBase);
  const k = Number(kgCajaBase);
  if (!(y > 0) || !(k > 0)) return null;
  return y * k;
}

type ProductoReceta = { id: string; receta_producto_id: string | null; kg_caja: Num };

export type RecetaResuelta<R> = {
  receta: R;
  /** product_id del dueño de la receta */
  baseId: string;
  /** cajas base por cada caja de este producto (1 si es el propio base) */
  factor: number;
};

/**
 * Para cada producto con receta (propia o heredada del base) devuelve la receta y el factor
 * de conversión a cajas del base. Los productos cuyo factor no se puede calcular
 * (falta kg_caja) quedan afuera.
 * `productos` debe incluir también los productos base inactivos.
 */
export function resolverRecetas<R extends { product_id: string }>(
  productos: ProductoReceta[],
  recetas: R[],
): Record<string, RecetaResuelta<R>> {
  const recetaPorProducto: Record<string, R> = {};
  for (const r of recetas) recetaPorProducto[r.product_id] = r;
  const kgPorProducto: Record<string, Num> = {};
  for (const p of productos) kgPorProducto[p.id] = p.kg_caja;

  const out: Record<string, RecetaResuelta<R>> = {};
  for (const p of productos) {
    const baseId = p.receta_producto_id;
    if (baseId && recetaPorProducto[baseId]) {
      const factor = factorABase(p.kg_caja, kgPorProducto[baseId]);
      if (factor !== null) out[p.id] = { receta: recetaPorProducto[baseId], baseId, factor };
    } else if (recetaPorProducto[p.id]) {
      out[p.id] = { receta: recetaPorProducto[p.id], baseId: p.id, factor: 1 };
    }
  }
  return out;
}
