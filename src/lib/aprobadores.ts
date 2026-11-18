// Quién puede aprobar movimientos de dinero que requieren una segunda persona (órdenes de pago a
// proveedores, ajustes internos). Si APROBADORES_PAGOS (emails separados por coma) está definida,
// solo esos administradores pueden aprobar; si no está definida, cualquier administrador puede.
export function puedeAprobar(email: string | undefined): boolean {
  const lista = (process.env.APROBADORES_PAGOS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (lista.length === 0) return true;
  return !!email && lista.includes(email.toLowerCase());
}

export function aprobadoresConfigurados(): boolean {
  return !!process.env.APROBADORES_PAGOS?.trim();
}
