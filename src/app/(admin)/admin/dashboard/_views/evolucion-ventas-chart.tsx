"use client";

import { useId, useState } from "react";
import { fmtK } from "@/lib/format";
import { cn } from "@/lib/utils";

type MonthPoint = {
  key: string;
  total: number;
  label: string;
  current: boolean;
  pct: number | null;
};

const W = 600;
const H = 200;
const PAD_LEFT = 20;
const PAD_RIGHT = 16;
const PAD_TOP = 38;
const PAD_BOTTOM = 10;

export function EvolucionVentasChart({ data, max }: { data: MonthPoint[]; max: number }) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const n = data.length;

  if (n === 0) return null;

  const innerW = W - PAD_LEFT - PAD_RIGHT;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const xAt = (i: number) => (n === 1 ? PAD_LEFT + innerW / 2 : PAD_LEFT + (i * innerW) / (n - 1));
  const yAt = (v: number) => PAD_TOP + (1 - (max > 0 ? v / max : 0)) * innerH;

  const points = data.map((m, i) => ({ ...m, x: xAt(i), y: yAt(m.total) }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[n - 1].x},${H - PAD_BOTTOM} L${points[0].x},${H - PAD_BOTTOM} Z`;

  const active = hover !== null ? points[hover] : null;

  return (
    <div className="px-6 pb-4 pt-5">
      <div className="relative" style={{ height: 220 }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label="Evolución de ventas mensuales"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-700)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--color-brand-700)" stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Gridline base — recessivo, hairline */}
          <line x1={PAD_LEFT} y1={H - PAD_BOTTOM} x2={W - PAD_RIGHT} y2={H - PAD_BOTTOM} stroke="var(--color-n-200)" strokeWidth={1} />

          {/* Crosshair */}
          {active && (
            <line x1={active.x} y1={PAD_TOP - 10} x2={active.x} y2={H - PAD_BOTTOM} stroke="var(--color-n-300)" strokeWidth={1} />
          )}

          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path d={linePath} fill="none" stroke="var(--color-brand-700)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => (
            <circle
              key={p.key}
              cx={p.x}
              cy={p.y}
              r={hover === i ? 5 : 4}
              fill="var(--color-brand-700)"
              stroke="var(--color-n-0)"
              strokeWidth={2}
              className="transition-[r]"
            />
          ))}

          {/* Etiqueta directa — solo el mes actual (el final de la línea) */}
          {(() => {
            const last = points[n - 1];
            return (
              <text x={last.x} y={last.y - 12} textAnchor="end" className="fill-brand-700 text-[11px] font-semibold tabular-nums">
                {fmtK(last.total)}
              </text>
            );
          })()}

          {/* Hit targets — un rect por mes, cubre toda la columna */}
          {points.map((p, i) => {
            const leftB = i === 0 ? 0 : (points[i - 1].x + p.x) / 2;
            const rightB = i === n - 1 ? W : (p.x + points[i + 1].x) / 2;
            return (
              <rect
                key={`hit-${p.key}`}
                x={leftB}
                y={0}
                width={rightB - leftB}
                height={H}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${p.label}: ${fmtK(p.total)}${p.pct !== null ? `, ${p.pct >= 0 ? "suba" : "baja"} de ${Math.abs(p.pct)}% respecto al mes anterior` : ""}`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                className="cursor-pointer outline-none"
              />
            );
          })}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-n-200 bg-n-0 px-2.5 py-1.5 shadow-md"
            style={{ left: `${(active.x / W) * 100}%` }}
          >
            <p className="whitespace-nowrap text-sm font-semibold tabular-nums text-n-900">{fmtK(active.total)}</p>
            <div className="flex items-center gap-1.5">
              <span className="capitalize text-[11px] text-n-600">{active.label}</span>
              {active.pct !== null && (
                <span className={cn("text-[11px] font-medium tabular-nums", active.pct >= 0 ? "text-success" : "text-danger")}>
                  {active.pct >= 0 ? "↑" : "↓"} {Math.abs(active.pct)}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Eje X */}
      <div className="grid gap-4 border-t border-n-200 pt-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {data.map((m) => (
          <span
            key={m.key}
            className={cn(
              "text-center text-xs capitalize transition-colors",
              m.current ? "font-semibold text-brand-700" : "text-n-600"
            )}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Tabla accesible — mismos datos, para lectores de pantalla */}
      <table className="sr-only">
        <caption>Evolución de ventas mensuales</caption>
        <thead>
          <tr><th>Mes</th><th>Total</th><th>Variación</th></tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.key}>
              <td>{m.label}</td>
              <td>{fmtK(m.total)}</td>
              <td>{m.pct !== null ? `${m.pct >= 0 ? "+" : ""}${m.pct}%` : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
