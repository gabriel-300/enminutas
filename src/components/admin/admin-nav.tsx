"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ShoppingBag, Bell,
  Settings2, Truck,
  Users, UserCheck, GitBranch, BarChart2, TrendingUp, Target, Tag, Gift,
  Package, Layers, BookOpen, Calendar, ShoppingCart, Clock, Database,
  FileText, CreditCard, RotateCcw, CheckSquare, DollarSign, Wallet,
  Settings, HelpCircle, ChefHat, Factory, Globe,
  ChevronLeft, ChevronRight, ChevronDown,
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
};

const SECTIONS: { label?: string; key?: string; items: NavEntry[] }[] = [
  {
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "vendedor", "produccion", "distribucion"] },
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
      { href: "/admin/cuentas-corrientes",  label: "Ctas. corrientes", icon: CreditCard,  roles: ["admin"] },
      { href: "/admin/comisiones",          label: "Comisiones",       icon: Wallet,      roles: ["admin"] },
      { href: "/admin/devoluciones",        label: "Devoluciones",     icon: RotateCcw,   roles: ["admin"] },
      { href: "/admin/cheques",             label: "Cheques",          icon: CheckSquare, roles: ["admin"] },
      { href: "/admin/liquidaciones",       label: "Liquidaciones",    icon: DollarSign,  roles: ["admin"] },
    ],
  },
];

const BOTTOM_ITEMS: NavEntry[] = [
  { href: "/admin/configuracion", label: "Configuración", icon: Settings,    roles: ["admin"] },
  { href: "/admin/ayuda",         label: "Ayuda",         icon: HelpCircle,  roles: ["admin", "vendedor", "produccion", "distribucion"] },
];

const STORAGE_KEY   = "em_sidebar_collapsed";
const SECTIONS_KEY  = "em_sidebar_sections";

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
  const [hovered, setHovered]                   = useState<string | null>(null);
  const [ready, setReady]                       = useState(false);

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

  function itemStyle(href: string, active: boolean): React.CSSProperties {
    const isHovered = hovered === href && !active;
    return {
      display:        "flex",
      alignItems:     "center",
      gap:            collapsed ? 0 : 10,
      justifyContent: collapsed ? "center" : "flex-start",
      height:         34,
      padding:        collapsed ? "0" : "0 10px",
      borderRadius:   7,
      cursor:         "pointer",
      userSelect:     "none",
      background:     active ? "rgba(158,163,244,0.16)" : isHovered ? "rgba(255,255,255,0.06)" : "transparent",
      color:          active || isHovered ? "#ffffff" : "#d4d4f0",
      fontWeight:     active ? 500 : 400,
      boxShadow:      active ? "inset 2px 0 0 #9ea3f4" : "none",
      width:          "100%",
      transition:     "background 0.1s, color 0.1s",
      textDecoration: "none",
      fontSize:       14,
      whiteSpace:     "nowrap",
      minWidth:       0,
    };
  }

  const userInitial = ((name || email || "U")[0] ?? "U").toUpperCase();
  const roleLabel   = ROLE_LABEL[role ?? ""] ?? "Panel admin";
  const W = collapsed ? 60 : 248;
  const transition = ready ? "width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)" : "none";

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <aside
        style={{
          width:         W,
          minWidth:      W,
          height:        "100vh",
          background:    "#17153a",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          position:      "sticky",
          top:           0,
          flexShrink:    0,
          transition,
        }}
      >
        {/* ── Marca ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)", minHeight: 62, overflow: "hidden", flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, minWidth: 32, background: "#e8672e", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            EM
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff", whiteSpace: "nowrap" }}>En Minutas</div>
              <div style={{ fontSize: 12, color: "#9a9ad0", whiteSpace: "nowrap" }}>{roleLabel}</div>
            </div>
          )}
        </div>

        {/* ── Navegación ── */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "10px 12px" }}>
          {SECTIONS.map((section, si) => {
            const items = section.items.filter(i => i.roles.includes(role ?? ""));
            if (!items.length) return null;

            const key        = section.key ?? `s${si}`;
            const isExpanded = expandedSections[key] !== false;
            const showItems  = !section.label || collapsed || isExpanded;

            return (
              <div key={si}>
                {section.label && !collapsed && (
                  <div
                    onClick={() => toggleSection(key)}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px 4px", marginTop: 10, cursor: "pointer", userSelect: "none" }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", color: "#9a9ad0", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {section.label}
                    </span>
                    <ChevronDown style={{ width: 12, height: 12, color: "#9a9ad0", flexShrink: 0, transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }} />
                  </div>
                )}

                {showItems && items.map(item => {
                  const active = isActive(item.href);
                  const Icon   = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      style={itemStyle(item.href, active)}
                      onMouseEnter={() => setHovered(item.href)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <Icon style={{ width: 16, height: 16, minWidth: 16, flexShrink: 0, strokeWidth: 1.8 }} />
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.label}
                          </span>
                          {item.badge && alertasCount > 0 && (
                            <span style={{ background: "#c8321f", color: "#fff", fontSize: 12, fontWeight: 600, padding: "0 7px", lineHeight: "18px", borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0 }}>
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
        <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
          {BOTTOM_ITEMS.filter(i => i.roles.includes(role ?? "")).map(item => {
            const active = isActive(item.href);
            const Icon   = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                style={itemStyle(item.href, active)}
                onMouseEnter={() => setHovered(item.href)}
                onMouseLeave={() => setHovered(null)}
              >
                <Icon style={{ width: 16, height: 16, minWidth: 16, flexShrink: 0, strokeWidth: 1.8 }} />
                {!collapsed && (
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Footer de usuario ── */}
        <div
          style={{ padding: "12px 16px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10, overflow: "hidden", minHeight: 62, flexShrink: 0 }}
          title={collapsed ? (email || undefined) : undefined}
        >
          <div style={{ width: 30, height: 30, minWidth: 30, background: "#342e8f", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, color: "#e0e3fc", flexShrink: 0 }}>
            {userInitial}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 12, color: "#d4d4f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {email || name || "—"}
              </div>
              <button
                onClick={handleSignOut}
                style={{ fontSize: 12, fontWeight: 500, color: "#f7a699", cursor: "pointer", marginTop: 2, whiteSpace: "nowrap", background: "none", border: "none", padding: 0 }}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Botón colapsar/expandir (fuera del aside para no ser clippeado) ── */}
      <button
        onClick={toggle}
        title={collapsed ? "Expandir menú" : "Colapsar menú"}
        style={{
          position:     "absolute",
          left:         W - 11,
          top:          18,
          width:        22,
          height:       22,
          background:   "#342e8f",
          border:       "1px solid rgba(255,255,255,0.16)",
          borderRadius: "50%",
          display:      "flex",
          alignItems:   "center",
          justifyContent: "center",
          cursor:       "pointer",
          zIndex:       20,
          transition:   ready ? "left 0.22s cubic-bezier(.4,0,.2,1)" : "none",
          userSelect:   "none",
          boxShadow:    "0 1px 4px rgba(0,0,0,0.35)",
          padding:      0,
        }}
      >
        {collapsed
          ? <ChevronRight style={{ width: 10, height: 10, color: "#e0e3fc", strokeWidth: 2.5 }} />
          : <ChevronLeft  style={{ width: 10, height: 10, color: "#e0e3fc", strokeWidth: 2.5 }} />
        }
      </button>
    </div>
  );
}
