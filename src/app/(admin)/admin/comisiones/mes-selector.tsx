"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

const MESES_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function sumarMes(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MesSelector({ mes }: { mes: string }) {
  const router = useRouter();
  const [y, m] = mes.split("-").map(Number);

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/comisiones?mes=${sumarMes(mes, -1)}`}
        className="size-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors"
        aria-label="Mes anterior"
      >
        ←
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-neutral-800 capitalize min-w-[140px] text-center">
          {MESES_LABEL[m - 1]} {y}
        </span>
        <input
          type="month"
          value={mes}
          onChange={(e) => e.target.value && router.push(`/admin/comisiones?mes=${e.target.value}`)}
          className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-500 focus:outline-none focus:ring-2 focus:ring-tierra-700/20"
          aria-label="Elegir mes"
        />
      </div>
      <Link
        href={`/admin/comisiones?mes=${sumarMes(mes, 1)}`}
        className="size-8 flex items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors"
        aria-label="Mes siguiente"
      >
        →
      </Link>
    </div>
  );
}
