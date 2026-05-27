import type { Metadata } from "next";
import { CartStep } from "@/components/checkout/cart-step";

export const metadata: Metadata = { title: "Tu carrito" };

export default function CartPage() {
  return <CartStep />;
}
