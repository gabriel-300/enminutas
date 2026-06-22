import { createAdminClient } from "@/lib/supabase/server";

export type VolumeDiscount = {
  min_cajas: number;
  descuento_pct: number;
  label: string;
  activo: boolean;
};

export async function getActiveVolumeDiscounts(): Promise<VolumeDiscount[]> {
  const db = createAdminClient() as any;
  const { data } = await db
    .from("volume_discounts")
    .select("min_cajas, descuento_pct, label, activo")
    .eq("activo", true)
    .order("min_cajas", { ascending: false });
  return (data ?? []) as VolumeDiscount[];
}

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
