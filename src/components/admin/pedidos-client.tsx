"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/ui/badge";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { aprobarPedidoB2B } from "@/app/(admin)/admin/pedidos/actions";

type Order = {
  id:             string;
  order_number:   string;
  channel:        string;
  status:         string;
  total:          number;
  payment_method: string;
  created_at:     string;
  customer_name:  string | null;
  customer_email: string | null;
  canal:          string | null;
};

const CANAL_LABEL: Record<string, string> = {
  dist:   "Distribuidor",
  gastro: "Gastronomía",
  min:    "Minorista",
};

const CANAL_COLORS: Record<string, string> = {
  dist:   "bg-blue-50 text-blue-700",
  gastro: "bg-purple-50 text-purple-700",
  min:    "bg-amber-50 text-amber-700",
};

const TABS = [
  { key: "todos",       label: "Todos" },
  { key: "pendientes",  label: "Pendientes" },
  { key: "produccion",  label: "En producción" },
  { key: "despachados", label: "Despachados" },
  { key: "entregados",  label: "Entregados" },
];

const TAB_STATUSES: Record<string, string[]> = {
  pendientes:  ["pending_payment", "payment_review"],
  produccion:  ["aprobado", "enviado_prod", "paid", "preparing", "ready"],
  despachados: ["despachado", "shipped", "in_delivery"],
  entregados:  ["delivered"],
};

const paymentLabel: Record<string, string> = {
  bank_transfer: "Transferencia",
  transferencia: "Transferencia",
  mercado_pago:  "Mercado Pago",
  cash:          "Efectivo",
};

function AprobarInlineButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => aprobarPedidoB2B(orderId))}
      disabled={isPending}
      className="px-2.5 py-1 rounded-lg bg-success text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap"
    >
      {isPending ? "…" : "Aprobar"}
    </button>
  );
}

export function PedidosClient({ orders }: { orders: Order[] }) {
  const [tab, setTab]       = useState("todos");
  const [search, setSearch] = useState("");
  const [canal, setCanal]   = useState("todos");

  const canalesDisponibles = Array.from(
    new Set(orders.map((o) => o.canal).filter(Boolean))
  ) as string[];

  const filtered = orders.filter((o) => {
    if (tab !== "todos") {
      const statuses = TAB_STATUSES[tab] ?? [];
      if (!statuses.includes(o.status)) return false;
    }
    if (canal !== "todos" && o.canal !== canal) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNum  = o.order_number.toLowerCase().includes(q);
      const matchName = (o.customer_name ?? "").toLowerCase().includes(q);
      const matchMail = (o.customer_email ?? "").toLowerCase().includes(q);
      if (!matchNum && !matchName && !matchMail) return false;
    }
    return true;
  });

  const pendingCount = orders.filter(
    (o) => o.channel === "b2b_mayorista" && o.status === "pending_payment"
  ).length;

  return (
    <div className="space-y-4">
      {/* Alerta pendientes */}
      {pendingCount > 0 && (
        <div className="px-4 py-3 bg-warning-bg border border-warning/30 rounded-xl text-sm text-warning font-medium">
          {pendingCount} pedido{pendingCount !== 1 ? "s" : ""} B2B esperando aprobación
        </div>
      )}

      {/* Tabs + buscador */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1">
          {TABS.map((t) => {
            const count = t.key === "todos"
              ? orders.length
              : orders.filter((o) => (TAB_STATUSES[t.key] ?? []).includes(o.status)).length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.key
                    ? "bg-tierra-700 text-white"
                    : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className={`ml-1.5 text-xs ${tab === t.key ? "opacity-80" : "text-neutral-400"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {canalesDisponibles.length > 0 && (
            <select
              value={canal}
              onChange={(e) => setCanal(e.target.value)}
              className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 bg-white"
            >
              <option value="todos">Todos los canales</option>
              {canalesDisponibles.map((c) => (
                <option key={c} value={c}>{CANAL_LABEL[c] ?? c}</option>
              ))}
            </select>
          )}
          <input
            type="search"
            placeholder="Buscar por cliente o nro. pedido…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 w-72"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500 w-48">Nro. pedido</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Cliente</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Estado</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-right">Total</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Fecha</th>
              <th className="px-4 py-3 font-medium text-neutral-500 w-52">Cambiar estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-neutral-400">
                  {search ? "No hay pedidos que coincidan con la búsqueda." : "No hay pedidos en esta categoría."}
                </td>
              </tr>
            )}
            {filtered.map((order) => (
              <tr key={order.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="font-mono text-xs text-tierra-700 hover:underline"
                    >
                      {order.order_number}
                    </Link>
                    {order.channel === "b2b_mayorista" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-info-bg text-info uppercase tracking-wide">
                        B2B
                      </span>
                    )}
                    {order.channel === "b2b_mayorista" && order.status === "pending_payment" && (
                      <AprobarInlineButton orderId={order.id} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-neutral-800">
                    {order.customer_name ?? order.customer_email ?? "Invitado"}
                  </span>
                  {order.canal && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${CANAL_COLORS[order.canal] ?? "bg-neutral-100 text-neutral-500"}`}>
                      {CANAL_LABEL[order.canal] ?? order.canal}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 text-right font-medium text-neutral-900 tabular-nums">
                  $ {Number(order.total).toLocaleString("es-AR")}
                </td>
                <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">
                  {new Date(order.created_at).toLocaleString("es-AR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3">
                  <OrderStatusSelect
                    orderId={order.id}
                    currentStatus={order.status}
                    channel={order.channel}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
