"use client";

import { useState, useTransition, useRef } from "react";
import { guardarOrdenRuta, limpiarOrdenRuta } from "./actions";
import { GripVertical, MapPin, Phone, Check, RotateCcw, ExternalLink } from "lucide-react";

type Parada = {
  id: string;
  order_number: string;
  orden_ruta: number | null;
  cliente: string;
  telefono: string | null;
  zona: string | null;
  address: string | null;
  lineas: { qty: number; name: string }[];
};

export function OrdenarRutaClient({ paradas: init }: { paradas: Parada[] }) {
  const [paradas, setParadas]   = useState(init);
  const [pending, start]        = useTransition();
  const [guardado, setGuardado] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Drag state
  const dragIdx  = useRef<number | null>(null);
  const overIdx  = useRef<number | null>(null);

  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    overIdx.current = i;
  }
  function onDrop() {
    const from = dragIdx.current;
    const to   = overIdx.current;
    if (from === null || to === null || from === to) return;
    const arr = [...paradas];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setParadas(arr);
    setGuardado(false);
    dragIdx.current = null;
    overIdx.current = null;
  }

  function guardar() {
    setError(null);
    start(async () => {
      const items = paradas.map((p, i) => ({ id: p.id, orden: i + 1 }));
      const res = await guardarOrdenRuta(items);
      if (res.error) { setError(res.error); return; }
      setGuardado(true);
    });
  }

  function limpiar() {
    if (!confirm("¿Limpiar el orden de ruta? Los pedidos volverán al orden por defecto.")) return;
    start(async () => {
      const res = await limpiarOrdenRuta(paradas.map(p => p.id));
      if (res.error) { setError(res.error); return; }
      setParadas(p => p.map(x => ({ ...x, orden_ruta: null })));
      setGuardado(false);
    });
  }

  // Google Maps multi-parada
  function abrirMaps() {
    const addrs = paradas
      .map(p => p.address)
      .filter(Boolean)
      .map(a => encodeURIComponent(a!));
    if (addrs.length === 0) return;
    const [first, ...rest] = addrs;
    const url = `https://www.google.com/maps/dir/${first}/${rest.join("/")}`;
    window.open(url, "_blank", "noopener");
  }

  const tieneAddresses = paradas.some(p => p.address);

  if (paradas.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-neutral-200 p-10 text-center text-sm text-neutral-400">
        No hay pedidos despachados pendientes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Acciones */}
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={guardar}
            disabled={pending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors disabled:opacity-50"
          >
            <Check className="size-4" />
            {pending ? "Guardando..." : "Guardar orden"}
          </button>
          <button
            onClick={limpiar}
            disabled={pending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-neutral-500 text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" /> Limpiar
          </button>
        </div>
        <div className="flex gap-2 items-center">
          {guardado && (
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <Check className="size-3.5" /> Orden guardado
            </span>
          )}
          {tieneAddresses && (
            <button
              onClick={abrirMaps}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 transition-colors"
            >
              <ExternalLink className="size-3.5" /> Abrir en Maps
            </button>
          )}
          <a
            href="/admin/distribucion/hoja-de-ruta"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors"
          >
            Ver hoja de ruta →
          </a>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Lista draggable */}
      <div className="space-y-2">
        {paradas.map((p, i) => (
          <div
            key={p.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={e => onDragOver(e, i)}
            onDrop={onDrop}
            className="bg-white rounded-2xl border border-neutral-200 p-4 flex items-start gap-3 cursor-grab active:cursor-grabbing select-none hover:border-neutral-300 transition-colors"
          >
            {/* Número de parada */}
            <div className="flex items-center gap-2 shrink-0">
              <GripVertical className="size-4 text-neutral-300" />
              <span className="size-7 flex items-center justify-center rounded-full bg-[#16233f] text-white text-xs font-bold">
                {i + 1}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-semibold text-sm text-neutral-900">{p.cliente}</span>
                <span className="text-xs font-mono text-neutral-400">{p.order_number}</span>
                {p.zona && <span className="text-xs text-neutral-400">· {p.zona}</span>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-neutral-500 mb-1.5">
                {p.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 shrink-0" />{p.address}
                  </span>
                )}
                {p.telefono && (
                  <span className="flex items-center gap-1">
                    <Phone className="size-3 shrink-0" />{p.telefono}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs text-neutral-400">
                {p.lineas.map((l, j) => (
                  <span key={j}>{l.qty}× {l.name}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-400 text-center">
        Arrastrá las tarjetas para cambiar el orden · Hacé clic en "Guardar orden" para confirmar
      </p>
    </div>
  );
}
