import { Nunito } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { Header } from "./header";
import { Footer } from "./footer";
import { WhatsAppFab } from "./whatsapp-fab";
import s from "@/styles/site.module.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

// Encabezado, pie y botón flotante son globales a todas las páginas del
// sitio público (home, catálogo, producto, nosotros) — ver INSTRUCCIONES.md §2.
export async function SiteShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contenido_web")
    .select("clave, valor")
    .in("clave", ["contacto_whatsapp", "contacto_email", "contacto_instagram"]);
  const cms = Object.fromEntries((data ?? []).map((r) => [r.clave, r.valor ?? ""]));
  const whatsapp = cms.contacto_whatsapp || undefined;

  return (
    <div className={`site-public ${nunito.className} ${s.root}`}>
      <Header whatsapp={whatsapp} />
      <main>{children}</main>
      <Footer whatsapp={whatsapp} email={cms.contacto_email || undefined} instagram={cms.contacto_instagram || undefined} />
      <WhatsAppFab whatsapp={whatsapp} />
    </div>
  );
}
