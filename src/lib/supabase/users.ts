import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";

const PER_PAGE = 1000;

// auth.admin.listUsers devuelve UNA página (máx. 1000). Antes cada pantalla pedía una sola
// página y, con más usuarios, el resto se perdía sin aviso.
//
// Ojo: la paginación de GoTrue en este proyecto NO es confiable (medido con 64 usuarios:
// con páginas de 2, 5, 10 o 50 repite usuarios y se saltea otros; sólo una llamada de 1000
// es exacta). Por eso: con <= 1000 usuarios es una única llamada (exacta); con más se
// pagina, se deduplica por id y, si falta alguno, se deja un error en el log.
// Si Supabase falla lanza: mejor un error visible que una lista vacía que parece real.
export async function listAllUsers(perPage = PER_PAGE): Promise<User[]> {
  const admin = createAdminClient();
  const byId = new Map<string, User>();
  let total = 0;

  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`No se pudo listar usuarios: ${error.message}`);
    total = data.total ?? total;
    for (const u of data.users) byId.set(u.id, u);
    if (!data.nextPage || data.users.length === 0) break;
  }

  if (byId.size < total) {
    console.error(
      `listAllUsers: la paginación devolvió ${byId.size} de ${total} usuarios; ` +
      "la lista puede estar incompleta (comisiones, vendedores y clientes).",
    );
  }

  return [...byId.values()];
}
