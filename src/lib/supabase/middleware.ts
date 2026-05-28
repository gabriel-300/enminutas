import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

const STAFF_ROLES = ["admin", "vendedor", "produccion", "distribucion"];

const ADMIN_ONLY_PREFIXES = [
  "/admin/productos",
  "/admin/categorias",
  "/admin/zonas",
  "/admin/staff",
];

const PRODUCCION_ALLOWED = [
  "/admin/produccion",
  "/admin/dashboard",
];

const DISTRIBUCION_ALLOWED = [
  "/admin/distribucion",
  "/admin/dashboard",
];

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let supabaseResponse = NextResponse.next({ request });

  if (!supabaseUrl || !supabaseKey) {
    const pathname = request.nextUrl.pathname;
    const dashboardRoutes = ["/admin", "/b2b", "/repartidor", "/mi-cuenta"];
    if (dashboardRoutes.some((r) => pathname.startsWith(r))) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  try {
    // ── Admin routes ───────────────────────────────────────────────
    if (pathname.startsWith("/admin")) {
      if (!user) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      const role = user.app_metadata?.role as string | undefined;

      if (role !== undefined && !STAFF_ROLES.includes(role)) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      if (role && ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
        if (role !== "admin") {
          return NextResponse.redirect(new URL("/admin/dashboard", request.url));
        }
      }

      if (role === "produccion") {
        const allowed = PRODUCCION_ALLOWED.some((p) => pathname.startsWith(p));
        if (!allowed) {
          return NextResponse.redirect(new URL("/admin/produccion", request.url));
        }
      }

      if (role === "distribucion") {
        const allowed = DISTRIBUCION_ALLOWED.some((p) => pathname.startsWith(p));
        if (!allowed) {
          return NextResponse.redirect(new URL("/admin/distribucion", request.url));
        }
      }
    }

    // ── Portal B2B ─────────────────────────────────────────────────
    if (pathname.startsWith("/b2b")) {
      if (!user) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      const role = user.app_metadata?.role;
      if (role !== "customer_b2b") {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    }

    // ── Redirigir usuarios según su rol al entrar al sitio ────────
    if (user && !pathname.startsWith("/auth") && !pathname.startsWith("/login") && !pathname.startsWith("/admin") && !pathname.startsWith("/b2b")) {
      const role = user.app_metadata?.role as string | undefined;

      // Cliente B2B → portal B2B
      if (role === "customer_b2b") {
        return NextResponse.redirect(new URL("/b2b/catalogo", request.url));
      }

      // Staff → panel admin (con home apropiado por rol)
      if (role && STAFF_ROLES.includes(role)) {
        if (role === "produccion")   return NextResponse.redirect(new URL("/admin/produccion",   request.url));
        if (role === "distribucion") return NextResponse.redirect(new URL("/admin/distribucion", request.url));
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }

    // ── Rutas genéricas protegidas ─────────────────────────────────
    const dashboardRoutes = ["/repartidor", "/mi-cuenta"];
    if (dashboardRoutes.some((r) => pathname.startsWith(r)) && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(url);
    }
  } catch {
    // Si algo falla, dejar pasar; las páginas hacen su propio auth check
  }

  return supabaseResponse;
}
