import type { Metadata } from "next";
import { ShippingStep } from "@/components/checkout/shipping-step";

export const metadata: Metadata = { title: "Datos de envío" };

export default function ShippingPage() {
  return <ShippingStep />;
}
