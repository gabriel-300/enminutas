"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText } from "lucide-react";

type Factura = {
  id: string;
  tipo: string;
  punto_venta: number;
  numero: number | null;
  razon_social: string;
  cuit: string;
  total: number;
  estado: string;
  fecha_emision: string | null;
  created_at: string;
  condicion_pago: string;
};

const ESTADO_CFG: Record<string, { label: string; bg: string; color: string }> = {
  borrador: { label: "Borrador", bg: "#f5f5f5",   color: "#737373" },
  emitida:  { label: "Emitida",  bg: "#e8f0fb",   color: "#2f5fd0" },
  cobrada:  { label: "Cobrada",  bg: "#ecfdf5",   color: "#059669" },
  anulada:  { label: "Anulada",  bg: "#fef2f2",   color: "#dc2626" },
};

const TIPO_CFG: Record<string, { bg: string; color: string }> = {
  A:  { bg: "#eef2f7", color: "#16233f" },
  B:  { bg: "#fefce8", color: "#854d0e" },
  C:  { bg: "#f0fdf4", color: "#166534" },
  NC: { bg: "#fef2f2", color: "#991b1b" },
};

const PAGO_LABEL: Record<string, string> = {
  contado:  "Contado",
  "30_dias": "30 días",
  "60_dias": "60 días",
  "90_dias": "90 días",
  cheque:   "Cheque",
};

function numeroCmp(tipo: string, pv: number, numero: number | null) {
  if (!numero) return "—";
  return `${tipo} ${String(pv).padStart(4, "0")}-${String(numero).padStart(8, "0")}`;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

const ESTADOS = ["todas", "borrador", "emitida", "cobrada", "anulada"];

export function FacturacionClient({
  facturas,
  mes,
  estadoFiltro,
}: {
  facturas: Factura[];
  mes: string;
  estadoFiltro: string;
}) {
  const router = useRouter();

  function setEstado(e: string) {
    const params = new URLSearchParams({ mes, estado: e });
    router.push(`?${params.toString()}`);
  }

  function setMes(delta: number) {
    const [y, m] = mes.split("-").map(Number);
    let nm = m + delta;
    let ny = y;
    if (nm < 1)  { nm = 12; ny--; }
    if (nm > 12) { nm = 1;  ny++; }
    const now = new Date();
    if (ny > now.getFullYear() || (ny === now.getFullYear() && nm > now.getMonth() + 1)) return;
    const nmes = `${ny}-${String(nm).padStart(2, "0")}`;
    router.push(`?mes=${nmes}&estado=${estadoFiltro}`);
  }

  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const [y, m] = mes.split("-").map(Number);
  const now    = new Date();
  const esMesActual = y === now.getFullYear() && m === now.getMonth() + 1;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200">
      {/* Toolbar */}
      <div className="p-4 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-3">
        {/* Filtro estado */}
        <div className="flex gap-1">
          {ESTADOS.map(e => (
            <button
              key={e}
              onClick={() => setEstado(e)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                estadoFiltro === e
                  ? "bg-[#16233f] text-white"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              {e === "todas" ? "Todas" : ESTADO_CFG[e]?.label ?? e}
            </button>
          ))}
        </div>

        {/* Selector de mes */}
        <div className="flex items-center gap-1 border border-neutral-200 rounded-xl px-1 py-1">
          <button onClick={() => setMes(-1)} className="size-7 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 text-sm">‹</button>
          <span className="px-3 text-sm font-medium text-neutral-800 min-w-[140px] text-center">
            {MESES[m - 1]} {y}
          </span>
          <button onClick={() => setMes(1)} disabled={esMesActual} className="size-7 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 text-sm">›</button>
        </div>
      </div>

      {/* Tabla */}
      {facturas.length === 0 ? (
        <div className="py-16 text-center text-sm text-neutral-400">
          No hay comprobantes en este período
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Número", "Fecha", "Cliente", "CUIT", "Condición", "Total", "Estado", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {facturas.map(f => {
              const est = ESTADO_CFG[f.estado] ?? ESTADO_CFG.borrador;
              const tip = TIPO_CFG[f.tipo]     ?? TIPO_CFG.A;
              const fecha = f.fecha_emision
                ? new Date(f.fecha_emision + "T12:00:00").toLocaleDateString("es-AR")
                : new Date(f.created_at).toLocaleDateString("es-AR");

              return (
                <tr key={f.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold mr-2"
                      style={{ background: tip.bg, color: tip.color }}
                    >
                      {f.tipo}
                    </span>
                    {numeroCmp(f.tipo, f.punto_venta, f.numero)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">{fecha}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900 max-w-[180px] truncate">{f.razon_social}</td>
                  <td className="px-4 py-3 text-neutral-500 font-mono text-xs whitespace-nowrap">{f.cuit}</td>
                  <td className="px-4 py-3 text-neutral-500 whitespace-nowrap">{PAGO_LABEL[f.condicion_pago] ?? f.condicion_pago}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-neutral-900 whitespace-nowrap">
                    {fmt(Number(f.total))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                      style={{ background: est.bg, color: est.color }}
                    >
                      {est.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <Link
                        href={`/admin/facturacion/${f.id}`}
                        className="text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                      >
                        Ver
                      </Link>
                      {f.estado !== "borrador" && (
                        <Link
                          href={`/admin/facturacion/${f.id}/pdf`}
                          target="_blank"
                          className="p-1 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                          title="Ver PDF"
                        >
                          <FileText className="size-3.5" />
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
