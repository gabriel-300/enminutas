import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { MuestrasClient } from "./muestras-client";

export const metadata: Metadata = { title: "Muestras — Admin En Minutas" };
export const revalidate = 0;

export default async function MuestrasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = user.app_metadata?.role as string | undefined;
  if (!["admin", "vendedor", "produccion"].includes(role ?? "")) redirect("/admin/dashboard");

  const db = createAdminClient() as any;

  const { data: rawMuestras } = await db
    .from("orders")
    .select(`
      id, order_number, status, created_at, despachado_at,
      muestra_destinatario, guest_email, guest_phone, notes,
      lines:order_lines (product_id, quantity, product_snapshot)
    `)
    .eq("channel", "muestra")
    .order("created_at", { ascending: false });

  const muestras = (rawMuestras ?? []) as any[];

  const pendientes = muestras.filter((m) => m.status === "aprobado").length;
  const enProd     = muestras.filter((m) => m.status === "enviado_prod").length;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold font-display text-neutral-900">Muestras</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {muestras.length} muestra{muestras.length !== 1 ? "s" : ""}
            {pendientes > 0 && ` · ${pendientes} pendiente${pendientes !== 1 ? "s" : ""}`}
            {enProd     > 0 && ` · ${enProd} en producción`}
          </p>
        </div>
        {["admin", "vendedor"].includes(role ?? "") && (
          <Link
            href="/admin/muestras/nueva"
            className="shrink-0 px-4 py-2 rounded-xl bg-tierra-700 text-white text-sm font-medium hover:bg-tierra-800 transition-colors"
          >
            + Nueva muestra
          </Link>
        )}
      </div>

      <MuestrasClient
        muestras={muestras}
        esAdmin={role === "admin"}
        esProduccion={role === "produccion" || role === "admin"}
      />
    </div>
  );
}
