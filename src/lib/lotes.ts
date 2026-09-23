// Numeración global de lotes: correlativo único entre producción y carga manual.
export async function generarNumeroLote(db: any): Promise<string> {
  const { data } = await db
    .from("lotes")
    .select("numero_lote")
    .order("created_at", { ascending: false })
    .limit(100);

  let maxNum = 0;
  for (const row of data ?? []) {
    const nro = row.numero_lote as string;
    // Extraer el número final del lote (soporta formatos "0045", "L-2026-045", "P-20260902-001", etc.)
    const match = nro.match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxNum) maxNum = n;
    }
  }

  return String(maxNum + 1).padStart(4, "0");
}
