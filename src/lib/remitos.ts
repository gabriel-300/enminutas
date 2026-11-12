// Vínculo remito → factura. Los remitos suelen venir sin IVA, así que se comparan contra el neto de la factura
// (o contra su total si no tiene desglose).

export type ComparacionRemitos = {
  suma:       number; // lo que suman los remitos
  base:       number; // contra qué se compara: neto de la factura, o su total
  diferencia: number; // base - suma (positivo: la factura trae más que los remitos)
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function compararRemitosConFactura(
  remitos: number[],
  factura: { neto: number | null; total: number },
): ComparacionRemitos {
  const suma = r2(remitos.reduce((s, n) => s + Number(n), 0));
  const base = r2(factura.neto != null && factura.neto > 0 ? factura.neto : factura.total);
  return { suma, base, diferencia: r2(base - suma) };
}
