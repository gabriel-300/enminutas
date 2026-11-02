"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registrarGasto } from "./actions";
import { CATEGORIAS_GASTO, claveProveedor, normalizarCuit, sumarDias } from "@/lib/proveedores";

export type ProveedorOpcion = { id: string; nombre: string; cuit: string | null; dias: number };

const inputCls = "w-full px-3 py-2 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50";
const labelCls = "block text-[13px] font-medium text-neutral-800 mb-1.5";

const hoy = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

// Carga de un gasto sin mercadería (luz, agua, alquiler…): genera deuda con el proveedor, sin stock.
export function GastoForm({ proveedores }: { proveedores: ProveedorOpcion[] }) {
  const router = useRouter();
  const [abierto,   setAbierto]   = useState(false);
  const [proveedor, setProveedor] = useState("");
  const [cuit,      setCuit]      = useState("");
  const [categoria, setCategoria] = useState("luz");
  const [numero,    setNumero]    = useState("");
  const [fecha,     setFecha]     = useState(hoy());
  const [total,     setTotal]     = useState("");
  const [vencManual, setVencManual] = useState("");
  const [notas,     setNotas]     = useState("");
  const [error,     setError]     = useState<string | null>(null);
  const [pending,   start]        = useTransition();

  const cuitNorm = normalizarCuit(cuit);
  const match = proveedores.find(p => cuitNorm && p.cuit === cuitNorm)
    ?? proveedores.find(p => proveedor.trim() && claveProveedor(p.nombre) === claveProveedor(proveedor));
  const vencimiento = vencManual || sumarDias(fecha, match?.dias ?? 0);

  function cerrar() {
    setAbierto(false); setProveedor(""); setCuit(""); setCategoria("luz"); setNumero("");
    setFecha(hoy()); setTotal(""); setVencManual(""); setNotas(""); setError(null);
  }

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const importe = parseFloat(total.replace(",", "."));
    if (isNaN(importe) || importe <= 0) return setError("El importe debe ser mayor a cero");
    start(async () => {
      const res = await registrarGasto({
        proveedor, cuit: cuit || null, categoria, numero, fecha, vencimientoPago: vencimiento, total: importe, notas: notas || null,
      });
      if ("error" in res) { setError(res.error); return; }
      cerrar();
      router.push(`/admin/proveedores/${res.proveedorId}`);
    });
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="px-4 py-2 text-sm font-medium rounded-lg border border-tierra-700 text-tierra-700 hover:bg-tierra-700/5 transition-colors">
        + Cargar gasto
      </button>
    );
  }

  return (
    <form onSubmit={guardar} className="w-full bg-white rounded-xl border border-neutral-200 shadow-sm p-5 space-y-4 text-left">
      <div>
        <p className="text-sm font-semibold text-neutral-800">Cargar gasto</p>
        <p className="text-xs text-neutral-600">Servicios, alquiler, impuestos… Quedan como deuda con el proveedor; no mueven stock.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className={labelCls}>Proveedor *</label>
          <input value={proveedor} onChange={e => setProveedor(e.target.value)} className={inputCls} required
            disabled={pending} list="gasto-proveedores" placeholder="Ej: Energía de Misiones" autoFocus />
          <datalist id="gasto-proveedores">
            {proveedores.map(p => <option key={p.id} value={p.nombre} />)}
          </datalist>
          {proveedor.trim() && !match && <p className="text-xs text-neutral-600 mt-1">Proveedor nuevo: se da de alta al guardar.</p>}
        </div>
        <div>
          <label className={labelCls}>CUIT <span className="font-normal text-neutral-600">(opcional)</span></label>
          <input value={cuit} onChange={e => setCuit(e.target.value)} className={inputCls} disabled={pending} placeholder="XX-XXXXXXXX-X" />
        </div>
        <div>
          <label className={labelCls}>Categoría *</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} className={inputCls} disabled={pending}>
            {CATEGORIAS_GASTO.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>N° de comprobante *</label>
          <input value={numero} onChange={e => setNumero(e.target.value)} className={inputCls} required disabled={pending} />
        </div>
        <div>
          <label className={labelCls}>Importe total *</label>
          <input type="text" inputMode="decimal" value={total} onChange={e => setTotal(e.target.value)}
            className={inputCls} required disabled={pending} placeholder="0" />
        </div>
        <div>
          <label className={labelCls}>Fecha del comprobante</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputCls} disabled={pending} required />
        </div>
        <div>
          <label className={labelCls}>Vence el pago</label>
          <input type="date" value={vencimiento} onChange={e => setVencManual(e.target.value)} className={inputCls} disabled={pending} required />
          <p className="text-xs text-neutral-600 mt-1">
            {match && match.dias > 0 ? `Plazo del proveedor: ${match.dias} días` : "Sin plazo cargado: contado"}
          </p>
        </div>
        <div>
          <label className={labelCls}>Notas</label>
          <input value={notas} onChange={e => setNotas(e.target.value)} className={inputCls} disabled={pending} placeholder="Ej: período oct/2026" />
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
          {pending ? "Guardando…" : "Guardar gasto"}
        </button>
        <button type="button" onClick={cerrar} disabled={pending} className="text-sm text-neutral-600 hover:text-neutral-700 px-2">
          Cancelar
        </button>
      </div>
    </form>
  );
}
