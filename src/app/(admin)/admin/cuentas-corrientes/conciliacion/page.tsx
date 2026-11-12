import { fmt } from "@/lib/format";
import { fmtFechaSolo } from "@/lib/fecha";
import { conciliar, fechaCorteDeDescripcion } from "@/lib/conciliacion";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = { title: "Conciliación con planilla de Alex — Admin" };
export const revalidate = 0;

const TZ = "America/Argentina/Buenos_Aires";
const aFechaAR = (ts: string) => new Date(ts).toLocaleDateString("en-CA", { timeZone: TZ });

// Mismos estados que usa Deuda clientes (+ liquidado: a la fecha de corte pudo estar impago).
const ESTADOS_DEUDA = ["delivered", "despachado", "entrega_parcial", "liquidado"];

export default async function ConciliacionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "admin") redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const { data: importados } = await db
    .from("cc_movimientos")
    .select("cliente_id, monto, descripcion")
    .like("referencia", "IMPORT-%");

  const saldosAlex = ((importados ?? []) as any[]).map((m) => ({ cliente_id: m.cliente_id as string, monto: Number(m.monto) }));
  // La fecha de corte sale de la descripción de la importación ("... al 14/10/2026").
  const corte = ((importados ?? []) as any[]).map((m) => fechaCorteDeDescripcion(m.descripcion)).find(Boolean) ?? null;

  if (!corte || saldosAlex.length === 0) {
    return (
      <div className="p-4 md:px-10 md:py-8 md:pb-16">
        <Volver />
        <h1 className="text-2xl font-bold font-display text-neutral-900">Conciliación con la planilla de Alex</h1>
        <p className="text-sm text-neutral-600 mt-3">No hay saldos importados de la planilla de cuentas corrientes.</p>
      </div>
    );
  }

  const [{ data: ordenes }, { data: cobros }, { data: perfiles }, { data: cuentas }] = await Promise.all([
    db.from("orders")
      .select("id, customer_id, total, entregado_at, created_at")
      .eq("channel", "b2b_mayorista").not("customer_id", "is", null).in("status", ESTADOS_DEUDA).limit(10000),
    db.from("pagos").select("order_id, cliente_id, monto, fecha, sin_factura").limit(10000),
    db.from("profiles").select("id, full_name"),
    db.from("b2b_accounts").select("profile_id, business_name"),
  ]);

  const nombres = new Map<string, string>();
  for (const p of (perfiles ?? []) as any[]) nombres.set(p.id, p.full_name ?? "Sin nombre");
  for (const c of (cuentas ?? []) as any[]) if (c.business_name) nombres.set(c.profile_id, c.business_name);

  const filas = conciliar({
    corte,
    saldosAlex,
    pedidos: ((ordenes ?? []) as any[]).map((o) => ({
      id: o.id, cliente_id: o.customer_id, total: Number(o.total), fecha: aFechaAR(o.entregado_at ?? o.created_at),
    })),
    pagos: ((cobros ?? []) as any[]).map((p) => ({
      order_id: p.order_id, cliente_id: p.cliente_id, monto: Number(p.monto), fecha: p.fecha, sin_factura: p.sin_factura,
    })),
  });

  const totAlex = filas.reduce((s, f) => s + f.saldoAlex, 0);
  const totSistema = filas.reduce((s, f) => s + f.deudaSistema, 0);
  const conDiferencia = filas.filter((f) => Math.abs(f.diferencia) > 1).length;

  return (
    <div className="p-4 md:px-10 md:py-8 md:pb-16">
      <Volver />
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-neutral-900">Conciliación con la planilla de Alex</h1>
        <p className="text-sm text-neutral-600 mt-1 max-w-3xl">
          Compara, por cliente, el saldo de la planilla de cuentas corrientes de Alex al {fmtFechaSolo(`${corte}T12:00:00`)} con la
          deuda que calcula el sistema a esa misma fecha (pedidos entregados menos cobros hasta el corte).
          Es un control: <strong>no se suma</strong> a Deuda clientes, porque los pedidos ya están contados ahí.
          Una diferencia suele ser un cobro que la planilla tiene y el sistema no (o al revés), o un pedido que figura en uno solo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Tarjeta titulo="Saldo según planilla de Alex" valor={fmt(totAlex)} />
        <Tarjeta titulo="Deuda según el sistema al corte" valor={fmt(totSistema)} />
        <Tarjeta titulo="Clientes con diferencia" valor={String(conDiferencia)} />
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-100">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-600">Cliente</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-600">Planilla de Alex</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-600">Sistema</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-600">Diferencia</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-neutral-600">Pedidos con saldo</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {filas.map((f) => (
              <tr key={f.cliente_id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-neutral-900">{nombres.get(f.cliente_id) ?? "Sin nombre"}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-neutral-700">{fmt(f.saldoAlex)}</td>
                <td className="px-5 py-3.5 text-right tabular-nums text-neutral-700">{fmt(f.deudaSistema)}</td>
                <td className={`px-5 py-3.5 text-right tabular-nums font-semibold ${
                  Math.abs(f.diferencia) <= 1 ? "text-success" : "text-warning"
                }`}>
                  {Math.abs(f.diferencia) <= 1 ? "coincide" : `${f.diferencia > 0 ? "+" : "−"}${fmt(Math.abs(f.diferencia))}`}
                </td>
                <td className="px-5 py-3.5 text-right tabular-nums text-neutral-600">{f.pedidos || "—"}</td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/admin/clientes-b2b/${f.cliente_id}`} className="text-xs font-medium text-brand-700 hover:underline">
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-neutral-600 mt-3 max-w-3xl">
        Diferencia = planilla de Alex − sistema. Positiva: la planilla dice que deben más que el sistema; negativa: el sistema muestra más deuda
        que la planilla (por ejemplo, cobros que Alex conoce y todavía no están cargados).
      </p>
    </div>
  );
}

function Volver() {
  return (
    <Link href="/admin/cuentas-corrientes" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline mb-3">
      <ArrowLeft className="size-3" /> Deuda de clientes
    </Link>
  );
}

function Tarjeta({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5">
      <p className="text-xs text-neutral-600 mb-1">{titulo}</p>
      <p className="text-2xl font-bold text-neutral-900 tabular-nums">{valor}</p>
    </div>
  );
}
