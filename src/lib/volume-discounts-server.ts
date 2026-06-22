import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { VolumeDiscount } from "./volume-discounts";

export async function getActiveVolumeDiscounts(): Promise<VolumeDiscount[]> {
  const db = createAdminClient() as any;
  const { data } = await db
    .from("volume_discounts")
    .select("min_cajas, descuento_pct, label, activo")
    .eq("activo", true)
    .order("min_cajas", { ascending: false });
  return (data ?? []) as VolumeDiscount[];
}
