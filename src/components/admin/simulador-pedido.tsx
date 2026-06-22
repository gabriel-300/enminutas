"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Producto = {
  id:            string;
  codigo:        number;
  nombre:        string;
  linea:         string;
  presentacion:  string;
  bolsas_caja:   number;
  u_bolsa:       number;
  precio_caja:   number;
  precio_unidad: number;
};

type Canal = { slug: string; label: string };

type LineaCarrito = { producto: Producto; cajas: number };

type Percepcion = {
  id:          string;
  descripcion: string;
  pct:         string; // string para manejar el input libre
};

function fmt(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);
}

function uid() {
  return Math.random().toString(36).slice(2);
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
  const router = useRouter();

  const [busqueda,     setBusqueda]     = useState("");
  const [carrito,      setCarrito]      = useState<Record<string, number>>({});
  const [percepciones, setPercepciones] = useState<Percepcion[]>([]);

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

  // Totales base
  const totalConIVA = lineasCarrito.reduce(
    (s, l) => s + l.producto.precio_caja * l.cajas, 0,
  );
  const totalSinIVA = totalConIVA / (1 + ivaPct);
  const totalIVA    = totalConIVA - totalSinIVA;
  const totalCajas  = lineasCarrito.reduce((s, l) => s + l.cajas, 0);

  // Percepciones — la base es el subtotal s/IVA (base imponible IIBB estándar)
  const lineasPercepcion = percepciones.map((p) => {
    const pctNum = parseFloat(p.pct.replace(",", ".")) || 0;
    const monto  = Math.round(totalSinIVA * pctNum / 100);
    return { ...p, pctNum, monto };
  });
  const totalPercepciones = lineasPercepcion.reduce((s, p) => s + p.monto, 0);
  const totalFinal        = totalConIVA + totalPercepciones;

  // Carrito
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

  // Percepciones
  function agregarPercepcion() {
    setPercepciones((prev) => [
      ...prev,
      { id: uid(), descripcion: "", pct: "" },
    ]);
  }

  function actualizarPercepcion(id: string, campo: "descripcion" | "pct", valor: string) {
    setPercepciones((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [campo]: valor } : p)),
    );
  }

  function eliminarPercepcion(id: string) {
    setPercepciones((prev) => prev.filter((p) => p.id !== id));
  }

  function limpiar() {
    setCarrito({});
    setPercepciones([]);
    setBusqueda("");
  }

  const hayCarrito = lineasCarrito.length > 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl">

      {/* Header */}
      <div className="mb-5 flex items-start justify-between flex-wrap gap-3 print:hidden">
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
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
          {canales.map((c) => (
            <button
              key={c.slug}
              onClick={() => {
                setCarrito({});
                setPercepciones([]);
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

      {/* Layout: catálogo + resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start print:block">

        {/* ── Catálogo ────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-3 print:hidden">
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
        <div className="space-y-3 lg:sticky lg:top-6 print:w-full print:max-w-lg print:mx-auto">

          {/* Panel principal */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4 print:rounded-none print:border-0 print:shadow-none">

            {/* Encabezado solo al imprimir */}
            <div className="hidden print:block mb-2">
              <p className="text-base font-bold text-neutral-900">En Minutas — Simulador de pedido</p>
              <p className="text-sm text-neutral-500">
                Canal {canalLabel} · {new Date().toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>

            <div className="flex items-center justify-between print:hidden">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                Resumen del pedido
              </p>
              {hayCarrito && (
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
                  </svg>
                  Imprimir
                </button>
              )}
            </div>

            {!hayCarrito ? (
              <p className="text-sm text-neutral-400 text-center py-2">
                Agregá productos del catálogo
              </p>
            ) : (
              <>
                {/* Líneas de productos */}
                <div className="space-y-2">
                  {lineasCarrito.map(({ producto: p, cajas }) => (
                    <div key={p.id} className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">{p.nombre}</p>
                        <p className="text-xs text-neutral-400">
                          {cajas} caja{cajas !== 1 ? "s" : ""} × {fmt(p.precio_caja)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums text-neutral-900 shrink-0">
                        {fmt(p.precio_caja * cajas)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Desglose numérico */}
                <div className="border-t border-neutral-100 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm text-neutral-500">
                    <span>Subtotal s/IVA</span>
                    <span className="tabular-nums">{fmt(totalSinIVA)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-neutral-500">
                    <span>IVA ({Math.round(ivaPct * 100)}%)</span>
                    <span className="tabular-nums">{fmt(totalIVA)}</span>
                  </div>

                  {/* Percepciones IIBB */}
                  {lineasPercepcion.map((p) => (
                    <div key={p.id} className="flex justify-between text-sm text-neutral-500">
                      <span className="truncate max-w-[140px]">
                        {p.descripcion || "Percepción IIBB"}
                        {p.pctNum > 0 && (
                          <span className="text-neutral-400 ml-1">({p.pctNum}%)</span>
                        )}
                      </span>
                      <span className="tabular-nums shrink-0 ml-2">{fmt(p.monto)}</span>
                    </div>
                  ))}

                  {/* Total final */}
                  <div className="flex justify-between font-semibold text-base text-neutral-900 pt-1.5 border-t border-neutral-100 mt-1">
                    <span>Total</span>
                    <span className="tabular-nums text-tierra-700">{fmt(totalFinal)}</span>
                  </div>
                  <p className="text-xs text-neutral-400 text-right">
                    {totalCajas} caja{totalCajas !== 1 ? "s" : ""}
                  </p>
                </div>
              </>
            )}

            {/* ── Percepciones IIBB ────────────────────── */}
            <div className="border-t border-neutral-100 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                  Percepciones IIBB
                </p>
                <button
                  onClick={agregarPercepcion}
                  className="text-xs text-tierra-700 hover:text-tierra-800 font-medium flex items-center gap-1"
                >
                  + Agregar
                </button>
              </div>

              {percepciones.length === 0 ? (
                <p className="text-xs text-neutral-400">Sin percepciones cargadas.</p>
              ) : (
                <div className="space-y-2">
                  {percepciones.map((p) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Descripción (ej. IIBB Bs.As.)"
                        value={p.descripcion}
                        onChange={(e) => actualizarPercepcion(p.id, "descripcion", e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
                      />
                      <div className="relative w-20 shrink-0">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={p.pct}
                          onChange={(e) => actualizarPercepcion(p.id, "pct", e.target.value)}
                          className="w-full px-2 py-1.5 pr-5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20 tabular-nums text-right"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-400 pointer-events-none">%</span>
                      </div>
                      <button
                        onClick={() => eliminarPercepcion(p.id)}
                        className="text-neutral-300 hover:text-red-400 transition-colors shrink-0"
                        aria-label="Eliminar"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {percepciones.length > 0 && hayCarrito && totalPercepciones > 0 && (
                <p className="text-xs text-neutral-400">
                  Base IIBB: {fmt(totalSinIVA)} (subtotal s/IVA)
                </p>
              )}
            </div>
          </div>

          {/* Limpiar */}
          {(hayCarrito || percepciones.length > 0) && (
            <button
              onClick={limpiar}
              className="w-full py-2 text-sm text-neutral-500 hover:text-neutral-700 border border-neutral-200 rounded-xl transition-colors print:hidden"
            >
              Limpiar simulación
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
