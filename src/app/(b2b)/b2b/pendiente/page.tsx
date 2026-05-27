import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Cuenta en revisión — En Minutas" };

export default async function PendientePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("b2b_status")
    .eq("id", user.id)
    .single();

  const status = (profile as any)?.b2b_status;
  if (status === "activo") redirect("/b2b/catalogo");

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 p-8 text-center">
        <div className="size-14 rounded-full bg-warning-bg flex items-center justify-center mx-auto mb-5">
          <svg className="size-7 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold font-display text-neutral-900 mb-2">
          {status === "inactivo" ? "Cuenta desactivada" : "Cuenta en revisión"}
        </h1>

        <p className="text-sm text-neutral-500 leading-relaxed">
          {status === "inactivo"
            ? "Tu cuenta B2B fue desactivada. Contactate con nosotros para más información."
            : "Estamos revisando tu solicitud. Te avisaremos por email cuando tu cuenta esté habilitada."
          }
        </p>

        <p className="mt-6 text-sm text-neutral-400">
          ¿Consultas?{" "}
          <a
            href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5493764000000"}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-tierra-700 hover:underline font-medium"
          >
            Escribinos por WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}
