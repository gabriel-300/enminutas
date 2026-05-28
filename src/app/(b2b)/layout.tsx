"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const navItems = [
  { href: "/b2b/catalogo",  label: "Catálogo" },
  { href: "/b2b/pedidos",   label: "Mis pedidos" },
  { href: "/b2b/mi-cuenta", label: "Mi cuenta" },
];

export default function B2BLayout({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="size-7 rounded-lg bg-tierra-700 text-white flex items-center justify-center font-display font-bold text-xs">
              EM
            </div>
            <span className="text-sm font-semibold text-neutral-900 font-display">En Minutas</span>
            <span className="text-neutral-300 select-none">·</span>
            <span className="text-xs text-neutral-500 font-medium">Portal B2B</span>
          </div>

          <nav className="flex items-center gap-1 flex-1">
            {navItems.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
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

          <button
            onClick={handleSignOut}
            className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
