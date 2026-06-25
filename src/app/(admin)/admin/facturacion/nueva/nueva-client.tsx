"use client";

import { useState, useTransition, useId } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ChevronLeft } from "lucide-react";
import { crearFactura, type FacturaItemInput } from "../actions";

type Cliente = { id: string; razon_social: string; cuit: string; condicion_iva: string };
type Producto = { id: string; name: string; cost: number };

const COND_IVA_TIPO: Record<string, "A" | "B" | "C"> = {
  responsable_inscripto: "A",
  monotributista:        "B",
  consumidor_final:      "B",
  exento:                "B",
};

const IVA_OPS = [
  { value: 21,   label: "21%" },
  { value: 10.5, label: "10,5%" },
  { value: 0,    label: "0%" },
];

const PAGO_OPS = [
  { value: "contado",  label: "Contado" },
  { value: "30_dias",  label: "30 días" },
  { value: "60_dias",  label: "60 días" },
  { value: "90_dias",  label: "90 días" },
  { value: "cheque",   label: "Cheque diferido" },
];

const emptyItem = (): FacturaItemInput => ({
  descripcion: "", cantidad: 1, unidad: "u", precio_unitario: 0, alicuota_iva: 21,
});

const r2 = (n: number) => Math.round(n * 100) / 100;
const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

