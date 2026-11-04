"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearProveedor, actualizarProveedor } from "./actions";
import { CONDICIONES_IVA } from "@/lib/proveedores-ficha";

export type ProveedorDatos = {
  id?:                 string;
  nombre:              string;
  cuit:                string | null;
  condicion_pago_dias: number;
  contacto:            string | null;
  telefono:            string | null;
  email:               string | null;
  notas:               string | null;
  condicion_iva:       string | null;
  cbu:                 string | null;
  alias_bancario:      string | null;
};

const inputCls = "w-full px-3 py-2 text-sm border border-neutral-400 rounded-lg focus:outline-none focus:ring-[3px] focus:ring-brand-500/30 focus:border-brand-700 disabled:opacity-50";
const labelCls = "block text-[13px] font-medium text-neutral-800 mb-1.5";

// Alta (sin id) y edición (con id) del proveedor, en un panel plegable.
export function ProveedorForm({ inicial, etiqueta }: { inicial?: ProveedorDatos; etiqueta: string }) {
  const router = useRouter();
  const [abierto,  setAbierto]  = useState(false);
  const [nombre,   setNombre]   = useState(inicial?.nombre ?? "");
  const [cuit,     setCuit]     = useState(inicial?.cuit ?? "");
  const [dias,     setDias]     = useState(String(inicial?.condicion_pago_dias ?? 0));
  const [contacto, setContacto] = useState(inicial?.contacto ?? "");
  const [telefono, setTelefono] = useState(inicial?.telefono ?? "");
  const [email,    setEmail]    = useState(inicial?.email ?? "");
  const [notas,    setNotas]    = useState(inicial?.notas ?? "");
  const [condIva,  setCondIva]  = useState(inicial?.condicion_iva ?? "");
  const [cbu,      setCbu]      = useState(inicial?.cbu ?? "");
  const [alias,    setAlias]    = useState(inicial?.alias_bancario ?? "");
  const [error,   setError]    = useState<string | null>(null);
  const [pending,  start]       = useTransition();

  function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      nombre, cuit: cuit || null, condicion_pago_dias: Number(dias) || 0,
      contacto: contacto || null, telefono: telefono || null, email: email || null, notas: notas || null,
      condicion_iva: condIva || null, cbu: cbu || null, alias_bancario: alias || null,
    };
    start(async () => {
      const res = inicial?.id ? await actualizarProveedor(inicial.id, payload) : await crearProveedor(payload);
      if ("error" in res) { setError(res.error); return; }
      setAbierto(false);
      if (!inicial?.id && res.id) router.push(`/admin/proveedores/${res.id}`);
      else router.refresh();
    });
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)}
        className="px-4 py-2 text-sm font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 transition-colors">
        {etiqueta}
      </button>
    );
  }

  return (
    <form onSubmit={guardar} className="w-full bg-white rounded-xl border border-neutral-200 shadow-sm p-5 space-y-4 text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <label className={labelCls}>Nombre *</label>
          <input value={nombre} onChange={e => setNombre(e.target.value)} className={inputCls} required disabled={pending} autoFocus />
        </div>
        <div>
          <label className={labelCls}>CUIT</label>
          <input value={cuit} onChange={e => setCuit(e.target.value)} placeholder="30-00000000-0" className={inputCls} disabled={pending} />
        </div>
        <div>
          <label className={labelCls}>Plazo de pago (días)</label>
          <input type="number" min={0} value={dias} onChange={e => setDias(e.target.value)} className={inputCls} disabled={pending} />
        </div>
        <div>
          <label className={labelCls}>Contacto</label>
          <input value={contacto} onChange={e => setContacto(e.target.value)} className={inputCls} disabled={pending} />
        </div>
        <div>
          <label className={labelCls}>Teléfono</label>
          <input value={telefono} onChange={e => setTelefono(e.target.value)} className={inputCls} disabled={pending} />
        </div>
        <div className="md:col-span-3">
          <label className={labelCls}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} disabled={pending} />
        </div>
        <div>
          <label className={labelCls}>Condición de IVA</label>
          <select value={condIva} onChange={e => setCondIva(e.target.value)} className={inputCls} disabled={pending}>
            <option value="">Sin definir</option>
            {CONDICIONES_IVA.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelCls}>CBU <span className="font-normal text-neutral-600">(22 dígitos)</span></label>
          <input value={cbu} onChange={e => setCbu(e.target.value)} inputMode="numeric" className={inputCls} disabled={pending} />
        </div>
        <div>
          <label className={labelCls}>Alias</label>
          <input value={alias} onChange={e => setAlias(e.target.value)} className={inputCls} disabled={pending} />
        </div>
        <div className="md:col-span-3">
          <label className={labelCls}>Notas (observaciones)</label>
          <input value={notas} onChange={e => setNotas(e.target.value)} className={inputCls} disabled={pending} />
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors">
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} disabled={pending}
          className="text-sm text-neutral-600 hover:text-neutral-700 px-2">
          Cancelar
        </button>
      </div>
    </form>
  );
}
