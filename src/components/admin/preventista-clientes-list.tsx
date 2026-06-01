"use client";

import { useState } from "react";
import Link from "next/link";
import { ClienteContactoPanel } from "./cliente-contacto";

const CANAL_LABEL: Record<string, string> = {
  b2b_mayorista: "Mayorista", dist: "Distribuidor",
  gastro: "Gastronomía",     min:  "Minorista",
};

type ContactLog = { tipo: string; notas: string | null; created_at: string };

type Cliente = {
  id: string;
  full_name: string | null;
  canal: string | null;
  phone: string | null;
  zona: { name: string } | null;
  lastOrder: { id: string; order_number: string; total: number; created_at: string } | null;
  dias: number | null;
  historialContactos: ContactLog[];
  notasInternas: string | null;
};

function BadgeDias({ dias }: { dias: number | null }) {
  if (dias === null) return <span className="text-xs text-neutral-300">Sin pedidos</span>;
  if (dias > 30) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-danger-bg text-danger">{dias}d sin comprar</span>;
  if (dias > 15) return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-warning-bg text-warning">{dias}d sin comprar</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-success-bg text-success">{dias}d</span>;
}

export function PreventistaClientesList({
  clientes,
  esVendedor,
}: {
  clientes: Cliente[];
  esVendedor: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = busqueda.trim()
    ? clientes.filter((c) => {
        const q = busqueda.toLowerCase();
        return (
          c.full_name?.toLowerCase().includes(q) ||
          (CANAL_LABEL[c.canal ?? ""] ?? c.canal ?? "").toLowerCase().includes(q) ||
          c.zona?.name?.toLowerCase().includes(q)
        );
      })
    : clientes;

  const total       = filtrados.length;
  const inactivos30 = filtrados.filter((c) => c.dias === null || c.dias > 30).length;
  const inactivos15 = filtrados.filter((c) => c.dias !== null && c.dias > 15 && c.dias <= 30).length;
  const activos     = filtrados.filter((c) => c.dias !== null && c.dias <= 15).length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center">
          <p className="text-2xl font-semibold font-display text-neutral-900">{total}</p>
          <p className="text-xs text-neutral-400 mt-1">Total clientes</p>
        </div>
        <div className="bg-danger-bg rounded-2xl border border-danger/20 p-4 text-center">
          <p className="text-2xl font-semibold font-display text-danger">{inactivos30}</p>
          <p className="text-xs text-danger/70 mt-1">+30 días inactivos</p>
        </div>
        <div className="bg-warning-bg rounded-2xl border border-warning/20 p-4 text-center">
          <p className="text-2xl font-semibold font-display text-warning">{inactivos15}</p>
          <p className="text-xs text-warning/70 mt-1">15–30 días</p>
        </div>
        <div className="bg-success-bg rounded-2xl border border-success/20 p-4 text-center">
          <p className="text-2xl font-semibold font-display text-success">{activos}</p>
          <p className="text-xs text-success/70 mt-1">Activos &lt;15 días</p>
        </div>
      </div>

      {/* Búsqueda */}
      {clientes.length > 0 && (
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, canal o zona…"
          className="w-full max-w-xs px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
        />
      )}

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">
            {busqueda
              ? "Sin resultados para esa búsqueda."
              : esVendedor
              ? "No tenés clientes asignados todavía."
              : "No hay clientes B2B activos."}
          </p>
          {esVendedor && !busqueda && (
            <p className="text-xs text-neutral-300 mt-1">
              Un administrador debe asignarte clientes en la sección Clientes B2B.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Cliente</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400">Actividad</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Último pedido</th>
                <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filtrados.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-neutral-900">{c.full_name ?? "—"}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-neutral-400">{CANAL_LABEL[c.canal ?? ""] ?? c.canal}</span>
                      {c.zona && <span className="text-xs text-neutral-300">· {c.zona.name}</span>}
                      {c.phone && (
                        <a
                          href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener"
                          className="text-xs !text-green-600 hover:underline"
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <BadgeDias dias={c.dias} />
                    <div className="mt-1.5">
                      <ClienteContactoPanel
                        clienteId={c.id}
                        notasIniciales={c.notasInternas}
                        historialContactos={c.historialContactos}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {c.lastOrder ? (
                      <div>
                        <Link
                          href={`/admin/pedidos/${c.lastOrder.id}`}
                          className="text-xs font-mono !text-neutral-500 hover:!text-tierra-700"
                        >
                          {c.lastOrder.order_number}
                        </Link>
                        <p className="text-xs font-semibold text-neutral-800 mt-0.5">
                          {new Intl.NumberFormat("es-AR", {
                            style: "currency",
                            currency: "ARS",
                            maximumFractionDigits: 0,
                          }).format(c.lastOrder.total)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {c.lastOrder && (
                        <Link
                          href={`/admin/pedidos/nuevo?cliente=${c.id}&repetir=${c.lastOrder.id}`}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 !text-neutral-600 hover:bg-neutral-50 transition-colors"
                        >
                          Repetir
                        </Link>
                      )}
                      <Link
                        href={`/admin/pedidos/nuevo?cliente=${c.id}`}
                        className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 !text-white hover:bg-tierra-800 transition-colors"
                      >
                        + Pedido
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
