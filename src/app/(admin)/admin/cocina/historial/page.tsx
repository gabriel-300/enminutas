import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Historial de producción — Cocina En Minutas" };
export const revalidate = 0;

const fmt = (n: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

function fmtMes(key: string) {
  const [y, m] = key.split("-");
  return `${MESES[parseInt(m, 10) - 1]} ${y}`;
}

function fmtFecha(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default async function HistorialProduccionPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const mesParam = sp.mes ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [yearStr, monthStr] = mesParam.split("-");
  const year  = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const desde = new Date(year, month - 1, 1).toISOString();
  const hasta = new Date(year, month, 0, 23, 59, 59).toISOString();

  const supabase    = await createClient();
  const adminClient = createAdminClient() as any;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Movimientos de stock tipo producción del mes
  const { data: rawMovs } = await adminClient
    .from("stock_movements")
    .select("id, product_id, qty, notes, created_at, product:products!product_id (name, sku)")
    .eq("type", "produccion")
    .gte("created_at", desde)
    .lte("created_at", hasta)
    .order("created_at", { ascending: false });

  const movs = (rawMovs ?? []) as any[];

  // Resumen por producto
  const resumenMap: Record<string, { name: string; sku: string; totalCajas: number; lotes: number }> = {};
  for (const m of movs) {
    const pid = m.product_id;
    if (!resumenMap[pid]) resumenMap[pid] = {
      name: m.product?.name ?? "—", sku: m.product?.sku ?? "—", totalCajas: 0, lotes: 0,
    };
    resumenMap[pid].totalCajas += Math.abs(Number(m.qty));
    resumenMap[pid].lotes++;
  }
  const resumen = Object.values(resumenMap).sort((a, b) => b.totalCajas - a.totalCajas);
  const totalCajasMes = resumen.reduce((s, r) => s + r.totalCajas, 0);

  // Navegación de mes
  function prevMes() {
    return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  }
  function nextMes() {
    if (year === now.getFullYear() && month === now.getMonth() + 1) return null;
    return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  }
  const next = nextMes();

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/cocina" className="text-sm text-neutral-400 hover:text-neutral-700 mb-2 inline-block">
            ← Cocina
          </Link>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Historial de producción</h1>
          <p className="text-sm text-neutral-500 mt-1">Lotes producidos registrados en el stock</p>
        </div>

        {/* Selector de mes */}
        <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-xl px-1 py-1">
          <Link href={`?mes=${prevMes()}`}
            className="size-7 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 text-sm !no-underline">
            ‹
          </Link>
          <span className="px-3 text-sm font-medium text-neutral-800 min-w-[130px] text-center">
            {fmtMes(mesParam)}
          </span>
          {next ? (
            <Link href={`?mes=${next}`}
              className="size-7 flex items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 text-sm !no-underline">
              ›
            </Link>
          ) : (
            <span className="size-7 flex items-center justify-center text-neutral-200 text-sm">›</span>
          )}
        </div>
      </div>

      {movs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
          <p className="text-neutral-400 text-sm">Sin producción registrada en {fmtMes(mesParam)}.</p>
          <p className="text-xs text-neutral-300 mt-1">Los lotes se registran desde Cocina / Stock → Registrar lote.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center">
              <p className="text-2xl font-semibold font-display text-neutral-900">{fmt(totalCajasMes)}</p>
              <p className="text-xs text-neutral-400 mt-1">Cajas producidas</p>
            </div>
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center">
              <p className="text-2xl font-semibold font-display text-neutral-900">{movs.length}</p>
              <p className="text-xs text-neutral-400 mt-1">Lotes registrados</p>
            </div>
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 text-center">
              <p className="text-2xl font-semibold font-display text-neutral-900">{resumen.length}</p>
              <p className="text-xs text-neutral-400 mt-1">Productos distintos</p>
            </div>
          </div>

          {/* Resumen por producto */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-sm font-semibold text-neutral-700">Por producto</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-center">Lotes</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Cajas totales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {resumen.map((r) => (
                  <tr key={r.sku} className="hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-neutral-900">{r.name}</p>
                      <p className="text-xs text-neutral-400 font-mono">{r.sku}</p>
                    </td>
                    <td className="px-5 py-3 text-center text-neutral-500">{r.lotes}</td>
                    <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">{fmt(r.totalCajas)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-neutral-200 bg-neutral-50">
                  <td colSpan={2} className="px-5 py-3 text-xs font-semibold text-neutral-500 text-right">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-neutral-900 tabular-nums">{fmt(totalCajasMes)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Detalle cronológico */}
          <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <p className="text-sm font-semibold text-neutral-700">Detalle cronológico</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left">
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400">Fecha</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400">Producto</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400 text-right">Cajas</th>
                  <th className="px-5 py-3 text-xs font-medium text-neutral-400">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {movs.map((m) => (
                  <tr key={m.id} className="hover:bg-neutral-50">
                    <td className="px-5 py-3 text-xs text-neutral-400 tabular-nums whitespace-nowrap">
                      {fmtFecha(m.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-medium text-neutral-800">{m.product?.name ?? "—"}</p>
                      <p className="text-xs text-neutral-400 font-mono">{m.product?.sku ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-neutral-900 tabular-nums">
                      {fmt(Math.abs(Number(m.qty)))}
                    </td>
                    <td className="px-5 py-3 text-xs text-neutral-500">{m.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
