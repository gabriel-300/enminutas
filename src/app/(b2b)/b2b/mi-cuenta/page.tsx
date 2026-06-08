import type { Metadata } from "next";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Mi cuenta — Portal B2B En Minutas" };
export const revalidate = 0;

const CANAL_LABEL: Record<string, string> = {
  dist:   "Distribuidor",
  gastro: "Gastronomía",
  min:    "Minorista",
};

export default async function MiCuentaPage() {
  const supabase     = await createClient();
  const adminClient  = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profileRaw }, { data: { user: authUser } }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, canal, b2b_status, zona:delivery_zones!zona_id (id, name, flete_kg)")
      .eq("id", user.id)
      .single(),
    adminClient.auth.admin.getUserById(user.id),
  ]);

  const profile = profileRaw as any;
  if (!profile || profile.b2b_status !== "activo") redirect("/b2b/pendiente");

  const canal  = profile.canal as string | null;
  const zona   = profile.zona as { id: string; name: string; flete_kg: number | null } | null;

  const fmtPrecio = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-5 md:py-8">
      <h1 className="text-xl md:text-2xl font-semibold font-display text-neutral-900 mb-5 md:mb-6">Mi cuenta</h1>

      {/* Datos personales */}
      <section className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 mb-4">
        <div className="px-5 py-4">
          <p className="text-xs text-neutral-400 mb-0.5">Nombre</p>
          <p className="text-sm font-medium text-neutral-900">{profile.full_name ?? "—"}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-neutral-400 mb-0.5">Email</p>
          <p className="text-sm text-neutral-900">{authUser?.email ?? user.email ?? "—"}</p>
        </div>
      </section>

      {/* Datos comerciales */}
      <section className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 mb-4">
        <div className="px-5 py-4">
          <p className="text-xs text-neutral-400 mb-0.5">Canal de compra</p>
          <p className="text-sm font-medium text-neutral-900">
            {canal ? CANAL_LABEL[canal] ?? canal : "—"}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-neutral-400 mb-0.5">Zona de entrega</p>
          <p className="text-sm font-medium text-neutral-900">{zona?.name ?? "—"}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-neutral-400 mb-0.5">Flete por kg</p>
          <p className="text-sm font-medium text-neutral-900">
            {zona?.flete_kg != null ? fmtPrecio(zona.flete_kg) + " / kg" : "—"}
          </p>
        </div>
        <div className="px-5 py-4">
          <p className="text-xs text-neutral-400 mb-0.5">Estado de cuenta</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
            <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
            Activo
          </span>
        </div>
      </section>

      {/* Datos bancarios para transferencia */}
      {(process.env.NEXT_PUBLIC_BANK_CBU || process.env.NEXT_PUBLIC_BANK_ALIAS) && (
        <section className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 mb-4">
          <div className="px-5 py-3 bg-neutral-50 rounded-t-2xl">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Datos bancarios para transferencia</p>
          </div>
          {process.env.NEXT_PUBLIC_BANK_HOLDER && (
            <div className="px-5 py-4">
              <p className="text-xs text-neutral-400 mb-0.5">Titular</p>
              <p className="text-sm font-medium text-neutral-900">{process.env.NEXT_PUBLIC_BANK_HOLDER}</p>
            </div>
          )}
          {process.env.NEXT_PUBLIC_BANK_CBU && (
            <div className="px-5 py-4">
              <p className="text-xs text-neutral-400 mb-0.5">CBU</p>
              <p className="text-sm font-mono text-neutral-900 tracking-wider">{process.env.NEXT_PUBLIC_BANK_CBU}</p>
            </div>
          )}
          {process.env.NEXT_PUBLIC_BANK_ALIAS && (
            <div className="px-5 py-4">
              <p className="text-xs text-neutral-400 mb-0.5">Alias</p>
              <p className="text-sm font-mono text-neutral-900">{process.env.NEXT_PUBLIC_BANK_ALIAS}</p>
            </div>
          )}
        </section>
      )}

      <p className="text-xs text-neutral-400 text-center">
        Para modificar tus datos contactá a tu agente comercial.
      </p>
    </div>
  );
}
