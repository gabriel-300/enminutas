"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutGrid, ClipboardList, Activity, Truck,
  Users, BarChart2, DollarSign, BookOpen, Calendar,
  ShoppingCart, Clock, User, Settings, HelpCircle,
  ChevronLeft, ChevronRight, Receipt, Wallet,
} from "lucide-react";

type NavEntry = {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  sublabel?: string;
};

const ROLE_LABEL: Record<string, string> = {
  admin:        "Administrador",
  vendedor:     "Vendedor",
  produccion:   "Producción",
  distribucion: "Distribución",
};

const GROUPS: { label?: string; items: NavEntry[] }[] = [
  {
    items: [
      { href: "/admin/dashboard", label: "Dashboard",   icon: LayoutGrid,    roles: ["admin", "vendedor", "produccion", "distribucion"] },
      { href: "/admin/pedidos",   label: "Pedidos",     icon: ClipboardList, roles: ["admin", "vendedor"] },
    ],
  },
  {
    label: "OPERACIONES",
    items: [
      { href: "/admin/produccion",   label: "Producción",   icon: Activity, roles: ["admin", "produccion"] },
      { href: "/admin/distribucion", label: "Distribución", icon: Truck,    roles: ["admin", "distribucion"] },
    ],
  },
  {
    label: "COMERCIAL",
    items: [
      { href: "/admin/preventista",   label: "Preventista",   icon: Users,      roles: ["admin", "vendedor"] },
      { href: "/admin/reportes",      label: "Reportes",      icon: BarChart2,  roles: ["admin"] },
      { href: "/admin/liquidaciones", label: "Liquidaciones", icon: DollarSign, roles: ["admin"] },
      { href: "/admin/facturacion",        label: "Facturación",        icon: Receipt, roles: ["admin"] },
      { href: "/admin/cuentas-corrientes", label: "Ctas. corrientes",   icon: Wallet,  roles: ["admin"] },
    ],
  },
  {
    label: "COCINA",
    items: [
      { href: "/admin/cocina/recetas",      label: "Recetas",          icon: BookOpen,    roles: ["admin", "produccion"] },
      { href: "/admin/cocina/planificador", label: "Planificador",     icon: Calendar,    roles: ["admin", "produccion"] },
      { href: "/admin/cocina/compras",      label: "Lista de compras", icon: ShoppingCart, roles: ["admin", "produccion"] },
      { href: "/admin/cocina/historial",    label: "Historial prod.",  icon: Clock,       roles: ["admin", "produccion"] },
    ],
  },
];

const BOTTOM_ITEMS: NavEntry[] = [
  { href: "/admin/clientes",      label: "Clientes",      icon: User,       roles: ["admin", "vendedor"], sublabel: "B2B · B2C" },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings,   roles: ["admin"] },
  { href: "/admin/ayuda",         label: "Ayuda",         icon: HelpCircle, roles: ["admin", "vendedor", "produccion", "distribucion"] },
];

const STORAGE_KEY = "em_sidebar_collapsed";

function NavItem({
  item,
  active,
  collapsed,
}: {
  item: NavEntry;
  active: boolean;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: collapsed ? 0 : 12,
        borderRadius: 9,
        marginBottom: 2,
        padding: collapsed ? "10px 17px" : "9px 12px",
        whiteSpace: "nowrap",
        transition: "background 150ms",
        background: active ? "#16233f" : "transparent",
        color: active ? "#ffffff" : "#3a4760",
      }}
      className={!active ? "hover:bg-[#eef2f7]" : ""}
    >
      <Icon
        style={{
          width: 18,
          height: 18,
          strokeWidth: 1.7,
          flexShrink: 0,
          color: active ? "#ffffff" : "#8693a8",
        }}
      />
      {!collapsed && (
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{item.label}</p>
          {item.sublabel && (
            <p style={{ fontSize: 11, color: active ? "rgba(255,255,255,.7)" : "#aab4c4", lineHeight: 1.3 }}>
              {item.sublabel}
            </p>
          )}
        </div>
      )}
    </Link>
  );
}

