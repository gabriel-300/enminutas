"use client";

import { useState, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus, Trash2 } from "lucide-react";
import { crearDevolucion, type DevolucionItemInput } from "../actions";

type Cliente  = { id: string; full_name: string };
type Producto = { id: string; name: string; price_b2b: number };

const today = () => new Date().toISOString().slice(0, 10);
const emptyItem = (): DevolucionItemInput & { _key: number } => ({
  _key: Math.random(), descripcion: "", cantidad: 1, precio_unitario: 0,
});

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

export function NuevaDevolucionClient({
  clientes,
  productos,
}: {
  clientes: Cliente[];
  productos: Producto[];
}) {
  const router  = useRouter();
  const formId  = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [clienteId,  setClienteId]  = useState("");
  const [pedidoRef,  setPedidoRef]  = useState("");
  const [fecha,      setFecha]      = useState(today());
  const [motivo,     setMotivo]     = useState("");
  const [obs,        setObs]        = useState("");
  const [items, setItems] = useState<(DevolucionItemInput & { _key: number })[]>([emptyItem()]);

  const productoListId = `${formId}-prod-list`;

  function addItem()   { setItems(p => [...p, emptyItem()]); }
  function removeItem(key: number) { setItems(p => p.filter(i => i._key !== key)); }
  function updateItem(key: number, field: keyof DevolucionItemInput, value: string | number) {
    setItems(p => p.map(i => i._key === key ? { ...i, [field]: value } : i));
  }

  function autocompletarDesdeProducto(key: number, nombre: string) {
    const prod = productos.find(p => p.name === nombre);
    setItems(prev => prev.map(i =>
      i._key === key
        ? { ...i, descripcion: nombre, precio_unitario: prod ? Number(prod.price_b2b) : i.precio_unitario }
        : i
    ));
  }

  const total = items.reduce((s, i) => s + (i.cantidad || 0) * (i.precio_unitario || 0), 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteId) { setError("Seleccioná un cliente"); return; }
    if (!motivo.trim()) { setError("El motivo es obligatorio"); return; }
    if (items.some(i => !i.descripcion.trim() || i.cantidad <= 0)) {
      setError("Completá todos los ítems"); return;
    }
    setError(null);
    start(async () => {
      const res = await crearDevolucion({
        clienteId,
        pedidoId:     pedidoRef.trim() || undefined,
        fecha,
        motivo:       motivo.trim(),
        observaciones: obs.trim() || undefined,
        items: items.map(({ descripcion, cantidad, precio_unitario }) => ({
          descripcion, cantidad: Number(cantidad), precio_unitario: Number(precio_unitario),
        })),
      });
      if (res.error) { setError(res.error); return; }
      router.push(`/admin/devoluciones/${res.id}`);
    });
  }

  const labelClass = "block text-xs font-medium text-neutral-500 mb-1";
  const inputClass = "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 focus:border-[#16233f]";

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/devoluciones" className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold font-display text-neutral-900">Nueva devolución</h1>
          <p className="text-sm text-neutral-400 mt-0.5">La devolución quedará en estado "Solicitada" hasta que la apruebes</p>
        </div>
      </div>

      <datalist id={productoListId}>
        {productos.map(p => <option key={p.id} value={p.name} />)}
      </datalist>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cliente y fecha */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900">Datos generales</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${formId}-cliente`} className={labelClass}>Cliente *</label>
              <select
                id={`${formId}-cliente`}
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Seleccioná un cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${formId}-fecha`} className={labelClass}>Fecha</label>
              <input
                id={`${formId}-fecha`}
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${formId}-motivo`} className={labelClass}>Motivo *</label>
            <input
              id={`${formId}-motivo`}
              type="text"
              placeholder="Ej: Producto en mal estado, error en pedido..."
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${formId}-pedido`} className={labelClass}>Referencia de pedido (opcional)</label>
              <input
                id={`${formId}-pedido`}
                type="text"
                placeholder="ID o número de pedido"
                value={pedidoRef}
                onChange={e => setPedidoRef(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor={`${formId}-obs`} className={labelClass}>Observaciones (opcional)</label>
              <input
                id={`${formId}-obs`}
                type="text"
                placeholder="Notas internas..."
                value={obs}
                onChange={e => setObs(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Ítems */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900">Productos a devolver</h2>

          {items.map((item, idx) => (
            <div key={item._key} className="grid grid-cols-[1fr_80px_110px_32px] gap-2 items-end">
              <div>
                {idx === 0 && <p className={labelClass}>Descripción</p>}
                <input
                  type="text"
                  list={productoListId}
                  placeholder="Nombre del producto..."
                  value={item.descripcion}
                  onChange={e => {
                    updateItem(item._key, "descripcion", e.target.value);
                    autocompletarDesdeProducto(item._key, e.target.value);
                  }}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                {idx === 0 && <p className={labelClass}>Cant.</p>}
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={item.cantidad}
                  onChange={e => updateItem(item._key, "cantidad", parseFloat(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
              <div>
                {idx === 0 && <p className={labelClass}>Precio unit.</p>}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.precio_unitario}
                  onChange={e => updateItem(item._key, "precio_unitario", parseFloat(e.target.value) || 0)}
                  className={inputClass}
                />
              </div>
              <div className={idx === 0 ? "mt-5" : ""}>
                <button
                  type="button"
                  onClick={() => removeItem(item._key)}
                  disabled={items.length === 1}
                  className="p-2 rounded-xl border border-neutral-200 text-neutral-300 hover:text-red-500 hover:border-red-200 transition-colors disabled:opacity-30"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors mt-1"
          >
            <Plus className="size-3.5" /> Agregar ítem
          </button>

          {/* Total */}
          <div className="border-t border-neutral-100 pt-3 flex justify-end">
            <div className="text-right">
              <p className="text-xs text-neutral-400 mb-0.5">Total a acreditar</p>
              <p className="text-xl font-bold text-neutral-900 tabular-nums">{fmt(total)}</p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 px-1">{error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Crear devolución"}
        </button>
      </form>
    </div>
  );
}
