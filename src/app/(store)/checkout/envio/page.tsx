import type { Metadata } from "next";
import { ShippingStep } from "@/components/checkout/shipping-step";
import { getActiveVolumeDiscounts } from "@/lib/volume-discounts";

export const metadata: Metadata = { title: "Datos de envío" };

export default async function ShippingPage() {
  const discounts = await getActiveVolumeDiscounts();
  return <ShippingStep discounts={discounts} />;
}
