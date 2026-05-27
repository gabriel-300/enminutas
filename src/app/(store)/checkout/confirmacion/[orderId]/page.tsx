import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmationStep } from "@/components/checkout/confirmation-step";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Pedido confirmado" };

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <Suspense fallback={<Skeleton className="h-96 mx-auto max-w-2xl m-8" />}>
      <ConfirmationStep orderId={orderId} />
    </Suspense>
  );
}
