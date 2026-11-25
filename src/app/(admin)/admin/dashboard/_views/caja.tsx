import Link from "next/link";
import { ArrowRight, ClipboardList, Landmark, Wallet } from "lucide-react";
import { Card, CardHeader, KpiCard, PageHeader } from "@/components/ui";
import { fmt } from "@/lib/format";
import { fmtFechaSolo } from "@/lib/fecha";
import { loadCajaDashboard } from "../_data/caja";
import { getPosicionCaja } from "../../caja/actions";

const METODOS: Record<string, string> = {
  transferencia: "Transferencia",
  efectivo:      "Efectivo",
  cheque:        "Cheque",
  otro:          "Otro",
};

export async function CajaDashboard() {
  const [{ ordenes }, posicion] = await Promise.all([loadCajaDashboard(), getPosicionCaja()]);
  const total = ordenes.reduce((s, o) => s + o.monto, 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:px-10 md:py-8 md:pb-16">
      <PageHeader
        title="Caja"
        subtitle="Órdenes de pago ya aprobadas, pendientes de ejecutar el pago."
      />

      {/* KPIs */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        <KpiCard
          href="/admin/proveedores/pagos-pendientes"
          label="Órdenes pendientes de pago"
          value={ordenes.length}
          icon={<ClipboardList />}
          footer={`aprobada${ordenes.length !== 1 ? "s" : ""} sin registrar pago`}
        />
        <KpiCard
          href="/admin/proveedores/pagos-pendientes"
          label="Monto total a pagar"
          value={fmt(total)}
          icon={<Wallet />}
          tone={total > 0 ? "warning" : "default"}
          footer="suma de las órdenes aprobadas"
        />
        <KpiCard
          href="/admin/caja"
          label="Posición de caja"
          value={fmt(posicion.posicion)}
          icon={<Landmark />}
          tone={posicion.posicion < 0 ? "danger" : "default"}
          footer="banco + cobros − deuda − OP pendientes"
        />
      </div>

      {/* Próximas órdenes a pagar */}
      <Card>
        <CardHeader
          title="Próximas órdenes a pagar"
          action={
            <Link href="/admin/proveedores/pagos-pendientes" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline">
              Ver todo <ArrowRight className="size-3.5" />
            </Link>
          }
        />
        {ordenes.length === 0 ? (
          <p className="py-8 text-center text-sm text-n-600">Sin órdenes aprobadas pendientes de pago.</p>
        ) : (
          <ul>
            {ordenes.slice(0, 5).map(o => (
              <li key={o.id} className="flex items-center gap-3 border-b border-n-100 px-5 py-3 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-n-900 tabular-nums">{fmt(o.monto)}</span>
                    <span className="rounded-full bg-n-100 px-2 py-0.5 text-[11px] text-n-700">{METODOS[o.metodo] ?? o.metodo}</span>
                    <span className="text-xs text-n-600">{fmtFechaSolo(o.fecha)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-n-600">{o.proveedorNombre}</p>
                </div>
              </li>
            ))}
            {ordenes.length > 5 && (
              <li className="px-5 py-3 text-center text-xs text-n-600">
                +{ordenes.length - 5} más por pagar
              </li>
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}
