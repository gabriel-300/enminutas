// Utilidades puras — sin imports de server, seguro en client components

export type VolumeDiscount = {
  min_cajas: number;
  descuento_pct: number;
  label: string;
  activo: boolean;
};

export function calcVolumeDiscount(
  discounts: VolumeDiscount[],
  totalUnits: number,
  subtotal: number,
): { pct: number; amount: number; label: string } | null {
  const tier = discounts.find((d) => totalUnits >= d.min_cajas);
  if (!tier) return null;
  const pct    = Number(tier.descuento_pct);
  const amount = Math.round(subtotal * pct / 100 * 100) / 100;
  return { pct, amount, label: tier.label };
}
