import { redirect } from "next/navigation";

// El detalle por cliente vive en la ficha (cobros, historial y recibos); el libro de
// cc_movimientos ya no se usa para calcular la deuda.
export default async function CcDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/clientes-b2b/${id}`);
}
