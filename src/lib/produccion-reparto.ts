// Reparto de un batch en varias presentaciones.
//
// Los insumos se descuentan una sola vez por batch. Como cada presentación queda registrada
// en su propia fila de `produccion` (y el trigger descuenta por fila según cantidad_lotes),
// los lotes de receta se reparten entre las filas en proporción a los kg de cada presentación.

/**
 * Reparte `cantLotes` entre las presentaciones en proporción a sus kg.
 * Redondea a 3 decimales (numeric(10,3)) y la última absorbe la diferencia,
 * para que la suma sea exactamente `cantLotes`.
 */
export function repartirLotes(cantLotes: number, kgPorPresentacion: number[]): number[] {
  if (kgPorPresentacion.length === 0) return [];
  if (kgPorPresentacion.length === 1) return [cantLotes];

  const totalKg = kgPorPresentacion.reduce((s, k) => s + k, 0);
  if (!(totalKg > 0)) throw new Error("Los kg asignados deben ser mayores a 0");

  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const out: number[] = [];
  let acumulado = 0;
  kgPorPresentacion.forEach((kg, i) => {
    if (i === kgPorPresentacion.length - 1) {
      out.push(r3(cantLotes - acumulado));
    } else {
      const parte = r3((cantLotes * kg) / totalKg);
      out.push(parte);
      acumulado += parte;
    }
  });
  return out;
}