export function AdminNav({ role, email, name }: { role: string | null; email: string | null; name: string | null }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [ready, setReady]         = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();

  useEffect(() => {
    const mobile = window.innerWidth < 1024;
    setCollapsed(mobile ? true : localStorage.getItem(STORAGE_KEY) === "true");
    setReady(true);
  }, []);

  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      // Solo persistir preferencia en desktop; en mobile no contaminar la clave compartida
      if (window.innerWidth >= 1024) {
        localStorage.setItem(STORAGE_KEY, String(next));
      }
      return next;
    });
  }

  async function handleSignOut() {
    try {
      await supabaseRef.current!.auth.signOut();
    } catch {
      // Si falla el signOut, igual redirigimos para limpiar el estado local
    }
    router.push("/login");
  }

  function isActive(href: string) {
    if (href === "/admin/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  // Fallback seguro si email es string vacío (OAuth sin email scope)
  const userInitial = ((name || email || "U")[0] ?? "U").toUpperCase();
  const roleLabel   = ROLE_LABEL[role ?? ""] ?? "Panel admin";
  const W = collapsed ? 52 : 252;

  return (
    <aside
      style={{
        width: W,
        minWidth: W,
        transition: ready ? "width 220ms cubic-bezier(.4,0,.2,1)" : "none",
      }}
      className="shrink-0 h-screen sticky top-0 flex flex-col bg-white border-r border-[#e4e9f0] overflow-hidden z-30"
    >
      {/* ── Header ── */}
      <div
        className="shrink-0 border-b border-[#eef2f6]"
        style={{ padding: "18px 8px 16px" }}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={toggle}
              title="Expandir menú"
              className="size-9 rounded-full bg-[#16233f] text-white flex items-center justify-center font-display font-bold text-sm hover:opacity-80 transition-opacity"
            >
              EM
            </button>
            <ChevronRight className="size-3 text-[#c2ccda]" />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              title="Colapsar menú"
              className="size-9 rounded-full bg-[#16233f] text-white flex items-center justify-center font-display font-bold text-sm hover:opacity-80 transition-opacity shrink-0"
            >
              EM
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold text-[#16233f] font-display whitespace-nowrap">En Minutas</p>
              <p className="text-[11.5px] text-[#8693a8] whitespace-nowrap">{roleLabel}</p>
            </div>
            <button
              onClick={toggle}
              title="Colapsar menú"
              className="size-7 flex items-center justify-center rounded-lg border border-[#e4e9f0] text-[#8693a8] hover:bg-[#f0f3f7] transition-colors shrink-0"
            >
              <ChevronLeft className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Main nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden" style={{ padding: "10px 8px 6px" }}>
        {GROUPS.map((group, gi) => {
          const items = group.items.filter(i => i.roles.includes(role ?? ""));
          if (!items.length) return null;
          return (
            <div key={gi}>
              {group.label && (
                collapsed ? (
                  <div className="my-2 mx-1 border-t border-[#f1f4f8]" />
                ) : (
                  <p
                    className="font-bold uppercase text-[#c2ccda] whitespace-nowrap"
                    style={{ fontSize: 10.5, letterSpacing: 1, padding: "14px 10px 6px" }}
                  >
                    {group.label}
                  </p>
                )
              )}
              {items.map(item => (
                <NavItem
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                />
              ))}
            </div>
          );
        })}
      </nav>

      {/* ── Bottom nav ── */}
      <div className="shrink-0 border-t border-[#f1f4f8]" style={{ padding: "8px 8px 6px" }}>
        {BOTTOM_ITEMS.filter(i => i.roles.includes(role ?? "")).map(item => (
          <NavItem
            key={item.href}
            item={item}
            active={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* ── User block ── */}
      <div
        className="shrink-0 border-t border-[#eef2f6] flex items-center"
        style={{ padding: "12px 10px", gap: 10 }}
        title={collapsed ? (email || undefined) : undefined}
      >
        <div className="size-8 rounded-full bg-[#16233f] text-white flex items-center justify-center font-bold text-[13px] shrink-0">
          {userInitial}
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p
              className="text-xs whitespace-nowrap overflow-hidden text-ellipsis"
              style={{ color: "#52607a" }}
            >
              {email || name || "—"}
            </p>
            <button
              onClick={handleSignOut}
              className="text-xs font-semibold hover:underline"
              style={{ color: "#9e2a2a" }}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
