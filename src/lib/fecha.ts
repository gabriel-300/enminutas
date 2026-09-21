const TZ = "America/Argentina/Buenos_Aires";

export function fmtFecha(
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = {},
): string {
  return new Date(date).toLocaleString("es-AR", { timeZone: TZ, ...opts });
}

export function fmtFechaSolo(date: string | Date): string {
  // Strings YYYY-MM-DD se parsean como medianoche UTC → en AR (-3) muestran el día anterior.
  // Forzar mediodía evita el desfase para cualquier zona entre UTC-12 y UTC+11.
  const d = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(date + "T12:00:00")
    : new Date(date);
  return d.toLocaleDateString("es-AR", {
    timeZone: TZ, day: "2-digit", month: "2-digit", year: "2-digit",
  });
}

export function fmtFechaLarga(date: string | Date): string {
  return new Date(date).toLocaleDateString("es-AR", {
    timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export function fmtFechaHora(date: string | Date): string {
  return new Date(date).toLocaleString("es-AR", {
    timeZone: TZ, day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function fmtHora(date: string | Date): string {
  return new Date(date).toLocaleString("es-AR", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit",
  });
}

/** Retorna la fecha actual en zona Argentina */
export function ahoraAR(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
}

/** "YYYY-MM" del instante dado, en hora Argentina (no la del servidor, que en Vercel es UTC). */
export function mesAR(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-CA", { timeZone: TZ }).slice(0, 7);
}

/** Límites ISO de un año calendario en hora Argentina (UTC-3 fijo, sin horario de verano). */
export function rangoAnioAR(anio: number): { desde: string; hasta: string } {
  return { desde: `${anio}-01-01T00:00:00-03:00`, hasta: `${anio}-12-31T23:59:59.999-03:00` };
}

/** "YYYY-MM" con mes 01–12, o null. Los ?mes= vienen de la URL: nunca asumir el formato. */
export function mesValido(mes: string | null | undefined): string | null {
  return mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : null;
}

/** Año de 4 dígitos, o null. */
export function anioValido(anio: string | null | undefined): number | null {
  return anio && /^\d{4}$/.test(anio) ? Number(anio) : null;
}
