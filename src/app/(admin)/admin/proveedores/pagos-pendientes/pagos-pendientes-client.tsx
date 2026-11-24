"use client";

import Link from "next/link";
import { fmt } from "@/lib/format";
import { fmtFechaSolo } from "@/lib/fecha";
import { useState, useTransition } from "react";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { pagarOrdenPago, type OrdenAprobadaGlobal } from "../actions";

const METODOS: Record<string, string> = {
  transferencia: "Transferencia",
  efectivo:      "Efectivo",
  cheque:        "Cheque",
  otro:          "Otro",
};

export function PagosPendientesClient({ ordenes }: { ordenes: OrdenAprobadaGlobal[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pagar(o: OrdenAprobadaGlobal) {
    if (!confirm(`¿Registrar el pago de ${fmt(o.monto)} a ${o.proveedorNombre}? Desde este momento baja la deuda con el proveedor.`)) return;
    setError(null);
    start(async () => {
      const res = await pagarOrdenPago(o.id, o.proveedorId);
      if ("error" in res) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:px-10 md:py-8 md:pb-16">
      <PageHeader
        title="Órdenes pendientes de pago"
        subtitle="Órdenes ya aprobadas de todos los proveedores, listas para registrar el pago."
      />

      <Card>
        <CardHeader title="Órdenes aprobadas" />
        {error && <p className="px-5 py-2 text-sm text-danger">{error}</p>}
        {ordenes.length === 0 ? (
          <p className="py-8 text-center text-sm text-n-600">No hay órdenes aprobadas pendientes de pago.</p>
        ) : (
          <ul>
            {ordenes.map(o => (
              <li key={o.id} className="flex items-center gap-3 border-b border-n-100 px-5 py-3 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-n-900 tabular-nums">{fmt(o.monto)}</span>
                    <span className="rounded-full bg-n-100 px-2 py-0.5 text-[11px] text-n-700">{METODOS[o.metodo] ?? o.metodo}</span>
                    <span className="text-xs text-n-600">{fmtFechaSolo(o.fecha)}</span>
                    {o.referencia && <span className="font-mono text-xs text-n-600">{o.referencia}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-n-600">
                    <Link href={`/admin/proveedores/${o.proveedorId}`} className="font-medium text-brand-700 hover:underline">
                      {o.proveedorNombre}
                    </Link>
                    {o.notas && ` — ${o.notas}`}
                  </p>
                </div>
                <button type="button" disabled={pending} onClick={() => pagar(o)}
                  className="shrink-0 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">
                  Registrar pago
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
