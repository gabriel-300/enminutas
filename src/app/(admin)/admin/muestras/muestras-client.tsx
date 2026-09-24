"use client";

import Link from "next/link";
import { OrderStatusBadge } from "@/components/ui/badge";

type Muestra = {
  id:                    string;
  order_number:          string;
  status:                string;
  muestra_contacto:      string | null;
  guest_email:           string | null;
  shipping_snapshot:     { street?: string | null; number?: string | null; city?: string | null } | null;
  created_at:            string;
  despachado_at:         string | null;
  muestra_destinatario:  string | null;
  muestra_observacion:   string | null;
  guest_phone:           string | null;
  notes:                 string | null;
  customer:              { full_name: string } | null;
  lines:                 { quantity: number; product_snapshot: { name: string } }[];
};

export function MuestrasClient({ muestras }: { muestras: Muestra[] }) {
  return (
    <div className="max-w-5xl">
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        {muestras.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-sm">
            No hay muestras registradas.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left">
                <th className="px-4 py-3 font-medium text-neutral-500 text-xs">N°</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-xs">Destinatario</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-xs">Productos</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-xs">Estado</th>
                <th className="px-4 py-3 font-medium text-neutral-500 text-xs">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {muestras.map((m) => {
                const productosResumen = m.lines
                  .map((l) => `${l.product_snapshot?.name ?? "?"} ×${l.quantity}`)
                  .join(", ");

                return (
                  <tr key={m.id} className="hover:bg-neutral-50 transition-colors align-top">
                    <td className="px-4 py-3 text-xs font-mono">
                      <Link href={`/admin/pedidos/${m.id}`} className="text-tierra-700 hover:underline">{m.order_number}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm text-neutral-900">
                          {m.muestra_destinatario ?? m.customer?.full_name ?? "—"}
                        </p>
                        {m.customer && (
                          <span className="text-[10px] bg-success-bg text-success px-1.5 py-0.5 rounded-full font-medium">cliente</span>
                        )}
                      </div>
                      {m.muestra_contacto && <p className="text-xs text-neutral-500">Contacto: {m.muestra_contacto}</p>}
                      {m.guest_phone && <p className="text-xs text-neutral-400">{m.guest_phone}</p>}
                      {m.guest_email && <p className="text-xs text-neutral-400">{m.guest_email}</p>}
                      {m.shipping_snapshot?.street && (
                        <p className="text-xs text-neutral-400">
                          {[m.shipping_snapshot.street, m.shipping_snapshot.number, m.shipping_snapshot.city].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {m.muestra_observacion && (
                        <p className="text-xs text-neutral-500 mt-0.5">{m.muestra_observacion}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-600 max-w-xs">
                      <span className="line-clamp-2">{productosResumen || "—"}</span>
                      {m.notes && <p className="text-neutral-400 mt-0.5 italic">{m.notes}</p>}
                    </td>
                    <td className="px-4 py-3"><OrderStatusBadge status={m.status} /></td>
                    <td className="px-4 py-3 text-xs text-neutral-400">
                      {new Date(m.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
