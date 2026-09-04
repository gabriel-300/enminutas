"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function actualizarCampo(clave: string, valor: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("contenido_web")
    .update({ valor, actualizado_en: new Date().toISOString() })
    .eq("clave", clave);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function guardarSeccion(entries: { clave: string; valor: string }[]) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  for (const { clave, valor } of entries) {
    await supabase
      .from("contenido_web")
      .update({ valor, actualizado_en: now })
      .eq("clave", clave);
  }
  revalidatePath("/");
}
