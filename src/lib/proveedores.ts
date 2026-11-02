// Lógica pura del módulo de pagos a proveedores (sin acceso a base).

export type FacturaPendiente = { id: string; saldo: number };
export type Imputacion = { recepcionId: string; monto: number };

const redondear = (n: number) => Math.round(n * 100) / 100;

// Reparte un pago entre las facturas elegidas, en el orden recibido (el llamador las ordena
// por vencimiento). Cada una recibe hasta su saldo; lo que sobra queda "a cuenta".
export function imputarPago(
  monto: number,
  pendientes: FacturaPendiente[],
): { imputaciones: Imputacion[]; aCuenta: number } {
  let resto = redondear(monto);
  const imputaciones: Imputacion[] = [];
  for (const f of pendientes) {
    if (resto <= 0) break;
    const saldo = redondear(Math.max(f.saldo, 0));
    if (saldo <= 0) continue;
    const aplicado = Math.min(resto, saldo);
    imputaciones.push({ recepcionId: f.id, monto: aplicado });
    resto = redondear(resto - aplicado);
  }
  return { imputaciones, aCuenta: resto };
}

// Fecha YYYY-MM-DD + N días, sin pasar por zonas horarias (mediodía UTC).
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export type EstadoVencimiento = "vencida" | "por_vencer" | "al_dia";

// "por_vencer" = vence dentro de los próximos 7 días (incluido hoy).
export function estadoVencimiento(vencimiento: string, hoy: string): EstadoVencimiento {
  if (vencimiento < hoy) return "vencida";
  if (vencimiento <= sumarDias(hoy, 7)) return "por_vencer";
  return "al_dia";
}

// Misma clave que usa la migración para unificar nombres: sin acentos, signos ni espacios y
// sin sufijo societario. "El Abasto" y "el Abasto S.R.L." dan la misma clave.
export function claveProveedor(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/(srl|sas|sa)$/, "");
}

export function normalizarCuit(cuit: string | null | undefined): string | null {
  const dig = (cuit ?? "").replace(/\D/g, "");
  if (!dig) return null;
  return dig.length === 11 ? `${dig.slice(0, 2)}-${dig.slice(2, 10)}-${dig.slice(10)}` : dig;
}
