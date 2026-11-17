"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import s from "@/styles/site.module.css";
import { cn } from "@/lib/utils";
import { WaLink, WA_MESSAGES } from "./wa-link";
import { ChevronDownIcon, BurgerIcon, WhatsAppBadgeIcon } from "./icons";

const NAV_LINKS = [
  { href: "/tienda", label: "Productos", dropdown: true },
  { href: "/#inicio-quien", label: "Gastronomía", dropdown: true },
  { href: "/#inicio-como", label: "Cómo trabajamos" },
  { href: "/nosotros", label: "Nosotros" },
];

type Cuenta = { href: string; label: string } | null;

// "Ingresar" si no hay sesión, "Mi cuenta" si la hay. Un cliente B2C va a sus
// pedidos; cualquier otro rol (staff, B2B) lo resuelve /auth/redirect.
function useCuenta(): Cuenta {
  const [cuenta, setCuenta] = useState<Cuenta>(null);
  useEffect(() => {
    let vivo = true;
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!vivo) return;
      if (!user) return setCuenta({ href: "/login", label: "Ingresar" });
      const rol = user.app_metadata?.role as string | undefined;
      const esCliente = !rol || rol === "customer_b2c";
      setCuenta({ href: esCliente ? "/mi-cuenta/pedidos" : "/auth/redirect", label: "Mi cuenta" });
    }).catch(() => { if (vivo) setCuenta({ href: "/login", label: "Ingresar" }); });
    return () => { vivo = false; };
  }, []);
  return cuenta;
}

export function Header({ whatsapp }: { whatsapp?: string }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const cuenta = useCuenta();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn(s.hdr, scrolled && s.hdrScrolled)}>
      <div className={cn(s.wrap, s.inner)}>
        <Link href="/" className={s.logo} aria-label="En Minutas, inicio">
          <Image src="/logo.png" alt="En Minutas" width={62} height={62} priority />
        </Link>

        <nav className={s.menu} aria-label="Principal">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
              {l.dropdown ? <ChevronDownIcon /> : null}
            </Link>
          ))}
        </nav>

        <div className={s.right}>
          <Link href={cuenta?.href ?? "/login"} className={s.ing}>
            {cuenta?.label ?? "Ingresar"}
          </Link>
          <WaLink whatsapp={whatsapp} message={WA_MESSAGES.pedido} className={cn(s.btn, s.pri, s.sm)}>
            <WhatsAppBadgeIcon className={s.waIco} />
            Pedir por WhatsApp
          </WaLink>
        </div>

        <button
          className={s.burger}
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          <BurgerIcon />
        </button>
      </div>

      <nav className={cn(s.mnav, open && s.mnavOn)} aria-label="Menú móvil">
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</Link>
        ))}
        <Link href={cuenta?.href ?? "/login"} onClick={() => setOpen(false)}>{cuenta?.label ?? "Ingresar"}</Link>
        <WaLink whatsapp={whatsapp} message={WA_MESSAGES.pedido} className={cn(s.btn, s.pri)}>
          <WhatsAppBadgeIcon className={s.waIco} />
          Pedir por WhatsApp
        </WaLink>
      </nav>
    </header>
  );
}
