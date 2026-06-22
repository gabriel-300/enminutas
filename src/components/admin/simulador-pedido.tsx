"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Producto = {
  id:           string;
  codigo:       number;
  nombre:       string;
  linea:        string;
  presentacion: string;
  bolsas_caja:  number;
  u_bolsa:      number;
  precio_caja:  number;
  precio_unidad: number;
};

type Canal = { slug: string; label: string };

type LineaCarrito = { producto: Producto; cajas: number };

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);
}

export function SimuladorPedido({
  productos,
  canales,
  canalActivo,
  ivaPct,
}: {
  productos:   Producto[];
  canales:     Canal[];
  canalActivo: string;
  ivaPct:      number;
}) {
  const router  = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito]   = useState<Record<string, number>>({});

  const canalLabel = canales.find((c) => c.slug === canalActivo)?.label ?? canalActivo;

  // Productos filtrados
  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return productos;
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.linea.toLowerCase().includes(q)   ||
        String(p.codigo).includes(q),
    );
  }, [productos, busqueda]);

  // Líneas del carrito
  const lineasCarrito: LineaCarrito[] = useMemo(
    () =>
      Object.entries(carrito)
        .filter(([, cajas]) => cajas > 0)
        .map(([id, cajas]) => ({
          producto: productos.find((p) => p.id === id)!,
          cajas,
        }))
        .filter((l) => l.producto != null),
    [carrito, productos],
  );

  // Totales
  const totalConIVA = lineasCarrito.reduce(
    (s, l) => s + l.producto.precio_caja * l.cajas, 0,
  );
  const totalSinIVA = totalConIVA / (1 + ivaPct);
  const totalIVA    = totalConIVA - totalSinIVA;
  const totalCajas  = lineasCarrito.reduce((s, l) => s + l.cajas, 0);

  function setCajas(id: string, cajas: number) {
    setCarrito((prev) => {
      if (cajas <= 0) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: cajas };
    });
  }

  function agregarUna(id: string) {
    setCarrito((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  }

  function limpiar() {
    setCarrito({});
    setBusqueda("");
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl">

      {/* Header */}
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/preventista" className="text-sm text-neutral-400 hover:text-neutral-600">
              ← Preventista
            </Link>
          </div>
          <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900">
            Simulador de pedido
          </h1>
          <p className="text-sm text-neutral-500 mt-0.5">
            Canal <span className="font-medium text-neutral-700">{canalLabel}</span>
          </p>
        </div>

        {/* Selector de canal */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
            {canales.map((c) => (
              <button
                key={c.slug}
                onClick={() => {
                  setCarrito({});
                  router.push(`/admin/preventista/simulador?canal=${c.slug}`);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  c.slug === canalActivo
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Layout: catálogo + carrito */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* ── Catálogo ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3">
          <input
            type="search"
            placeholder="Buscar producto por nombre, línea o código…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
          />

          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50 text-left">
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-400 w-14 text-right">Cód</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-400">Producto</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-400 text-right hidden sm:table-cell">Precio caja</th>
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-400 text-center w-28">Cajas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-neutral-400 text-sm">
                      Sin resultados.
                    </td>
                  </tr>
                ) : filtrados.map((p) => {
                  const cajasActuales = carrito[p.id] ?? 0;
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${cajasActuales > 0 ? "bg-tierra-50" : "hover:bg-neutral-50"}`}
                    >
                      <td className="px-4 py-2.5 text-right text-neutral-400 font-mono text-xs">{p.codigo}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-neutral-900 leading-tight">{p.nombre}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{p.linea} · {p.presentacion}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium text-neutral-700 hidden sm:table-cell">
                        {fmt(p.precio_caja)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setCajas(p.id, cajasActuales - 1)}
                            disabled={cajasActuales === 0}
                            className="w-7 h-7 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 transition-colors flex items-center justify-center font-medium text-base leading-none"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            value={cajasActuales || ""}
                            placeholder="0"
                            onChange={(e) => setCajas(p.id, Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-10 text-center text-sm font-semibold border border-neutral-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-tierra-700/20 tabular-nums"
                          />
                          <button
                            onClick={() => agregarUna(p.id)}
                            className="w-7 h-7 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition-colors flex items-center justify-center font-medium text-base leading-none"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Resumen ──────────────────────────────────── */}
        <div className="space-y-3 lg:sticky lg:top-6">

          {/* Totales */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-4">
              Resumen del pedido
            </p>

            {lineasCarrito.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">
                Agregá productos del catálogo
              </p>
            ) : (
              <>
                {/* Líneas */}
                <div className="space-y-2 mb-4">
                  {lineasCarrito.map(({ producto: p, cajas }) => (
                    <div key={p.id} className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">{p.nombre}</p>
                        <p className="text-xs text-neutral-400">{cajas} caja{cajas !== 1 ? "s" : ""} × {fmt(p.precio_caja)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold tabular-nums text-neutral-900">
                          {fmt(p.precio_caja * cajas)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desglose */}
                <div className="border-t border-neutral-100 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-neutral-500">
                    <span>Subtotal s/IVA</span>
                    <span className="tabular-nums">{fmt(totalSinIVA)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-500">
                    <span>IVA ({Math.round(ivaPct * 100)}%)</span>
                    <span className="tabular-nums">{fmt(totalIVA)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-base text-neutral-900 pt-1 border-t border-neutral-100">
                    <span>Total</span>
                    <span className="tabular-nums text-tierra-700">{fmt(totalConIVA)}</span>
                  </div>
                  <p className="text-xs text-neutral-400 text-right">
                    {totalCajas} caja{totalCajas !== 1 ? "s" : ""}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Acciones */}
          {lineasCarrito.length > 0 && (
            <button
              onClick={limpiar}
              className="w-full py-2 text-sm text-neutral-500 hover:text-neutral-700 border border-neutral-200 rounded-xl transition-colors"
            >
              Limpiar simulación
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
