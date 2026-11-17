import { redirect } from "next/navigation";

// /contacto daba 404 — INSTRUCCIONES.md §7 pide redirigirla a Nosotros.
export default function ContactoPage() {
  redirect("/nosotros");
}
