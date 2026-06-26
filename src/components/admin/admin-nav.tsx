"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard, ShoppingBag, Bell,
  Settings2, Truck,
  Users, UserCheck, GitBranch, BarChart2, TrendingUp, Target, Tag, Gift,
  Package, Layers, BookOpen, Calendar, ShoppingCart, Clock,
  FileText, CreditCard, RotateCcw, CheckSquare, DollarSign,
  Settings, HelpCircle, ChefHat,
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
      { href: "/admin/cocina/recetas",       label: "Recetas",          icon: BookOpen,     roles: ["admin", "produccion"] },
      { href: "/admin/cocina/planificador",  label: "Planificador",     icon: Calendar,     roles: ["admin", "produccion"] },
      { href: "/admin/cocina/compras",       label: "Lista de compras", icon: ShoppingCart, roles: ["admin", "produccion"] },
      { href: "/admin/cocina/historial",     label: "Historial prod.",  icon: Clock,        roles: ["admin", "produccion"] },
    ],
  },
  {
    label: "ADMINISTRACIÓN",
    key:   "administracion",
    items: [
      { href: "/admin/facturacion",         label: "Facturación",      icon: FileText,    roles: ["admin"] },
      { href: "/admin/cuentas-corrientes",  label: "Ctas. corrientes", icon: CreditCard,  roles: ["admin"] },
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
      padding:        collapsed ? "9px 0" : "7px 10px",
      borderRadius:   7,
      cursor:         "pointer",
      userSelect:     "none",
      background:     active ? "rgba(13,180,195,0.1)" : isHovered ? "rgba(255,255,255,0.04)" : "transparent",
      color:          active ? "#c8e0f4" : isHovered ? "#7a96b2" : "#4d6882",
      fontWeight:     active ? 500 : 400,
      borderLeft:     active ? "2px solid #0db4c3" : "2px solid transparent",
      width:          "100%",
      transition:     "background 0.1s, color 0.1s",
      textDecoration: "none",
      fontSize:       13,
      whiteSpace:     "nowrap",
      minWidth:       0,
    };
  }

  const userInitial = ((name || email || "U")[0] ?? "U").toUpperCase();
  const roleLabel   = ROLE_LABEL[role ?? ""] ?? "Panel admin";
  const W = collapsed ? 60 : 220;
  const transition = ready ? "width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)" : "none";

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <aside
        style={{
          width:         W,
          minWidth:      W,
          height:        "100vh",
          background:    "#141c2e",
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", minHeight: 60, overflow: "hidden", flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, minWidth: 32, background: "#0db4c3", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.03em", flexShrink: 0 }}>
            EM
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#dce8f5", whiteSpace: "nowrap" }}>En Minutas</div>
              <div style={{ fontSize: 11, color: "#334a63", marginTop: 1, whiteSpace: "nowrap" }}>{roleLabel}</div>
            </div>
          )}
        </div>

        {/* ── Navegación ── */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 6px" }}>
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
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 8px 5px", cursor: "pointer", userSelect: "none" }}
                  >
                    <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.1em", color: "#2d3f55", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                      {section.label}
                    </span>
                    <ChevronDown style={{ width: 10, height: 10, color: "#2d3f55", opacity: 0.7, flexShrink: 0, transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.15s" }} />
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
                      <Icon style={{ width: 16, height: 16, minWidth: 16, flexShrink: 0, strokeWidth: 1.75 }} />
                      {!collapsed && (
                        <>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", fontSize: 13 }}>
                            {item.label}
                          </span>
                          {item.badge && alertasCount > 0 && (
                            <span style={{ background: "#dc2626", color: "#fff", fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 10, whiteSpace: "nowrap", flexShrink: 0 }}>
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
        <div style={{ padding: 6, borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
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
                <Icon style={{ width: 16, height: 16, minWidth: 16, flexShrink: 0, strokeWidth: 1.75 }} />
                {!collapsed && (
                  <span style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* ── Footer de usuario ── */}
        <div
          style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 10, overflow: "hidden", minHeight: 52, flexShrink: 0 }}
          title={collapsed ? (email || undefined) : undefined}
        >
          <div style={{ width: 28, height: 28, minWidth: 28, background: "#1c2e45", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, color: "#5a7a9e", flexShrink: 0 }}>
            {userInitial}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 11, color: "#3d5472", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {email || name || "—"}
              </div>
              <button
                onClick={handleSignOut}
                style={{ fontSize: 11, color: "#e05252", cursor: "pointer", marginTop: 2, whiteSpace: "nowrap", background: "none", border: "none", padding: 0 }}
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
          background:   "#1e2d45",
          border:       "1px solid rgba(255,255,255,0.12)",
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
          ? <ChevronRight style={{ width: 10, height: 10, color: "#6b8aad", strokeWidth: 2.5 }} />
          : <ChevronLeft  style={{ width: 10, height: 10, color: "#6b8aad", strokeWidth: 2.5 }} />
        }
      </button>
    </div>
  );
}
