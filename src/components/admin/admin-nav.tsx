"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

// ── Icono SVG helper ──────────────────────────────────────────────────────────
function Icon({ children, className = "size-4 shrink-0" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  dashboard: (
    <Icon>
      <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </Icon>
  ),
  pedidos: (
    <Icon>
      <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </Icon>
  ),
  preventista: (
    <Icon>
      <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </Icon>
  ),
  produccion: (
    <Icon>
      <path d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
    </Icon>
  ),
  cocina: (
    <Icon>
      <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </Icon>
  ),
  recetas: (
    <Icon>
      <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </Icon>
  ),
  planificador: (
    <Icon>
      <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </Icon>
  ),
  compras: (
    <Icon>
      <path d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
    </Icon>
  ),
  historial: (
    <Icon>
      <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Icon>
  ),
  distribucion: (
    <Icon>
      <path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </Icon>
  ),
  reportes: (
    <Icon>
      <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </Icon>
  ),
  productos: (
    <Icon>
      <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </Icon>
  ),
  categorias: (
    <Icon>
      <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path d="M6 6h.008v.008H6V6z" />
    </Icon>
  ),
  zonas: (
    <Icon>
      <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </Icon>
  ),
  descuentos: (
    <Icon>
      <path d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185zM9.75 9h.008v.008H9.75V9zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 4.5h.008v.008h-.008V13.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </Icon>
  ),
  clientesB2B: (
    <Icon>
      <path d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </Icon>
  ),
  clientesB2C: (
    <Icon>
      <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </Icon>
  ),
  staff: (
    <Icon>
      <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </Icon>
  ),
};

// ── Estructura del nav ────────────────────────────────────────────────────────
type NavItem = {
  href:   string;
  label:  string;
  roles:  string[];
  icon:   keyof typeof ICONS;
  sub?:   boolean;
};

type Separator = {
  type:  "separator";
  label: string;
  roles: string[];
};

type Item = NavItem | Separator;

const NAV: Item[] = [
  // ── Operación ────────────────────────────────────────────────────────────
  { href: "/admin/dashboard",             label: "Dashboard",        roles: ["admin", "vendedor", "produccion", "distribucion"], icon: "dashboard" },
  { href: "/admin/pedidos",               label: "Pedidos",          roles: ["admin", "vendedor"],                               icon: "pedidos" },
  { href: "/admin/preventista",           label: "Preventista",      roles: ["admin", "vendedor"],                               icon: "preventista" },
  { href: "/admin/produccion",            label: "Producción",       roles: ["admin", "produccion"],                             icon: "produccion" },
  { href: "/admin/cocina",                label: "Cocina / Stock",   roles: ["admin", "produccion"],                             icon: "cocina" },
  { href: "/admin/cocina/recetas",        label: "Recetas",          roles: ["admin", "produccion"],                             icon: "recetas",     sub: true },
  { href: "/admin/cocina/planificador",   label: "Planificador",     roles: ["admin", "produccion"],                             icon: "planificador", sub: true },
  { href: "/admin/cocina/compras",        label: "Lista de compras", roles: ["admin", "produccion"],                             icon: "compras",     sub: true },
  { href: "/admin/cocina/historial",      label: "Historial prod.",  roles: ["admin", "produccion"],                             icon: "historial",   sub: true },
  { href: "/admin/distribucion",          label: "Distribución",     roles: ["admin", "distribucion"],                           icon: "distribucion" },
  { href: "/admin/reportes",              label: "Reportes",         roles: ["admin"],                                           icon: "reportes" },

  // ── Separador Configuración ───────────────────────────────────────────────
  { type: "separator", label: "Configuración", roles: ["admin"] },

  { href: "/admin/productos",             label: "Productos",        roles: ["admin"], icon: "productos" },
  { href: "/admin/categorias",            label: "Categorías",       roles: ["admin"], icon: "categorias" },
  { href: "/admin/zonas",                 label: "Zonas",            roles: ["admin"], icon: "zonas" },
  { href: "/admin/descuentos",            label: "Descuentos vol.",  roles: ["admin"], icon: "descuentos" },
  { href: "/admin/clientes-b2b",          label: "Clientes B2B",    roles: ["admin", "vendedor"], icon: "clientesB2B" },
  { href: "/admin/clientes-b2c",          label: "Clientes B2C",    roles: ["admin"],             icon: "clientesB2C" },
  { href: "/admin/staff",                 label: "Staff",            roles: ["admin"],             icon: "staff" },
];

const ROLE_LABEL: Record<string, string> = {
  admin:        "Administrador",
  vendedor:     "Vendedor",
  produccion:   "Producción",
  distribucion: "Distribución",
};

export function AdminNav({ role, email, name }: { role: string | null; email: string | null; name: string | null }) {
  const pathname = usePathname();
  const router   = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const visibleItems = NAV.filter((item) =>
    item.roles.includes(role ?? "")
  );

  return (
    <aside className="w-60 bg-white border-r border-neutral-200 flex flex-col shrink-0">
      {/* Logo */}
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

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {visibleItems.map((item, i) => {
          // Separador
          if ("type" in item) {
            return (
              <div key={i} className="pt-3 pb-1">
                <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
                  {item.label}
                </p>
              </div>
            );
          }

          const active = item.sub
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg transition-colors ${
                item.sub ? "pl-7 pr-3 py-1.5" : "px-3 py-2"
              } ${
                active
                  ? "bg-tierra-50 text-tierra-700 font-medium"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              <span className={active ? "text-tierra-700" : "text-neutral-400"}>
                {ICONS[item.icon]}
              </span>
              <span className={item.sub ? "text-xs" : "text-sm"}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
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
