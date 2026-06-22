import type { Metadata } from "next";
import { CartStep } from "@/components/checkout/cart-step";
import { getActiveVolumeDiscounts } from "@/lib/volume-discounts-server";

export const metadata: Metadata = { title: "Tu carrito" };

export default async function CartPage() {
  const discounts = await getActiveVolumeDiscounts();
  return <CartStep discounts={discounts} />;
}
