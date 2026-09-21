import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { VendedorDashboard } from "./_views/vendedor";
import { ProduccionDashboard } from "./_views/produccion";
import { DistribucionDashboard } from "./_views/distribucion";
import { AdminDashboard } from "./_views/admin";

export const revalidate = 0;

// Manifest dinámico: el preventista instala esta página como app propia
// ("EM Preventista"), en vez de heredar el manifest global de repartidor.
export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = (user?.app_metadata?.role as string | undefined) ?? null;

  if (role === "vendedor") {
    return { title: "Dashboard — Admin En Minutas", manifest: "/preventista-manifest.json" };
  }
  return { title: "Dashboard — Admin En Minutas" };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = user.app_metadata?.role as string | undefined;

  if (role === "vendedor")     return <VendedorDashboard user={user} />;
  if (role === "produccion")   return <ProduccionDashboard />;
  if (role === "distribucion") return <DistribucionDashboard user={user} />;

  // El layout de /admin ya deja pasar sólo staff; el resto de los roles ve el dashboard de admin.
  return <AdminDashboard />;
}
