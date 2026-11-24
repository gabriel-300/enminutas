"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, ShoppingBag, Bell,
  Settings2, Truck,
  Users, UserCheck, GitBranch, BarChart2, TrendingUp, Target, Tag, Gift,
  Package, Layers, BookOpen, Calendar, ShoppingCart, Clock, Database,
  FileText, CreditCard, RotateCcw, CheckSquare, DollarSign, Wallet, ClipboardList,
  Settings, HelpCircle, ChefHat, Factory, Globe, Scale, Building2,
  ChevronLeft, ChevronRight, ChevronDown, Menu, X,
} from "lucide-react";

type NavEntry = {
  href:  string;
  label: string;
  icon:  React.ElementType;
  roles: string[];
  badge?: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  admin:        "Administrador",
  vendedor:     "Vendedor",
  produccion:   "Producción",
  distribucion: "Distribución",
  caja:         "Caja",
};

const SECTIONS: { label?: string; key?: string; items: NavEntry[] }[] = [
  {
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "vendedor", "produccion", "distribucion", "caja"] },
      { href: "/admin/pedidos",   label: "Pedidos",   icon: ShoppingBag,     roles: ["admin", "vendedor"] },
      { href: "/admin/alertas",   label: "Alertas",   icon: Bell,            roles: ["admin"], badge: true },
    ],
  },
  {
    label: "OPERACIONES",
    key:   "operaciones",
    items: [
      { href: "/admin/produccion",   label: "Producción",   icon: Settings2, roles: ["admin", "produccion"] },
      { href: "/admin/distribucion", label: "Distribución", icon: Truck,     roles: ["admin", "distribucion"] },
    ],
  },
  {
    label: "COMERCIAL",
    key:   "comercial",
    items: [
      { href: "/admin/clientes",        label: "Clientes",        icon: Users,     roles: ["admin", "vendedor"] },
      { href: "/admin/preventista",     label: "Preventista",     icon: UserCheck, roles: ["admin", "vendedor"] },
      { href: "/admin/pipeline",        label: "Pipeline",        icon: GitBranch, roles: ["admin", "vendedor"] },
      { href: "/admin/muestras",        label: "Muestras",        icon: Gift,      roles: ["admin", "vendedor"] },
      { href: "/admin/reportes",        label: "Reportes",        icon: BarChart2, roles: ["admin"] },
      { href: "/admin/rentabilidad",    label: "Rentabilidad",    icon: TrendingUp, roles: ["admin"] },
      { href: "/admin/objetivos",       label: "Objetivos",       icon: Target,    roles: ["admin"] },
      { href: "/admin/precios-cliente", label: "Precios cliente", icon: Tag,       roles: ["admin"] },
      { href: "/admin/costos-precios",  label: "Costos vs precios", icon: Scale,   roles: ["admin"] },
    ],
  },
  {
    label: "COCINA",
    key:   "cocina",
    items: [
      { href: "/admin/cocina",               label: "Cocina",           icon: ChefHat,      roles: ["admin", "produccion"] },
      { href: "/admin/stock",                label: "Stock",            icon: Package,      roles: ["admin", "produccion"] },
      { href: "/admin/lotes",                label: "Lotes",            icon: Layers,       roles: ["admin", "produccion"] },
      { href: "/admin/cocina/insumos",        label: "Insumos",          icon: Database,     roles: ["admin", "produccion"] },
      { href: "/admin/cocina/recetas",        label: "Recetas",          icon: BookOpen,     roles: ["admin", "produccion"] },
      { href: "/admin/cocina/produccion",    label: "Producción",       icon: Factory,      roles: ["admin", "produccion"] },
      { href: "/admin/cocina/planificador",  label: "Planificador",     icon: Calendar,     roles: ["admin", "produccion"] },
      { href: "/admin/cocina/recepciones",    label: "Recepciones",      icon: FileText,     roles: ["admin", "produccion"] },
      { href: "/admin/cocina/compras",       label: "Lista de compras", icon: ShoppingCart, roles: ["admin", "produccion"] },
      { href: "/admin/cocina/historial",     label: "Historial prod.",  icon: Clock,        roles: ["admin", "produccion"] },
    ],
  },
  {
    label: "SITIO WEB",
    key:   "sitio_web",
    items: [
      { href: "/admin/contenido",   label: "Contenido web", icon: Globe,   roles: ["admin"] },
      { href: "/admin/categorias",  label: "Categorías",    icon: Layers,  roles: ["admin"] },
    ],
  },
  {
    label: "ADMINISTRACIÓN",
    key:   "administracion",
    items: [
      { href: "/admin/facturacion",         label: "Facturación",      icon: FileText,    roles: ["admin"] },
      { href: "/admin/cuentas-corrientes",  label: "Deuda clientes", icon: CreditCard,  roles: ["admin"] },
      { href: "/admin/proveedores",         label: "Proveedores",      icon: Building2,   roles: ["admin", "caja"] },
      { href: "/admin/ajustes-internos",    label: "Ajustes internos", icon: ClipboardList, roles: ["admin"] },
      { href: "/admin/comisiones",          label: "Comisiones",       icon: Wallet,      roles: ["admin"] },
      { href: "/admin/devoluciones",        label: "Devoluciones",     icon: RotateCcw,   roles: ["admin"] },
      { href: "/admin/cheques",             label: "Cheques",          icon: CheckSquare, roles: ["admin"] },
      { href: "/admin/liquidaciones",       label: "Liquidaciones",    icon: DollarSign,  roles: ["admin"] },
    ],
  },
];

