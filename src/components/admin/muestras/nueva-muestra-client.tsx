"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearPedidoMuestra } from "@/app/(admin)/admin/muestras/nueva/actions";

export type ProductoMuestra = {
  id:         string;
  name:       string;
  sku:        string | null;
  unit_label: string | null;
  /** Stock en lotes vigentes */
  disponible: number;
};

export type Contacto = {
  key:            string;
  tipo:           "prospecto" | "cliente";
  prospectoId:    string | null;
  customerId:     string | null;
  nombre:         string;
  contactoNombre: string;
  email:          string;
  telefono:       string;
  direccion:      string;
  zonaId:         string;
};

const inputCls = "w-full px-3 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-tierra-700/20 disabled:opacity-50";
const textareaCls = `${inputCls} resize-none`;
const labelCls = "block text-xs font-medium text-neutral-500 mb-1";

export function NuevaMuestraClient({
  productos,
  contactos,
  zonas,
  esAdmin,
}: {
  productos: ProductoMuestra[];
  contactos: Contacto[];
  zonas:     { id: string; name: string }[];
  esAdmin:   boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Contacto elegido de la lista (prospecto o cliente) o null si es uno nuevo
  const [elegido,      setElegido]      = useState<Contacto | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [nombre,         setNombre]         = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [email,          setEmail]          = useState("");
  const [telefono,       setTelefono]       = useState("");
  const [direccion,      setDireccion]      = useState("");
  const [zonaId,         setZonaId]         = useState("");
  const [guardarProspecto, setGuardarProspecto] = useState(true);

  const [observacion, setObservacion] = useState("");
  const [notes,       setNotes]       = useState("");

  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const q = nombre.trim().toLowerCase();
  const sugeridos = q.length >= 2 && !elegido
    ? contactos.filter((c) => c.nombre.toLowerCase().includes(q) || c.contactoNombre.toLowerCase().includes(q)).slice(0, 8)
    : [];

  function elegir(c: Contacto) {
    setElegido(c);
    setNombre(c.nombre);
    setContactoNombre(c.contactoNombre);
    setEmail(c.email);
    setTelefono(c.telefono);
    setDireccion(c.direccion);
    setZonaId(c.zonaId);
    setShowDropdown(false);
  }

  function limpiarElegido() {
    setElegido(null);
  }

  function setQty(id: string, qty: number) {
    setQuantities((prev) => {
      if (qty <= 0) { const next = { ...prev }; delete next[id]; return next; }
      return { ...prev, [id]: qty };
    });
  }

  const seleccionados = productos.filter((p) => (quantities[p.id] ?? 0) > 0);
  const totalItems    = seleccionados.reduce((s, p) => s + (quantities[p.id] ?? 0), 0);
  const sinStock      = seleccionados.filter((p) => (quantities[p.id] ?? 0) > p.disponible);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nombre.trim())    { setError("Ingresá el nombre del posible cliente"); return; }
    if (!direccion.trim()) { setError("Ingresá la dirección donde enviar la muestra"); return; }
    if (seleccionados.length === 0) { setError("Seleccioná al menos un producto"); return; }

    startTransition(async () => {
      const result = await crearPedidoMuestra({
        nombre, contactoNombre, email, telefono, direccion,
        zonaId:      zonaId || undefined,
        prospectoId: elegido?.prospectoId ?? undefined,
        customerId:  elegido?.customerId ?? undefined,
        guardarProspecto,
        observacion,
        notes,
        items: seleccionados.map((p) => ({ productId: p.id, quantity: quantities[p.id]! })),
      });

      if ("error" in result) {
        setError(result.error);
      } else {
        router.push(`/admin/pedidos/${result.orderId}`);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

      {/* ── Posible cliente ── */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-800">A quién se le envía</h2>

        <div>
          <label className={labelCls}>Nombre / Empresa *</label>
          <div className="relative">
            <input
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); limpiarElegido(); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Buscá un prospecto o cliente, o escribí uno nuevo…"
              className={inputCls}
              disabled={isPending}
              autoComplete="off"
            />
            {elegido && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-success font-medium">
                ✓ {elegido.tipo === "prospecto" ? "prospecto del Pipeline" : "cliente registrado"}
              </span>
            )}
            {showDropdown && sugeridos.length > 0 && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                {sugeridos.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onMouseDown={() => elegir(c)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-neutral-50 transition-colors"
                  >
                    <span className="text-sm text-neutral-800 font-medium truncate">
                      {c.nombre}
                      {c.contactoNombre && <span className="font-normal text-neutral-400"> · {c.contactoNombre}</span>}
                    </span>
                    <span className="text-[10px] text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-full shrink-0">
                      {c.tipo === "prospecto" ? "prospecto" : "cliente"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Nombre del contacto</label>
            <input value={contactoNombre} onChange={(e) => setContactoNombre(e.target.value)} placeholder="Con quién hablar" className={inputCls} disabled={isPending} />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+54 9 376…" className={inputCls} disabled={isPending} />
          </div>
          <div>
            <label className={labelCls}>Correo</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contacto@empresa.com" className={inputCls} disabled={isPending} />
          </div>
          <div>
            <label className={labelCls}>Zona de entrega</label>
            <select value={zonaId} onChange={(e) => setZonaId(e.target.value)} className={inputCls} disabled={isPending}>
              <option value="">Sin zona</option>
              {zonas.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Dirección donde enviar la muestra *</label>
          <input value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número, localidad" className={inputCls} disabled={isPending} />
        </div>

        {!elegido && (
          <label className="flex items-start gap-2 text-sm text-neutral-600 cursor-pointer">
            <input
              type="checkbox"
              checked={guardarProspecto}
              onChange={(e) => setGuardarProspecto(e.target.checked)}
              className="mt-0.5"
              disabled={isPending}
            />
            <span>
              Guardar como prospecto en el Pipeline
              <span className="block text-xs text-neutral-400">Para hacerle seguimiento y ver si la muestra termina en un cliente.</span>
            </span>
          </label>
        )}

        <div>
          <label className={labelCls}>Motivo</label>
          <textarea
            value={observacion}
            onChange={(e) => setObservacion(e.target.value)}
            placeholder="Degustación, visita comercial, presentación de producto…"
            rows={2}
            className={textareaCls}
            disabled={isPending}
          />
        </div>

        <div>
          <label className={labelCls}>Nota interna</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Solo visible para el equipo…"
            rows={2}
            className={textareaCls}
            disabled={isPending}
          />
        </div>
      </div>

      {/* ── Productos de muestra ── */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-800">Muestras a enviar</h2>
          {totalItems > 0 && (
            <span className="text-xs text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full">
              {totalItems} unidad{totalItems !== 1 ? "es" : ""}
            </span>
          )}
        </div>

        {productos.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-neutral-500">Todavía no hay presentaciones de muestra.</p>
            <p className="text-xs text-neutral-400 mt-1">
              {esAdmin
                ? <>Creá la presentación desde la receta y marcala como muestra en <a href="/admin/productos" className="text-tierra-700 hover:underline">Productos → columna Muestra</a>. Después se produce como cualquier lote.</>
                : "Pedile al admin que cargue las presentaciones de muestra."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {productos.map((p) => {
              const qty = quantities[p.id] ?? 0;
              return (
                <div key={p.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{p.name}</p>
                    <p className={`text-xs ${p.disponible > 0 ? "text-neutral-400" : "text-danger"}`}>
                      {p.disponible > 0 ? `${p.disponible} ${p.unit_label ?? "u."} en stock` : "Sin stock — hay que producirla"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setQty(p.id, qty - 1)}
                      disabled={qty === 0 || isPending}
                      className="w-7 h-7 rounded-full border border-neutral-200 text-neutral-500 flex items-center justify-center text-sm hover:bg-neutral-50 disabled:opacity-30 transition-colors"
                    >
                      −
                    </button>
                    <span className={`w-8 text-center text-sm font-medium ${qty > 0 ? "text-neutral-900" : "text-neutral-300"}`}>
                      {qty || "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(p.id, qty + 1)}
                      disabled={isPending}
                      className="w-7 h-7 rounded-full bg-neutral-800 text-white flex items-center justify-center text-sm hover:bg-neutral-700 disabled:opacity-50 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {sinStock.length > 0 && (
          <p className="text-xs text-warning bg-warning-bg rounded-xl px-3 py-2">
            {sinStock.map((p) => p.name).join(", ")}: pedís más de lo que hay en stock. Se puede cargar igual, pero Producción tiene que armar el lote antes de despacharla.
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-bg border border-danger/20 rounded-xl px-4 py-3">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending || seleccionados.length === 0 || !nombre.trim() || !direccion.trim()}
          className="px-5 py-2.5 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Enviando…" : esAdmin ? "Crear muestra" : "Solicitar muestra"}
        </button>
        <a href="/admin/muestras" className="text-sm text-neutral-500 hover:text-neutral-700">Cancelar</a>
      </div>
    </form>
  );
}
