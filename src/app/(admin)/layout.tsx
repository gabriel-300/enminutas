import { createClient } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { ChatWidget } from "@/components/admin/chat-widget";
import { getAlertasCount } from "@/lib/alertas-count";
import { redirect } from "next/navigation";
import { Nunito } from "next/font/google";

// Tipografía del panel: Nunito (identidad índigo unificada del sistema). Se
// carga acá, no en el layout raíz, para que el sitio público y la tienda no
// descarguen esta fuente.
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", display: "swap" });

const STAFF_ROLES = ["admin", "vendedor", "produccion", "distribucion", "caja"];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role  = (user.app_metadata?.role as string) ?? null;
  if (!role || !STAFF_ROLES.includes(role)) redirect("/b2b/catalogo");

  const email = user.email ?? null;
  const name  = (user.user_metadata?.full_name as string | null) ?? null;

  const alertasCount = role === "admin" ? await getAlertasCount() : 0;

  return (
    <div className={`admin-panel ${nunito.variable} flex min-h-screen flex-col md:flex-row bg-neutral-50`}>
      <AdminNav role={role} email={email} name={name} alertasCount={alertasCount} />
      <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      <ChatWidget />
    </div>
  );
}
