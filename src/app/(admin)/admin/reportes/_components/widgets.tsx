export const CHANNEL_CFG: Record<string, { label: string; bg: string; color: string; bar: string }> = {
  b2b_mayorista: { label: "B2B",         bg: "#f0f1fe", color: "#1c1b18", bar: "#3f37b3" },
  b2c_nacional:  { label: "Online",      bg: "#e9f1fc", color: "#1f5bb5", bar: "#1f5bb5" },
  distribucion:  { label: "Distribución",bg: "#eaf6ee", color: "#1d6b3a", bar: "#1d6b3a" },
  gastronomia:   { label: "Gastronomía", bg: "#fdf4e0", color: "#8a5a00", bar: "#8a5a00" },
};

export const STATUS_LABELS: Record<string, string> = {
  aprobado:        "Aprobado",
  enviado_prod:    "En producción",
  despachado:      "Despachado",
  en_distribucion: "En distribución",
  entrega_parcial: "Parcial",
  delivered:       "Entregado",
  liquidado:       "Liquidado",
};

// ── SVG Chart ────────────────────────────────────────────────────────────────

export function DailySalesChart({
  curSeries,
  prevSeries,
  daysInMonth,
}: {
  curSeries: number[];
  prevSeries: number[];
  daysInMonth: number;
}) {
  const W = 620, H = 108, PL = 2, PR = 2, PT = 6, PB = 2;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const maxVal = Math.max(...curSeries, ...prevSeries, 1);

  const xp = (i: number) => PL + (i / Math.max(daysInMonth - 1, 1)) * cW;
  const yp = (v: number) => PT + cH - (v / maxVal) * cH;

  const mkPts = (s: number[]) =>
    s.slice(0, daysInMonth).map((v, i) => `${xp(i)},${yp(v)}`).join(" ");

  const mkArea = (s: number[]) => {
    const inner = s.slice(0, daysInMonth).map((v, i) => `${xp(i)},${yp(v)}`).join(" ");
    return `${xp(0)},${PT + cH} ${inner} ${xp(daysInMonth - 1)},${PT + cH}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} aria-hidden>
      <defs>
        <linearGradient id="rpt-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f37b3" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#3f37b3" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={mkArea(curSeries)} fill="url(#rpt-grad)" />
      <polyline
        points={mkPts(prevSeries)}
        fill="none"
        stroke="#cfcdc8"
        strokeWidth="1.5"
        strokeDasharray="4 3"
      />
      <polyline
        points={mkPts(curSeries)}
        fill="none"
        stroke="#3f37b3"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Channel pill ─────────────────────────────────────────────────────────────

export function ChannelPill({ channel }: { channel: string }) {
  const c = CHANNEL_CFG[channel] ?? { label: channel, bg: "#efeeeb", color: "#44413c" };
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-medium leading-tight whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}

// ── Delta badge ───────────────────────────────────────────────────────────────

export function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev === 0) return null;
  const d = Math.round(((cur - prev) / prev) * 100);
  return (
    <span className={`text-xs font-medium ${d >= 0 ? "text-success" : "text-danger"}`}>
      {d >= 0 ? "▲" : "▼"} {Math.abs(d)}%
    </span>
  );
}
