"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const NAV_ITEMS = [
  { href: "/admin/dashboard",      label: "Dashboard",     roles: ["admin", "vendedor", "produccion"] },
  { href: "/admin/pedidos",        label: "Pedidos",       roles: ["admin", "vendedor"] },
  { href: "/admin/preventista",    label: "Preventista",   roles: ["admin", "vendedor"] },
  { href: "/admin/produccion",     label: "Producción",    roles: ["admin", "vendedor", "produccion"] },
  { href: "/admin/cocina",         label: "Cocina / Stock",  roles: ["admin", "vendedor", "produccion"] },
  { href: "/admin/cocina/recetas",       label: "Recetas",        roles: ["admin", "produccion"] },
  { href: "/admin/cocina/planificador",  label: "Planificador",   roles: ["admin", "produccion"] },
  { href: "/admin/cocina/compras",       label: "Lista de compras", roles: ["admin", "produccion"] },
  { href: "/admin/distribucion",   label: "Distribución",  roles: ["admin", "vendedor", "distribucion"] },
  { href: "/admin/productos",    label: "Productos",     roles: ["admin"] },
  { href: "/admin/descuentos",   label: "Descuentos vol.", roles: ["admin"] },
  { href: "/admin/categorias",   label: "Categorías",    roles: ["admin"] },
  { href: "/admin/zonas",        label: "Zonas",         roles: ["admin"] },
  { href: "/admin/clientes-b2b", label: "Clientes B2B",  roles: ["admin", "vendedor"] },
  { href: "/admin/clientes-b2c", label: "Clientes B2C",  roles: ["admin", "vendedor"] },
  { href: "/admin/reportes",     label: "Reportes",      roles: ["admin", "vendedor"] },
  { href: "/admin/staff",        label: "Staff",         roles: ["admin"] },
];

const ROLE_LABEL: Record<string, string> = {
  admin:        "Administrador",
  vendedor:     "Vendedor",
  produccion:   "Producción",
  distribucion: "Distribución",
};

export function AdminNav({ role, email, name }: { role: string | null; email: string | null; name: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const visibleItems = role
    ? NAV_ITEMS.filter((item) => item.roles.includes(role))
    : NAV_ITEMS;

  return (
    <aside className="w-60 bg-white border-r border-neutral-200 flex flex-col shrink-0">
      <div className="p-5 border-b border-neutral-200">
        <Link href="/admin/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="size-8 rounded-lg bg-tierra-700 text-white flex items-center justify-center font-display font-bold text-sm">
            EM
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900 font-display">En Minutas</p>
            <p className="text-xs text-neutral-400">
              {role ? (ROLE_LABEL[role] ?? role) : "Panel admin"}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {visibleItems.map(({ href, label }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                active
                  ? "bg-tierra-50 text-tierra-700 font-medium"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-200 space-y-2">
        <div>
          <p className="text-xs font-medium text-neutral-700 truncate">{name ?? email ?? "—"}</p>
          {name && <p className="text-xs text-neutral-400 truncate">{email}</p>}
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left text-xs text-neutral-400 hover:text-neutral-700 transition-colors py-1"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
