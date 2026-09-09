"use client";

import { useState, useTransition } from "react";
import { marcarComisionPagada, revertirComisionPagada } from "./actions";

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const hoy = () => new Date().toISOString().slice(0, 10);

type Props = {
  vendedorId: string;
  mes:        string;      // 'YYYY-MM'
  comisionCalculada: number;
  pct:        number;
  ventasBase: number;
  pagada:     boolean;
  fechaPago:  string | null;
  notas:      string | null;
};

export function ComisionAcciones({
  vendedorId, mes, comisionCalculada, pct, ventasBase, pagada, fechaPago, notas,
}: Props) {
  const [modo, setModo]   = useState<"idle" | "marcar">("idle");
  const [monto, setMonto] = useState(String(comisionCalculada));
  const [fecha, setFecha] = useState(hoy());
  const [nota,  setNota]  = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  if (pagada) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
          ✓ Pagada {fechaPago ? `el ${new Date(fechaPago + "T12:00:00").toLocaleDateString("es-AR")}` : ""}
        </span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirm(`¿Revertir el pago de comisión de ${mes} a pendiente? Se borra el registro de pago.`)) return;
            start(async () => {
              const res = await revertirComisionPagada(vendedorId, mes);
              if ("error" in res) setError(res.error);
            });
          }}
          className="text-xs text-neutral-400 hover:text-red-500 disabled:opacity-40 transition-colors"
        >
          Revertir
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (modo === "idle") {
    return (
      <button
        type="button"
        onClick={() => { setModo("marcar"); setMonto(String(comisionCalculada)); setFecha(hoy()); setError(null); }}
        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 transition-colors"
      >
        Marcar pagada
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex items-center gap-2">
        <input
          type="text" inputMode="decimal" value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-28 px-2 py-1.5 text-xs text-right border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
        />
        <input
          type="date" value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="px-2 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
        />
      </div>
      <input
        type="text" placeholder="Notas (opcional)" value={nota}
        onChange={(e) => setNota(e.target.value)}
        className="w-56 px-2 py-1.5 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          type="button" disabled={isPending}
          onClick={() => setModo("idle")}
          className="text-xs text-neutral-400 hover:text-neutral-700 disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="button" disabled={isPending}
          onClick={() => {
            const montoNum = parseFloat(monto.replace(",", "."));
            if (isNaN(montoNum) || montoNum < 0) return setError("Monto inválido");
            setError(null);
            start(async () => {
              const res = await marcarComisionPagada({
                vendedorId, mes, monto: montoNum, pct, ventasBase, fechaPago: fecha, notas: nota,
              });
              if ("error" in res) { setError(res.error); return; }
              setModo("idle");
            });
          }}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-tierra-700 text-white hover:bg-tierra-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? "Guardando…" : `Confirmar ${fmt(parseFloat(monto || "0") || 0)}`}
        </button>
      </div>
    </div>
  );
}
