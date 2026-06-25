"use client";

import { useState, useTransition, useId } from "react";
import { registrarMovimiento, eliminarMovimiento, actualizarLimiteCredito } from "../actions";
import { Trash2 } from "lucide-react";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(n);

const today = () => new Date().toISOString().slice(0, 10);

type Movimiento = {
  id: string;
  fecha: string;
  tipo: string;
  descripcion: string;
  monto: number;
  referencia: string | null;
};

const TIPO_CFG: Record<string, { label: string; bg: string; text: string }> = {
  cargo:        { label: "Cargo",        bg: "#fef2f2", text: "#dc2626" },
  pago:         { label: "Pago",         bg: "#ecfdf5", text: "#059669" },
  nota_credito: { label: "Nota crédito", bg: "#eff6ff", text: "#2563eb" },
  ajuste:       { label: "Ajuste",       bg: "#f5f5f5", text: "#737373" },
};

export function CcClient({
  clienteId,
  movimientos,
  saldo,
  limite,
}: {
  clienteId: string;
  movimientos: Movimiento[];
  saldo: number;
  limite: number;
}) {
  const formId = useId();
  const [pending, start] = useTransition();
  const [error, setError]   = useState<string | null>(null);
  const [tipo, setTipo]     = useState<"pago" | "cargo" | "ajuste" | "nota_credito">("pago");
  const [monto, setMonto]   = useState("");
  const [desc, setDesc]     = useState("");
  const [ref, setRef]       = useState("");
  const [fecha, setFecha]   = useState(today());

  // límite de crédito
  const [editingLimite, setEditingLimite] = useState(false);
  const [limiteVal, setLimiteVal]         = useState(String(limite));
  const [limPending, startLim]            = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const montoNum = parseFloat(monto.replace(",", "."));
    if (!montoNum || montoNum <= 0) { setError("El monto debe ser mayor a 0"); return; }
    if (!desc.trim()) { setError("La descripción es obligatoria"); return; }
    setError(null);
    start(async () => {
      const res = await registrarMovimiento({
        clienteId,
        tipo,
        monto: montoNum,
        descripcion: desc.trim(),
        referencia: ref.trim() || undefined,
        fecha,
      });
      if (res.error) { setError(res.error); return; }
      setMonto(""); setDesc(""); setRef(""); setFecha(today());
    });
  }

  function handleDelete(id: string) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    start(async () => {
      const res = await eliminarMovimiento(id);
      if (res.error) setError(res.error);
    });
  }

  function handleLimiteSave() {
    const val = parseFloat(limiteVal.replace(",", "."));
    if (isNaN(val) || val < 0) return;
    startLim(async () => {
      await actualizarLimiteCredito(clienteId, val);
      setEditingLimite(false);
    });
  }

  const labelClass = "block text-xs font-medium text-neutral-500 mb-1";
  const inputClass = "w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20 focus:border-[#16233f]";

  return (
    <div className="space-y-6">
      {/* Límite de crédito */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-neutral-400 uppercase tracking-wide mb-0.5">Límite de crédito</p>
          {editingLimite ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                min="0"
                step="1000"
                value={limiteVal}
                onChange={e => setLimiteVal(e.target.value)}
                className="w-40 rounded-xl border border-neutral-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#16233f]/20"
              />
              <button
                onClick={handleLimiteSave}
                disabled={limPending}
                className="px-3 py-1.5 rounded-xl bg-[#16233f] text-white text-xs font-medium disabled:opacity-50"
              >
                Guardar
              </button>
              <button onClick={() => setEditingLimite(false)} className="text-xs text-neutral-400 hover:text-neutral-700">
                Cancelar
              </button>
            </div>
          ) : (
            <p className="text-lg font-bold text-neutral-900 tabular-nums">
              {limite > 0 ? fmt(limite) : <span className="text-neutral-400 font-normal text-sm">Sin límite definido</span>}
            </p>
          )}
        </div>
        {!editingLimite && (
          <button
            onClick={() => setEditingLimite(true)}
            className="text-xs text-[#16233f] hover:underline font-medium"
          >
            Editar
          </button>
        )}
      </div>

      {/* Formulario nuevo movimiento */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <h2 className="text-sm font-semibold text-neutral-900 mb-4">Registrar movimiento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo */}
          <div className="flex gap-2">
            {(["pago", "cargo", "nota_credito", "ajuste"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  tipo === t
                    ? "bg-[#16233f] text-white border-[#16233f]"
                    : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {TIPO_CFG[t].label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${formId}-monto`} className={labelClass}>Monto ($)</label>
              <input
                id={`${formId}-monto`}
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={monto}
                onChange={e => setMonto(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label htmlFor={`${formId}-fecha`} className={labelClass}>Fecha</label>
              <input
                id={`${formId}-fecha`}
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${formId}-desc`} className={labelClass}>Descripción</label>
            <input
              id={`${formId}-desc`}
              type="text"
              placeholder={tipo === "pago" ? "Ej: Transferencia BBVA" : "Ej: Factura A 0001-00000001"}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor={`${formId}-ref`} className={labelClass}>Referencia (opcional)</label>
            <input
              id={`${formId}-ref`}
              type="text"
              placeholder="Nro. cheque, CBU, transferencia..."
              value={ref}
              onChange={e => setRef(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-2.5 rounded-xl bg-[#16233f] text-white text-sm font-medium hover:bg-[#1e2f52] transition-colors disabled:opacity-50"
          >
            {pending ? "Registrando..." : "Registrar movimiento"}
          </button>
        </form>
      </div>

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Movimientos</h2>
          <span className="text-xs text-neutral-400">{movimientos.length} registros</span>
        </div>
        {movimientos.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-neutral-400">Sin movimientos registrados.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Fecha</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Tipo</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide">Descripción</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Monto</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-400 uppercase tracking-wide">Saldo parcial</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {(() => {
                let acum = 0;
                // mostramos cronológico para acumular, pero la tabla va desc
                const ordenAsc = [...movimientos].reverse();
                const conAcum = ordenAsc.map(m => {
                  acum += Number(m.monto);
                  return { ...m, acum };
                });
                return conAcum.reverse().map(m => {
                  const cfg = TIPO_CFG[m.tipo] ?? TIPO_CFG.ajuste;
                  const esPositivo = Number(m.monto) > 0;
                  return (
                    <tr key={m.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3 text-neutral-500 tabular-nums whitespace-nowrap">
                        {new Date(m.fecha + "T12:00:00").toLocaleDateString("es-AR")}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ background: cfg.bg, color: cfg.text }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-neutral-700">
                        {m.descripcion}
                        {m.referencia && <span className="text-neutral-400 text-xs ml-1">({m.referencia})</span>}
                      </td>
                      <td className={`px-5 py-3 text-right font-semibold tabular-nums ${esPositivo ? "text-red-600" : "text-emerald-600"}`}>
                        {esPositivo ? "+" : ""}{fmt(Number(m.monto))}
                      </td>
                      <td className="px-5 py-3 text-right text-neutral-600 tabular-nums text-xs">
                        {fmt(m.acum)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => handleDelete(m.id)}
                          disabled={pending}
                          className="p-1.5 rounded-lg text-neutral-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
                          title="Eliminar"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
            <tfoot className="border-t-2 border-neutral-200">
              <tr>
                <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-neutral-900">Saldo actual</td>
                <td colSpan={3} className={`px-5 py-3 text-right text-base font-bold tabular-nums ${saldo > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {fmt(saldo)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
