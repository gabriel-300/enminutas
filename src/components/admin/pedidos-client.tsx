"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button, PedidoStatusBadge, StatusBadge, Tabs } from "@/components/ui";
import { OrderStatusSelect } from "@/components/admin/order-status-select";
import { aprobarPedidoB2B } from "@/app/(admin)/admin/pedidos/actions";
import { esCanalFlujo } from "@/lib/order-channels";

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
  vendedor_name:  string | null;
  /** Este pedido lleva el faltante de otro pedido con entrega parcial */
  faltante_de:    { id: string; order_number: string } | null;
  /** El faltante de este pedido se reprogramó en otro pedido */
  faltante_en:    { id: string; order_number: string } | null;
};

function FaltanteTag({ order }: { order: Order }) {
  if (!order.faltante_de && !order.faltante_en) return null;
  return (
    <p className="text-xs text-neutral-600 mt-1">
      {order.faltante_en && (
        <>Faltante en <Link href={`/admin/pedidos/${order.faltante_en.id}`} className="font-mono text-tierra-700 hover:underline">{order.faltante_en.order_number}</Link></>
      )}
      {order.faltante_de && (
        <>Faltante de <Link href={`/admin/pedidos/${order.faltante_de.id}`} className="font-mono text-tierra-700 hover:underline">{order.faltante_de.order_number}</Link></>
      )}
    </p>
  );
}

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
    <Button
      size="sm"
      onClick={() => startTransition(() => aprobarPedidoB2B(orderId))}
      disabled={isPending}
      className="h-7 whitespace-nowrap"
    >
      {isPending ? "…" : "Aprobar"}
    </Button>
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
    (o) => esCanalFlujo(o.channel) && o.status === "pending_payment"
  ).length;

  return (
    <div className="space-y-4">
      {/* Alerta pendientes */}
      {pendingCount > 0 && (
        <div className="px-4 py-3 bg-warning-bg border border-warning-border rounded-lg text-sm text-warning font-medium">
          {pendingCount} pedido{pendingCount !== 1 ? "s" : ""} esperando aprobación
        </div>
      )}

      {/* Tabs */}
      <Tabs
        active={tab}
        onSelect={setTab}
        items={TABS.map((t) => {
          const count = t.key === "todos"
            ? orders.length
            : orders.filter((o) => (TAB_STATUSES[t.key] ?? []).includes(o.status)).length;
          return { key: t.key, label: t.label, count: count > 0 ? count : undefined };
        })}
      />

      {/* Buscador */}
      <div className="relative max-w-[420px]">
        <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-n-500" />
        <input
          type="search"
          placeholder="Buscar por cliente o nro. pedido…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-neutral-400 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700"
        />
      </div>

      {/* ── Mobile: cards ──────────────────────────────────────────── */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-200 shadow-sm px-4 py-10 text-center text-sm text-neutral-600">
            {search ? "Sin resultados." : "No hay pedidos en esta categoría."}
          </div>
        ) : filtered.map((order) => (
          <div key={order.id} className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/admin/pedidos/${order.id}`}
                  className="font-mono text-[13px] font-semibold text-brand-700 hover:underline"
                >
                  {order.order_number}
                </Link>
                {order.channel === "b2b_mayorista" && (
                  <StatusBadge tone="info">B2B</StatusBadge>
                )}
                {order.channel === "muestra" && (
                  <StatusBadge tone="warning">Muestra</StatusBadge>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold text-sm text-neutral-900 tabular-nums">
                  {fmtMonto(order.total)}
                </div>
                <div className="text-xs text-neutral-600 tabular-nums mt-0.5">
                  Neto {fmtMonto(desgloseIVA(order.total).neto)} · IVA {fmtMonto(desgloseIVA(order.total).iva)}
                </div>
              </div>
            </div>

            <p className="text-sm text-neutral-700">
              {order.customer_name ?? order.customer_email ?? "Invitado"}
            </p>
            {order.vendedor_name && (
              <p className="text-xs text-neutral-600 mb-1">Vendedor: {order.vendedor_name}</p>
            )}

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <PedidoStatusBadge status={order.status} />
              <span className="text-xs text-neutral-600">{fmtDate(order.created_at)}</span>
              <FaltanteTag order={order} />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {esAdmin && esCanalFlujo(order.channel) && order.status === "pending_payment" && (
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
      <div className="hidden md:block bg-white rounded-xl border border-neutral-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[1020px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left">
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600 w-48">Nro. pedido</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600">Cliente</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600">Vendedor</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600">Estado</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600 text-right">Subtotal</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600 text-right">IVA (21%)</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600 text-right">Total</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600">Fecha</th>
              <th className="text-xs px-4 py-3 font-semibold text-neutral-600 w-52">Cambiar estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center text-neutral-600">
                  {search ? "No hay pedidos que coincidan con la búsqueda." : "No hay pedidos en esta categoría."}
                </td>
              </tr>
            )}
            {filtered.map((order) => (
              <tr key={order.id} className="hover:bg-brand-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="font-mono text-[13px] font-medium text-brand-700 hover:underline"
                    >
                      {order.order_number}
                    </Link>
                    {order.channel === "b2b_mayorista" && (
                      <StatusBadge tone="info">B2B</StatusBadge>
                    )}
                    {order.channel === "muestra" && (
                      <StatusBadge tone="warning">Muestra</StatusBadge>
                    )}
                    {esAdmin && esCanalFlujo(order.channel) && order.status === "pending_payment" && (
                      <AprobarInlineButton orderId={order.id} />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-neutral-800">
                    {order.customer_name ?? order.customer_email ?? "Invitado"}
                  </span>
                </td>
                <td className="px-4 py-3 text-neutral-600 text-xs">
                  {order.vendedor_name ?? <span className="text-neutral-500">—</span>}
                </td>
                <td className="px-4 py-3">
                  <PedidoStatusBadge status={order.status} />
                  <FaltanteTag order={order} />
                </td>
                <td className="px-4 py-3 text-right text-neutral-600 tabular-nums">
                  {fmtMonto(desgloseIVA(order.total).neto)}
                </td>
                <td className="px-4 py-3 text-right text-neutral-600 tabular-nums">
                  {fmtMonto(desgloseIVA(order.total).iva)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-neutral-900 tabular-nums">
                  {fmtMonto(order.total)}
                </td>
                <td className="px-4 py-3 text-neutral-600 text-xs whitespace-nowrap">
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
