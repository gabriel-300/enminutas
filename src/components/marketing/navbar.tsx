"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { ShoppingBag, Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/store/cart";
import { createBrowserClient } from "@supabase/ssr";

const links = [
  { href: "/tienda", label: "Productos" },
  { href: "/#como-funciona", label: "Cómo funciona" },
  { href: "/#nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
];

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string | null } | null>(null);
  const { openCart, totalItems } = useCartStore();
  const count = totalItems();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setUser({
          email: data.session.user.email ?? "",
          name: data.session.user.user_metadata?.full_name ?? null,
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email ?? "",
          name: session.user.user_metadata?.full_name ?? null,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cerrar menú de usuario al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    setUser(null);
    setUserMenuOpen(false);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 bg-crema-50/90 backdrop-blur-md border-b border-neutral-200/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="size-8 rounded-lg bg-tierra-700 text-white flex items-center justify-center font-bold text-sm tracking-tight">
              EM
            </span>
            <span className="font-display font-semibold text-lg text-neutral-900 hidden sm:block">
              En Minutas
            </span>
          </Link>

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-3.5 py-2 text-sm text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Carrito */}
            <button
              onClick={openCart}
              aria-label={`Carrito${count > 0 ? ` (${count} ítems)` : ""}`}
              className="relative p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <ShoppingBag className="size-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 size-4 rounded-full bg-tierra-700 text-white text-[10px] font-bold flex items-center justify-center">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </button>

            {/* Usuario logueado */}
            {user ? (
              <div className="relative hidden sm:block" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
                >
                  <span className="size-6 rounded-full bg-tierra-700 text-white text-[10px] font-bold flex items-center justify-center">
                    {getInitials(user.name, user.email)}
                  </span>
                  <span className="text-sm text-neutral-700 max-w-[120px] truncate">
                    {user.name ?? user.email.split("@")[0]}
                  </span>
                  <ChevronDown className={cn("size-3.5 text-neutral-400 transition-transform", userMenuOpen && "rotate-180")} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl border border-neutral-200 shadow-lg py-1 z-50">
                    <div className="px-3 py-2 border-b border-neutral-100">
                      <p className="text-xs font-medium text-neutral-900 truncate">{user.name ?? "Mi cuenta"}</p>
                      <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/mi-cuenta/pedidos"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      <User className="size-4 text-neutral-400" />
                      Mis pedidos
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="size-4" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded-full transition-colors"
              >
                <User className="size-3.5" />
                Iniciar sesión
              </Link>
            )}

            <Button variant="gold" size="sm" asChild className="hidden sm:flex">
              <Link href="/tienda">Comprar ahora</Link>
            </Button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors"
              onClick={() => setOpen(!open)}
              aria-label={open ? "Cerrar menú" : "Abrir menú"}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300",
          open ? "max-h-80" : "max-h-0"
        )}
      >
        <nav className="px-4 pb-4 flex flex-col gap-1 border-t border-neutral-200/60 pt-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="px-3 py-2.5 text-sm text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              {l.label}
            </Link>
          ))}

          <div className="border-t border-neutral-100 mt-1 pt-2 flex flex-col gap-1">
            {user ? (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs text-neutral-400">Sesión iniciada como</p>
                  <p className="text-sm font-medium text-neutral-800 truncate">{user.name ?? user.email}</p>
                </div>
                <Link
                  href="/mi-cuenta/pedidos"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Mis pedidos
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-left px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/registro-mayorista"
                  onClick={() => setOpen(false)}
                  className="px-3 py-2.5 text-sm text-tierra-700 font-medium hover:bg-tierra-50 rounded-lg transition-colors"
                >
                  Soy mayorista →
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
