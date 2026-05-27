"use client";

import { useTransition } from "react";
import { aprobarCliente, rechazarCliente, cambiarEstadoCliente } from "@/app/(admin)/admin/clientes-b2b/actions";

type Cliente = {
  id: string;
  full_name: string | null;
  email: string | null;
  canal: string | null;
  b2b_status: string | null;
  created_at: string;
  zona: { name: string } | null;
};

const CANAL_LABEL: Record<string, string> = {
  dist:   "Distribuidor",
  gastro: "Gastronomía",
  min:    "Minorista",
};

const STATUS_STYLE: Record<string, string> = {
  pendiente: "bg-warning-bg text-warning",
  activo:    "bg-success-bg text-success",
  inactivo:  "bg-danger-bg text-danger",
};

function AccionesRow({ cliente }: { cliente: Cliente }) {
  const [isPending, startTransition] = useTransition();
  const status = cliente.b2b_status;

  return (
    <div className="flex items-center gap-2">
      {status === "pendiente" && (
        <>
          <button
            onClick={() => startTransition(() => aprobarCliente(cliente.id))}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-success text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            Aprobar
          </button>
          <button
            onClick={() => startTransition(() => rechazarCliente(cliente.id))}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-danger text-danger hover:bg-danger-bg disabled:opacity-50 transition-colors"
          >
            Rechazar
          </button>
        </>
      )}
      {status === "activo" && (
        <button
          onClick={() => startTransition(() => cambiarEstadoCliente(cliente.id, "inactivo"))}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
        >
          Desactivar
        </button>
      )}
      {status === "inactivo" && (
        <button
          onClick={() => startTransition(() => cambiarEstadoCliente(cliente.id, "activo"))}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
        >
          Reactivar
        </button>
      )}
    </div>
  );
}

export function ClientesBb2Client({ clientes, pendingCount }: { clientes: Cliente[]; pendingCount: number }) {
  return (
    <>
      {pendingCount > 0 && (
        <div className="mb-4 px-4 py-3 bg-warning-bg border border-warning/30 rounded-xl text-sm text-warning font-medium">
          {pendingCount} solicitud{pendingCount !== 1 ? "es" : ""} pendiente{pendingCount !== 1 ? "s" : ""} de aprobación
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500">Empresa</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Email</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Canal</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Zona</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Estado</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Fecha</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {clientes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                  No hay clientes B2B registrados todavía.
                </td>
              </tr>
            )}
            {clientes.map((c) => (
              <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3 font-medium text-neutral-900">
                  {c.full_name ?? "—"}
                </td>
                <td className="px-4 py-3 text-neutral-500 text-xs">
                  {c.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {c.canal ? CANAL_LABEL[c.canal] ?? c.canal : "—"}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {c.zona?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${STATUS_STYLE[c.b2b_status ?? ""] ?? "bg-neutral-100 text-neutral-500"}`}>
                    {c.b2b_status ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-400 text-xs">
                  {new Date(c.created_at).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <AccionesRow cliente={c} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