const BOTTOM_ITEMS: NavEntry[] = [
  { href: "/admin/configuracion", label: "Configuración", icon: Settings,    roles: ["admin"] },
  { href: "/admin/ayuda",         label: "Ayuda",         icon: HelpCircle,  roles: ["admin", "vendedor", "produccion", "distribucion", "caja"] },
];

const STORAGE_KEY   = "em_sidebar_collapsed";
const SECTIONS_KEY  = "em_sidebar_sections";

const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 focus-visible:rounded-[7px]";

function navItemClasses(active: boolean, col: boolean) {
  return cn(
    "flex items-center h-[34px] rounded-[7px] cursor-pointer select-none w-full min-w-0",
    "text-sm whitespace-nowrap no-underline transition-colors duration-100",
    FOCUS_RING,
    col ? "justify-center p-0" : "justify-start gap-2.5 px-2.5",
    active
      ? "bg-brand-300/16 text-white font-medium shadow-[inset_2px_0_0_var(--color-brand-300)]"
      : "text-brand-200 font-normal hover:bg-white/6 hover:text-white",
  );
}

export function AdminNav({
  role,
  email,
  name,
  alertasCount = 0,
}: {
  role:          string | null;
  email:         string | null;
  name:          string | null;
  alertasCount?: number;
}) {
  const pathname = usePathname();
  const router   = useRouter();

  const [collapsed, setCollapsed]               = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [ready, setReady]                       = useState(false);
  const [mobileOpen, setMobileOpen]             = useState(false);

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();

  useEffect(() => {
    const mobile = window.innerWidth < 1024;
    setCollapsed(mobile ? true : localStorage.getItem(STORAGE_KEY) === "true");
    try {
      const saved = JSON.parse(localStorage.getItem(SECTIONS_KEY) || "{}");
      setExpandedSections(saved);
    } catch {}
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      if (window.innerWidth >= 1024) localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const isCurrentlyExpanded = prev[key] !== false;
      const next = { ...prev, [key]: !isCurrentlyExpanded };
      try { localStorage.setItem(SECTIONS_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function handleSignOut() {
    try { await supabaseRef.current!.auth.signOut(); } catch {}
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  const userInitial = ((name || email || "U")[0] ?? "U").toUpperCase();
  const roleLabel   = ROLE_LABEL[role ?? ""] ?? "Panel admin";
  const W = collapsed ? 60 : 248;
  const transition = ready ? "width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)" : "none";

  function renderAside(col: boolean, mobile: boolean) {
    return (
        <aside
          className="bg-brand-950 flex flex-col overflow-hidden shrink-0"
          style={{
            width:         mobile ? "100%" : W,
            minWidth:      mobile ? 0 : W,
            height:        mobile ? "100%" : "100vh",
            position:      mobile ? "relative" : "sticky",
            top:           0,
            transition:    mobile ? "none" : transition,
          }}
        >
          {/* ── Marca ── */}
          <div className="flex items-center gap-2.5 px-3.5 py-4 border-b border-white/8 min-h-[62px] overflow-hidden shrink-0">
            <Image src="/logo.png" alt="En Minutas" width={32} height={40} priority className="w-8 h-10 min-w-8 shrink-0" />
            {!col && (
              <div className="min-w-0 overflow-hidden">
                <div className="text-sm font-semibold text-white whitespace-nowrap">En Minutas</div>
                <div className="text-xs text-brand-300 whitespace-nowrap">{roleLabel}</div>
              </div>
            )}
          </div>

          {/* ── Navegación ── */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2.5">
            {SECTIONS.map((section, si) => {
              const items = section.items.filter(i => i.roles.includes(role ?? ""));
              if (!items.length) return null;

              const key        = section.key ?? `s${si}`;
              const isExpanded = expandedSections[key] !== false;
              const showItems  = !section.label || col || isExpanded;

              return (
                <div key={si}>
                  {section.label && !col && (
                    <button
                      type="button"
                      onClick={() => toggleSection(key)}
                      className={cn(
                        "flex items-center justify-between w-full mt-2.5 px-2.5 pb-1 pt-2 cursor-pointer select-none bg-transparent border-none",
                        FOCUS_RING,
                      )}
                    >
                      <span className="text-xs font-semibold tracking-[0.06em] text-brand-300 uppercase whitespace-nowrap">
                        {section.label}
                      </span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 text-brand-300 shrink-0 transition-transform duration-150",
                          isExpanded ? "rotate-0" : "-rotate-90",
                        )}
                      />
                    </button>
                  )}

                  {showItems && items.map(item => {
                    const active = isActive(item.href);
                    const Icon   = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={col ? item.label : undefined}
                        className={navItemClasses(active, col)}
                        onClick={mobile ? () => setMobileOpen(false) : undefined}
                      >
                        <Icon className="w-4 h-4 min-w-4 shrink-0" strokeWidth={1.8} />
                        {!col && (
                          <>
                            <span className="flex-1 min-w-0 overflow-hidden text-ellipsis">
                              {item.label}
                            </span>
                            {item.badge && alertasCount > 0 && (
                              <span className="bg-danger-solid text-white text-xs font-semibold px-[7px] leading-[18px] rounded-full whitespace-nowrap shrink-0">
                                {alertasCount}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* ── Configuración + Ayuda (fijos abajo) ── */}
          <div className="px-3 py-2 border-t border-white/8 flex flex-col gap-px shrink-0">
            {BOTTOM_ITEMS.filter(i => i.roles.includes(role ?? "")).map(item => {
              const active = isActive(item.href);
              const Icon   = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={col ? item.label : undefined}
                  className={navItemClasses(active, col)}
                  onClick={mobile ? () => setMobileOpen(false) : undefined}
                >
                  <Icon className="w-4 h-4 min-w-4 shrink-0" strokeWidth={1.8} />
                  {!col && (
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* ── Footer de usuario ── */}
          <div
            className="px-4 pt-3 pb-4 border-t border-white/8 flex items-center gap-2.5 overflow-hidden min-h-[62px] shrink-0"
            title={col ? (email || undefined) : undefined}
          >
            <div className="w-[30px] h-[30px] min-w-[30px] bg-brand-800 rounded-full flex items-center justify-center text-xs font-semibold text-brand-100 shrink-0">
              {userInitial}
            </div>
            {!col && (
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="text-xs text-brand-200 whitespace-nowrap overflow-hidden text-ellipsis">
                  {email || name || "—"}
                </div>
                <button
                  onClick={handleSignOut}
                  className={cn(
                    "text-xs font-medium text-danger-soft-border cursor-pointer mt-0.5 whitespace-nowrap bg-transparent border-none p-0",
                    FOCUS_RING,
                  )}
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </aside>
    );
  }

  return (
    <>
      {/* ── Escritorio: sidebar fijo (colapsable) ── */}
      <div className="hidden md:block relative shrink-0">
        {renderAside(collapsed, false)}

      {/* ── Botón colapsar/expandir (fuera del aside para no ser clippeado) ── */}
      <button
        onClick={toggle}
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
        className={cn(
          "absolute top-[18px] w-[22px] h-[22px] bg-brand-800 border border-white/15 rounded-full",
          "flex items-center justify-center cursor-pointer select-none z-20",
          "shadow-[0_1px_4px_rgba(0,0,0,0.35)] p-0 hover:bg-brand-700",
          FOCUS_RING,
        )}
        style={{
          left:       W - 11,
          transition: ready ? "left 0.22s cubic-bezier(.4,0,.2,1)" : "none",
        }}
      >
        {collapsed
          ? <ChevronRight className="w-2.5 h-2.5 text-brand-100" strokeWidth={2.5} />
          : <ChevronLeft  className="w-2.5 h-2.5 text-brand-100" strokeWidth={2.5} />
        }
      </button>
      </div>

      {/* ── Celular: barra superior con hamburguesa + menú deslizable ── */}
      <div className="md:hidden sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 px-3 bg-brand-950 border-b border-white/8">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
          className={cn(
            "w-10 h-10 flex items-center justify-center bg-transparent border-none text-white cursor-pointer rounded-lg",
            FOCUS_RING,
          )}
        >
          <Menu className="w-[22px] h-[22px]" />
        </button>
        <Image src="/logo.png" alt="En Minutas" width={26} height={32} priority className="w-[26px] h-8" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-white leading-[18px]">En Minutas</div>
          <div className="text-xs text-brand-300 leading-4">{roleLabel}</div>
        </div>
        {alertasCount > 0 && (
          <Link
            href="/admin/alertas"
            aria-label={`${alertasCount} alertas`}
            className={cn(
              "ml-auto bg-danger-solid text-white text-xs font-semibold px-2 leading-5 rounded-full",
              FOCUS_RING,
            )}
          >
            {alertasCount}
          </Link>
        )}
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-brand-950/55" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0" style={{ width: "min(300px, 85vw)" }}>
            {renderAside(false, true)}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className={cn(
                "absolute top-3.5 right-2.5 w-8 h-8 flex items-center justify-center bg-transparent border-none text-brand-100 cursor-pointer",
                FOCUS_RING,
              )}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
