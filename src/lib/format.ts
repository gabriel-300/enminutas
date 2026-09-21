// Formato de moneda ARS. Fechas: ver lib/fecha.ts.
const ars0 = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const ars2 = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

/** $ 1.234 — sin decimales */
export const fmt = (n: number) => ars0.format(n);

/** $ 1.234,50 — hasta 2 decimales */
export const fmt2 = (n: number) => ars2.format(n);

/** $ 1,2M / $ 45k — para KPIs y gráficos; por debajo de 1.000 usa fmt */
export const fmtK = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${Math.round(n / 1_000)}k`;
  return fmt(n);
};
