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

const TABS = [
  { key: "todos",       label: "Todos" },
  { key: "pendientes",  label: "Pendientes" },
  { key: "produccion",  label: "Producción" },
  { key: "despachados", label: "Despachados" },
  { key: "entregados",  label: "Entregados" },
  { key: "liquidados",  label: "Liquidados" },
];

const TAB_STATUSES: Record<string, string[]> = {
  pendientes:  ["pending_payment", "payment_review"],
  produccion:  ["aprobado", "enviado_prod", "paid", "preparing", "ready"],
  despachados: ["despachado", "shipped", "in_delivery"],
  entregados:  ["delivered", "entrega_parcial"],
  liquidados:  ["liquidado"],
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

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtMonto(n: number) {
  return `$ ${Math.round(n).toLocaleString("es-AR")}`;
}

function desgloseIVA(total: number) {
  const neto = total / 1.21;
  const iva  = total - neto;
  return { neto, iva };
}

export function PedidosClient({ orders, esAdmin = false }: { orders: Order[]; esAdmin?: boolean }) {
  const [tab, setTab]       = useState("todos");
  const [search, setSearch] = useState("");

  const filtered = orders.filter((o) => {
    if (tab !== "todos") {
      const statuses = TAB_STATUSES[tab] ?? [];
      if (!statuses.includes(o.status)) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      if (
        !o.order_number.toLowerCase().includes(q) &&
        !(o.customer_name ?? "").toLowerCase().includes(q) &&
        !(o.customer_email ?? "").toLowerCase().includes(q)
      ) return false;
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

      {/* Tabs — scroll horizontal en mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 bg-white border border-neutral-200 rounded-xl p-1 w-max md:w-auto">
          {TABS.map((t) => {
            const count = t.key === "todos"
              ? orders.length
              : orders.filter((o) => (TAB_STATUSES[t.key] ?? []).includes(o.status)).length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
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
      </div>

      {/* Buscador */}
      <input
        type="search"
        placeholder="Buscar por cliente o nro. pedido…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full md:w-72 px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
      />

      {/* ── Mobile: cards ──────────────────────────────────────────── */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 px-4 py-10 text-center text-sm text-neutral-400">
            {search ? "Sin resultados." : "No hay pedidos en esta categoría."}
          </div>
        ) : filtered.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl border border-neutral-200 p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/admin/pedidos/${order.id}`}
                  className="font-mono text-sm font-semibold text-tierra-700 hover:underline"
                >
                  {order.order_number}
                </Link>
                {order.channel === "b2b_mayorista" && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-info-bg text-info uppercase tracking-wide">
                    B2B
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold text-sm text-neutral-900 tabular-nums">
                  {fmtMonto(order.total)}
                </div>
                <div className="text-[11px] text-neutral-400 tabular-nums mt-0.5">
                  Neto {fmtMonto(desgloseIVA(order.total).neto)} · IVA {fmtMonto(desgloseIVA(order.total).iva)}
                </div>
              </div>
            </div>

            <p className="text-sm text-neutral-700 mb-1">
              {order.customer_name ?? order.customer_email ?? "Invitado"}
            </p>

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <OrderStatusBadge status={order.status} />
              <span className="text-xs text-neutral-400">{fmtDate(order.created_at)}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {esAdmin && order.channel === "b2b_mayorista" && order.status === "pending_payment" && (
                <AprobarInlineButton orderId={order.id} />
              )}
              {esAdmin && (
                <div className="flex-1 min-w-0">
                  <OrderStatusSelect
                    orderId={order.id}
                    currentStatus={order.status}
                    channel={order.channel}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop: tabla ─────────────────────────────────────────── */}
      <div className="hidden md:block bg-white rounded-2xl border border-neutral-200 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th className="px-4 py-3 font-medium text-neutral-500 w-48">Nro. pedido</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Cliente</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Estado</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-right">Subtotal</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-right">IVA (21%)</th>
              <th className="px-4 py-3 font-medium text-neutral-500 text-right">Total</th>
              <th className="px-4 py-3 font-medium text-neutral-500">Fecha</th>
              <th className="px-4 py-3 font-medium text-neutral-500 w-52">Cambiar estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-neutral-400">
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
                    {esAdmin && order.channel === "b2b_mayorista" && order.status === "pending_payment" && (
                      <AprobarInlineButton orderId={order.id} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-neutral-800">
                    {order.customer_name ?? order.customer_email ?? "Invitado"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={order.status} />
                </td>
                <td className="px-4 py-3 text-right text-neutral-500 tabular-nums">
                  {fmtMonto(desgloseIVA(order.total).neto)}
                </td>
                <td className="px-4 py-3 text-right text-neutral-500 tabular-nums">
                  {fmtMonto(desgloseIVA(order.total).iva)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-neutral-900 tabular-nums">
                  {fmtMonto(order.total)}
                </td>
                <td className="px-4 py-3 text-neutral-500 text-xs whitespace-nowrap">
                  {fmtDate(order.created_at)}
                </td>
                <td className="px-4 py-3">
                  {esAdmin && (
                    <OrderStatusSelect
                      orderId={order.id}
                      currentStatus={order.status}
                      channel={order.channel}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
