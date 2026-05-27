"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ShoppingBag, Menu, X, User } from "lucide-react";
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

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { openCart, totalItems } = useCartStore();
  const count = totalItems();

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

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
            {isLoggedIn && (
              <Link
                href="/mi-cuenta/pedidos"
                className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
                aria-label="Mis pedidos"
              >
                <User className="size-5" />
              </Link>
            )}
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
            <Button variant="gold" size="sm" asChild>
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
          open ? "max-h-64" : "max-h-0"
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
          <Link
            href="/registro-mayorista"
            onClick={() => setOpen(false)}
            className="px-3 py-2.5 text-sm text-tierra-700 font-medium hover:bg-tierra-50 rounded-lg transition-colors"
          >
            Soy mayorista →
          </Link>
        </nav>
      </div>
    </header>
  );
}
