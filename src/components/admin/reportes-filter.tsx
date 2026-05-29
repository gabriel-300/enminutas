"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export function ReportesFilter({ mes }: { mes: string }) {
  const router = useRouter();
  const [year, month] = mes.split("-").map(Number);

  function go(newYear: number, newMonth: number) {
    router.push(`?mes=${newYear}-${String(newMonth).padStart(2, "0")}`);
  }

  function prev() {
    if (month === 1) go(year - 1, 12);
    else go(year, month - 1);
  }

  function next() {
    const now = new Date();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;
    if (isCurrentMonth) return;
    if (month === 12) go(year + 1, 1);
    else go(year, month + 1);
  }

  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  return (
    <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-1 py-1">
      <button onClick={prev}
        className="size-7 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 text-sm transition-colors">
        ‹
      </button>
      <span className="px-3 text-sm font-medium text-neutral-800 min-w-[160px] text-center capitalize">
        {MESES[month - 1]} {year}
      </span>
      <button onClick={next} disabled={isCurrentMonth}
        className="size-7 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 text-sm transition-colors">
        ›
      </button>
    </div>
  );
}
