"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { confirmarEntrega, iniciarDistribucion } from "@/app/(admin)/admin/pedidos/actions";
import { MapPin, Phone, MessageCircle, Package, CheckCircle2, ChevronDown, ChevronUp, LogOut } from "lucide-react";

type Pedido = {
  id: string;
  order_number: string;
  status: string;
  despachado_at: string | null;
  orden_ruta: number | null;
  shipping_snapshot: { street?: string; number?: string; city?: string } | null;
  customer: { full_name: string; phone: string | null; zona: { name: string } | null } | null;
  guest_phone: string | null;
  lines: { product_id: string; quantity: number; product_snapshot: { name: string } | null }[];
};

type EntregadoHoy = {
  id: string;
  order_number: string;
  entregado_at: string | null;
  customer: { full_name: string } | null;
};

function mapsUrl(snap: Pedido["shipping_snapshot"]) {
  if (!snap) return null;
  const q = [snap.street, snap.number, snap.city].filter(Boolean).join(" ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

function waUrl(phone: string | null | undefined) {
  if (!phone) return null;
  const clean = phone.replace(/\D/g, "");
  return `https://wa.me/${clean}`;
}

function telUrl(phone: string | null | undefined) {
  if (!phone) return null;
  return `tel:${phone.replace(/\D/g, "")}`;
}

function timeStr(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

function PedidoCard({ p, idx }: { p: Pedido; idx: number }) {
  const [expanded, setExpanded]       = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [isPending, startTransition]  = useTransition();

  const phone   = p.customer?.phone ?? p.guest_phone;
  const address = p.shipping_snapshot
    ? [p.shipping_snapshot.street, p.shipping_snapshot.number, p.shipping_snapshot.city].filter(Boolean).join(", ")
    : null;

  const isEnDistrib = p.status === "en_distribucion";

  function handleEntregar() {
    startTransition(async () => {
      await confirmarEntrega(p.id);
    });
  }

  function handleIniciar() {
    startTransition(async () => {
      await iniciarDistribucion(p.id);
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-neutral-50"
      >
        <div className="size-9 rounded-full bg-[#16233f] text-white flex items-center justify-center font-bold text-sm shrink-0">
          {p.orden_ruta ?? idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-neutral-900 truncate">
            {p.customer?.full_name ?? "—"}
          </p>
          {address && (
            <p className="text-xs text-neutral-500 truncate mt-0.5">{address}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isEnDistrib && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-500 font-medium">
              Despachado
            </span>
          )}
          {isEnDistrib && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              En ruta
            </span>
          )}
          {expanded ? <ChevronUp className="size-4 text-neutral-400" /> : <ChevronDown className="size-4 text-neutral-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-neutral-100 pt-3">
          {/* Acciones rápidas */}
          <div className="flex gap-2">
            {phone && (
              <>
                <a
                  href={telUrl(phone) ?? "#"}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 active:bg-neutral-100"
                >
                  <Phone className="size-4" />
                  Llamar
                </a>
                <a
                  href={waUrl(phone) ?? "#"}
                  target="_blank"
                  rel="noopener"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-green-200 text-sm font-medium text-green-700 bg-green-50 active:bg-green-100"
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              </>
            )}
            {address && (
              <a
                href={mapsUrl(p.shipping_snapshot) ?? "#"}
                target="_blank"
                rel="noopener"
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-blue-200 text-sm font-medium text-blue-700 bg-blue-50 active:bg-blue-100"
              >
                <MapPin className="size-4" />
                Maps
              </a>
            )}
          </div>

          {/* Productos */}
          <div className="bg-neutral-50 rounded-xl px-3 py-2.5 space-y-1">
            {p.lines.map((l, i) => (
              <div key={i} className="flex items-baseline gap-2 text-sm">
                <span className="font-bold tabular-nums text-neutral-900 w-6 text-right shrink-0">{l.quantity}×</span>
                <span className="text-neutral-600">{l.product_snapshot?.name ?? "Producto"}</span>
              </div>
            ))}
          </div>

          {/* Pedido # + hora */}
          <p className="text-xs text-neutral-400">
            {p.order_number}
            {p.despachado_at && ` · Desp. ${timeStr(p.despachado_at)}`}
          </p>

          {/* Botón principal */}
          {!confirmando ? (
            <div className="flex gap-2 pt-1">
              {!isEnDistrib && (
                <button
                  onClick={handleIniciar}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-xl border border-neutral-300 text-sm font-semibold text-neutral-700 active:bg-neutral-100 disabled:opacity-50"
                >
                  {isPending ? "…" : "Iniciar ruta"}
                </button>
              )}
              <button
                onClick={() => setConfirmando(true)}
                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold active:bg-emerald-700"
              >
                Entregado ✓
              </button>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              <p className="text-sm text-center text-neutral-600 font-medium">¿Confirmar entrega completa?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmando(false)}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEntregar}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-bold active:bg-emerald-700 disabled:opacity-50"
                >
                  {isPending ? "Registrando…" : "Sí, entregar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RepartidorClient({
  pedidos,
  entregadosHoy,
  userName,
  zonaNombre,
}: {
  pedidos: Pedido[];
  entregadosHoy: EntregadoHoy[];
  userName: string;
  zonaNombre: string | null;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-[#16233f] text-white px-4 pt-safe-top">
        <div className="flex items-center gap-3 py-3">
          <div className="size-9 rounded-full bg-white/15 flex items-center justify-center font-bold text-sm shrink-0">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{userName}</p>
            <p className="text-xs text-white/60">
              {zonaNombre ? `Zona: ${zonaNombre}` : "Repartidor"}
              {pedidos.length > 0 && ` · ${pedidos.length} pendiente${pedidos.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <a
            href="/admin/distribucion"
            className="text-xs text-white/60 hover:text-white px-2 py-1 rounded-lg"
          >
            Admin
          </a>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="size-8 flex items-center justify-center rounded-lg text-white/60 active:bg-white/10"
            title="Cerrar sesión"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-3 py-4 space-y-3 pb-safe-bottom pb-6">
        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-neutral-800">Todo entregado</p>
              <p className="text-sm text-neutral-400 mt-1">No hay pedidos pendientes.</p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide px-1">
              {pedidos.length} entrega{pedidos.length !== 1 ? "s" : ""} pendiente{pedidos.length !== 1 ? "s" : ""}
            </p>
            {pedidos.map((p, i) => (
              <PedidoCard key={p.id} p={p} idx={i} />
            ))}
          </>
        )}

        {/* Entregados hoy */}
        {entregadosHoy.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide px-1 mb-2">
              Entregados hoy · {entregadosHoy.length}
            </p>
            <div className="space-y-2">
              {entregadosHoy.map(e => (
                <div key={e.id} className="flex items-center gap-3 bg-white/60 rounded-xl px-4 py-3 border border-neutral-100">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span className="font-mono text-xs text-neutral-400">{e.order_number}</span>
                  <span className="text-sm text-neutral-600 truncate">{e.customer?.full_name ?? "—"}</span>
                  {e.entregado_at && (
                    <span className="ml-auto text-xs text-neutral-400 shrink-0">{timeStr(e.entregado_at)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Link remito */}
        {pedidos.length > 0 && (
          <p className="text-center text-xs text-neutral-400 pt-4">
            Para firma digital, abrí el{" "}
            <a href="/remito" className="underline text-neutral-500">remito</a>
            {" "}del pedido específico.
          </p>
        )}
      </main>
    </div>
  );
}
