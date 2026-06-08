"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const NAV = [
  { href: "/b2b/catalogo",  label: "Catálogo",     icon: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" },
  { href: "/b2b/pedidos",   label: "Mis pedidos",  icon: "M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" },
  { href: "/b2b/mi-cuenta", label: "Mi cuenta",    icon: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" },
];

export default function B2BLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="min-h-screen bg-neutral-50 pb-16 md:pb-0">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/b2b/catalogo" className="flex items-center gap-2 shrink-0 hover:opacity-80 transition-opacity">
            <div className="size-7 rounded-lg bg-tierra-700 text-white flex items-center justify-center font-display font-bold text-xs">EM</div>
            <span className="text-sm font-semibold text-neutral-900 font-display">En Minutas</span>
            <span className="hidden sm:inline text-neutral-300 select-none">·</span>
            <span className="hidden sm:inline text-xs text-neutral-500 font-medium">Portal B2B</span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            {NAV.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link key={href} href={href}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    active ? "bg-tierra-50 text-tierra-700 font-medium" : "text-neutral-600 hover:bg-neutral-100"
                  }`}>
                  {label}
                </Link>
              );
            })}
          </nav>

          <button onClick={handleSignOut} className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors shrink-0">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main>{children}</main>

      {/* ── Bottom nav mobile ─────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-neutral-200 flex">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                active ? "text-tierra-700" : "text-neutral-400"
              }`}>
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d={icon} />
              </svg>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