export function NuevaFacturaClient({ clientes, productos }: { clientes: Cliente[]; productos: Producto[] }) {
  const router  = useRouter();
  const uid     = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Datos del comprobante
  const [clienteId,     setClienteId]     = useState<string>("");
  const [razonSocial,   setRazonSocial]   = useState("");
  const [cuit,          setCuit]          = useState("");
  const [condicionIva,  setCondicionIva]  = useState("responsable_inscripto");
  const [domicilio,     setDomicilio]     = useState("");
  const [tipo,          setTipo]          = useState<"A"|"B"|"C"|"NC">("A");
  const [pv,            setPv]            = useState(1);
  const [condPago,      setCondPago]      = useState("contado");
  const [fecVenc,       setFecVenc]       = useState("");
  const [pedidoRefs,    setPedidoRefs]    = useState("");
  const [obs,           setObs]           = useState("");

  // Ítems
  const [items, setItems] = useState<FacturaItemInput[]>([emptyItem()]);

  function selectCliente(id: string) {
    setClienteId(id);
    const c = clientes.find(x => x.id === id);
    if (!c) return;
    setRazonSocial(c.razon_social);
    setCuit(c.cuit);
    setCondicionIva(c.condicion_iva);
    setTipo(COND_IVA_TIPO[c.condicion_iva] ?? "A");
  }

  function updateItem(i: number, field: keyof FacturaItemInput, raw: string) {
    setItems(prev => prev.map((it, idx) => {
      if (idx !== i) return it;
      const val = ["cantidad", "precio_unitario", "alicuota_iva"].includes(field)
        ? parseFloat(raw) || 0
        : raw;
      return { ...it, [field]: val };
    }));
  }

  function addItem() { setItems(prev => [...prev, emptyItem()]); }
  function removeItem(i: number) { setItems(prev => prev.filter((_, idx) => idx !== i)); }

  // Cálculo de totales en tiempo real
  function calcTotales() {
    let ng21 = 0, ng105 = 0, nn = 0;
    for (const it of items) {
      const sub = r2(it.cantidad * it.precio_unitario);
      if (it.alicuota_iva === 21)        ng21  += sub;
      else if (it.alicuota_iva === 10.5) ng105 += sub;
      else                               nn    += sub;
    }
    const iva21  = r2(ng21  * 0.21);
    const iva105 = r2(ng105 * 0.105);
    return {
      ng21: r2(ng21), ng105: r2(ng105), nn: r2(nn),
      iva21, iva105,
      total: r2(ng21 + ng105 + nn + iva21 + iva105),
    };
  }

  const tots = calcTotales();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await crearFactura({
        tipo, punto_venta: pv,
        cliente_id:     clienteId || null,
        razon_social:   razonSocial,
        cuit,
        condicion_iva:  condicionIva,
        domicilio_fiscal: domicilio,
        fecha_vencimiento: fecVenc || null,
        pedido_refs:    pedidoRefs.split(",").map(s => s.trim()).filter(Boolean),
        condicion_pago: condPago,
        observaciones:  obs,
        items,
      });
      if (res.error) { setError(res.error); return; }
      router.push(`/admin/facturacion/${res.id}`);
    });
  }

  const inputCls = "w-full border border-neutral-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 focus:border-[#16233f] transition-colors bg-white";
  const labelCls = "block text-xs font-medium text-neutral-600 mb-1";

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/admin/facturacion" className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 transition-colors">
          <ChevronLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold font-display text-neutral-900">Nueva factura</h1>
          <p className="text-sm text-neutral-400 mt-0.5">Completá los datos del comprobante</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Receptor ── */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">Datos del receptor</h2>
          <div className="grid sm:grid-cols-2 gap-4">

            {/* Selector cliente */}
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor={`${uid}-cliente`}>Cliente B2B (opcional)</label>
              <select
                id={`${uid}-cliente`}
                className={inputCls}
                value={clienteId}
                onChange={e => selectCliente(e.target.value)}
              >
                <option value="">— Cargar manualmente —</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.razon_social} ({c.cuit})</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls} htmlFor={`${uid}-rs`}>Razón social *</label>
              <input id={`${uid}-rs`} className={inputCls} required value={razonSocial} onChange={e => setRazonSocial(e.target.value)} placeholder="Empresa S.A." />
            </div>
            <div>
              <label className={labelCls} htmlFor={`${uid}-cuit`}>CUIT *</label>
              <input id={`${uid}-cuit`} className={inputCls} required value={cuit} onChange={e => setCuit(e.target.value)} placeholder="20-12345678-9" />
            </div>
            <div>
              <label className={labelCls} htmlFor={`${uid}-iva`}>Condición IVA</label>
              <select id={`${uid}-iva`} className={inputCls} value={condicionIva} onChange={e => { setCondicionIva(e.target.value); setTipo(COND_IVA_TIPO[e.target.value] ?? "A"); }}>
                <option value="responsable_inscripto">Responsable Inscripto</option>
                <option value="monotributista">Monotributista</option>
                <option value="consumidor_final">Consumidor Final</option>
                <option value="exento">Exento</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor={`${uid}-dom`}>Domicilio fiscal</label>
              <input id={`${uid}-dom`} className={inputCls} value={domicilio} onChange={e => setDomicilio(e.target.value)} placeholder="Av. Ejemplo 1234, Buenos Aires" />
            </div>
          </div>
        </section>

        {/* ── Comprobante ── */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">Datos del comprobante</h2>
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className={labelCls} htmlFor={`${uid}-tipo`}>Tipo</label>
              <select id={`${uid}-tipo`} className={inputCls} value={tipo} onChange={e => setTipo(e.target.value as any)}>
                <option value="A">Factura A</option>
                <option value="B">Factura B</option>
                <option value="C">Factura C</option>
                <option value="NC">Nota de Crédito</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor={`${uid}-pv`}>Punto de venta</label>
              <input id={`${uid}-pv`} type="number" min={1} className={inputCls} value={pv} onChange={e => setPv(parseInt(e.target.value) || 1)} />
            </div>
            <div>
              <label className={labelCls} htmlFor={`${uid}-pago`}>Condición de pago</label>
              <select id={`${uid}-pago`} className={inputCls} value={condPago} onChange={e => setCondPago(e.target.value)}>
                {PAGO_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor={`${uid}-venc`}>Vencimiento pago</label>
              <input id={`${uid}-venc`} type="date" className={inputCls} value={fecVenc} onChange={e => setFecVenc(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor={`${uid}-refs`}>Pedidos asociados</label>
              <input id={`${uid}-refs`} className={inputCls} value={pedidoRefs} onChange={e => setPedidoRefs(e.target.value)} placeholder="EM-2026-00001, EM-2026-00002" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor={`${uid}-obs`}>Observaciones</label>
              <input id={`${uid}-obs`} className={inputCls} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ej: según orden de compra #..." />
            </div>
          </div>
        </section>

        {/* ── Ítems ── */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-neutral-700">Ítems</h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1 text-xs text-[#16233f] font-medium hover:underline">
              <Plus className="size-3.5" /> Agregar ítem
            </button>
          </div>

          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto] gap-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400 px-1">
              <span>Descripción</span><span>Cantidad</span><span>Unidad</span><span>Precio unit. (s/IVA)</span><span>IVA</span><span></span>
            </div>

            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto] gap-2 items-center">
                {/* Descripción con datalist de productos */}
                <div className="relative">
                  <input
                    list={`${uid}-prods-${i}`}
                    className={inputCls}
                    required
                    value={it.descripcion}
                    onChange={e => {
                      updateItem(i, "descripcion", e.target.value);
                      const prod = productos.find(p => p.name === e.target.value);
                      if (prod) updateItem(i, "precio_unitario", String(prod.cost));
                    }}
                    placeholder="Producto / servicio"
                  />
                  <datalist id={`${uid}-prods-${i}`}>
                    {productos.map(p => <option key={p.id} value={p.name} />)}
                  </datalist>
                </div>
                <input type="number" min="0.001" step="0.001" className={inputCls} required value={it.cantidad} onChange={e => updateItem(i, "cantidad", e.target.value)} />
                <input className={inputCls} value={it.unidad} onChange={e => updateItem(i, "unidad", e.target.value)} placeholder="u" />
                <input type="number" min="0" step="0.01" className={inputCls} required value={it.precio_unitario || ""} onChange={e => updateItem(i, "precio_unitario", e.target.value)} placeholder="0.00" />
                <select className={inputCls} value={it.alicuota_iva} onChange={e => updateItem(i, "alicuota_iva", e.target.value)}>
                  {IVA_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1} className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Totales ── */}
        <section className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h2 className="text-sm font-semibold text-neutral-700 mb-3">Resumen IVA</h2>
          <div className="max-w-xs ml-auto space-y-1.5 text-sm">
            {tots.ng21 > 0 && <>
              <div className="flex justify-between text-neutral-600"><span>Neto gravado 21%</span><span className="tabular-nums">{fmt(tots.ng21)}</span></div>
              <div className="flex justify-between text-neutral-600"><span>IVA 21%</span><span className="tabular-nums">{fmt(tots.iva21)}</span></div>
            </>}
            {tots.ng105 > 0 && <>
              <div className="flex justify-between text-neutral-600"><span>Neto gravado 10,5%</span><span className="tabular-nums">{fmt(tots.ng105)}</span></div>
              <div className="flex justify-between text-neutral-600"><span>IVA 10,5%</span><span className="tabular-nums">{fmt(tots.iva105)}</span></div>
            </>}
            {tots.nn > 0 &&
              <div className="flex justify-between text-neutral-600"><span>No gravado</span><span className="tabular-nums">{fmt(tots.nn)}</span></div>
            }
            <div className="border-t border-neutral-200 pt-2 flex justify-between font-semibold text-neutral-900 text-base">
              <span>Total</span><span className="tabular-nums">{fmt(tots.total)}</span>
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Link href="/admin/facturacion" className="px-4 py-2 rounded-xl border border-neutral-200 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="px-5 py-2 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors disabled:opacity-50"
          >
            {pending ? "Guardando..." : "Guardar borrador"}
          </button>
        </div>
      </form>
    </div>
  );
}
