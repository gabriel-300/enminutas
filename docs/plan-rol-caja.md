# Rol "caja": separar quién ejecuta el pago de quién crea y quién aprueba

## Contexto

Javier pidió trabajar en la "posición de caja" del sistema. Investigando la bitácora del equipo (tarea 62) se confirmó que esto no es un concepto contable nuevo sino una decisión de negocio ya anotada: **mientras no exista alguien en la posición de caja, Alex Petri maneja todo el circuito de pagos a proveedores (crea, aprueba y paga)**. El sistema ya separa "crear" de "aprobar" una orden de pago (`ordenes_pago.estado`: `borrador → aprobada`, con `puedeAprobar()`/`APROBADORES_PAGOS` como segundo control), pero el tercer paso — **ejecutar el pago de una orden ya aprobada** (`pagarOrdenPago`) — hoy solo exige `requireAdmin()` genérico, sin ningún control adicional. Ese es el hueco exacto que Javier quiere cerrar.

Decisiones ya tomadas con el usuario:
- **Admin conserva la capacidad de pagar** órdenes aprobadas directamente; `caja` se suma como alternativa, no lo reemplaza.
- **Alcance inicial: solo pagos a proveedores.** Cheques y cobros de clientes quedan para una fase futura.
- Una "posición de caja" financiera completa (saldo real de banco/efectivo, conciliar `pagos`/`pagos_proveedores` contra `cc_movimientos`) es un problema mucho más grande que depende de decisiones de Javier que todavía no están tomadas (qué cuentas existen, quién concilia). **No se diseña ni se toca en este plan.**

## Verificado: pagos/cobros informales ("en negro", solo remito, sin factura)

Se revisó explícitamente si el plan deja afuera a proveedores que se pagan solo con remito (sin factura) o a clientes que pagan sin factura — **no es un caso nuevo a diseñar, el sistema ya lo soporta** en ambos lados, y el cambio de este plan (agregar quién *ejecuta* el pago) es indiferente a esto porque actúa un paso después:

- **Proveedores:** `recepciones.tipo` ya distingue `'factura' | 'remito' | 'gasto'`. Un `remito` genera deuda propia (`genera_deuda: true`) sin necesitar nunca una factura — vincularlo a una factura (`vincularRemitos`) es opcional, no obligatorio. Al crear una orden de pago, la UI (`ficha-client.tsx`, selector de "Comprobantes a pagar") deja tildar remitos igual que facturas, **y si no se tilda ninguno, el pago queda "a cuenta"** (sin ningún comprobante atrás) — ya es una opción de primera clase, no un caso límite.
- **Clientes:** `pagos.sin_factura` (boolean) ya cubre el cobro informal: si está en `true`, `cobranza.ts` calcula el monto debido neto de IVA (`total / 1.21`) en vez del total, y la diferencia se trata como descuento, no como saldo pendiente.
- **Conclusión:** `pagarOrdenPago` (lo único que este plan modifica a nivel de lógica de negocio) no mira `recepcion_ids` para nada relacionado a factura/remito — paga la orden tal cual quedó aprobada, sea que esté respaldada por facturas, remitos, o nada ("a cuenta"). Caja va a poder ejecutar esos pagos exactamente igual que admin hoy, sin ninguna rama de código adicional. Si en el futuro aparece dinero que ni siquiera se carga como remito/gasto en el sistema (plata que nunca se tipea), eso ya no es un problema de permisos sino de proceso — y es justamente el tipo de cosa que la fase 2 (posición de caja financiera real) tendría que abordar con Javier, no esta fase.

## Hallazgo clave de la investigación

El rol de staff no vive en ningún enum de Postgres: vive en `auth.users.app_metadata.role` (Supabase Admin API), y está **hardcodeado en 7 lugares distintos** del código (no 6 — se verificó un cuarto duplicado de `STAFF_ROLES` que no apareció en la primera pasada, en `staff/page.tsx`). Agregar `"caja"` es 100% cambios en TypeScript, sin migración SQL para el rol en sí. Se confirmó además que el selector de rol en la UI de alta/edición de staff (`staff-client.tsx`) lee de un único array `ROLE_OPTIONS` reutilizado en 4 lugares del mismo archivo (crear usuario, cambiar rol, badge, panel de info) — una sola edición ahí alcanza para todo el formulario.

## Fase 1 — Agregar el rol `"caja"` en los 7 puntos hardcodeados

1. **`src/lib/auth.ts`** — `export type StaffRole = "admin" | "vendedor" | "produccion" | "distribucion" | "caja";` (no requiere más cambios; `requireRole`/`requireAdmin` ya son genéricos).

2. **`src/lib/supabase/middleware.ts`** — agregar `"caja"` a `STAFF_ROLES`; agregar whitelist nueva:
   ```ts
   const CAJA_ALLOWED = ["/admin/dashboard", "/admin/proveedores", "/admin/ayuda"];
   ```
   y el bloque de redirect (igual patrón que `produccion`/`distribucion`, después del bloque de `distribucion`):
   ```ts
   if (role === "caja") {
     const allowed = CAJA_ALLOWED.some((p) => pathname.startsWith(p));
     if (!allowed) return NextResponse.redirect(new URL("/admin/dashboard", request.url));
   }
   ```
   No hace falta tocar `ADMIN_ONLY_PREFIXES` ni el bloque de redirect post-`/login` (cae al fallback genérico `→ /admin/dashboard`, que es lo correcto).

3. **`src/app/(admin)/layout.tsx`** (línea 13) — agregar `"caja"` a su propio `STAFF_ROLES` duplicado (gate de entrada a todo `/admin/*`).

4. **`src/app/(admin)/admin/staff/page.tsx`** (línea 35) — **cuarto duplicado encontrado en la verificación**, no detectado en la primera exploración: `const STAFF_ROLES = ["admin", "vendedor", "produccion", "distribucion"];` filtra qué usuarios aparecen listados en `/admin/staff`. Sin este cambio, un usuario `caja` recién creado sería invisible en la pantalla de gestión de staff. Agregar `"caja"` acá, y opcionalmente a `order` (línea 67, `{ admin: 0, vendedor: 1, produccion: 2, distribucion: 3 }`) para que no quede al final del listado (`caja: 4` o donde se prefiera).

5. **`src/app/(admin)/admin/staff/actions.ts`** (línea 35) — `VALID_ROLES = [..., "caja"] as const`. `cambiarRolStaff`, `invitarStaff`, `crearUsuarioConPassword` no necesitan más cambios (genéricas).

6. **`src/components/admin/staff-client.tsx`** — confirmado: una sola edición cubre todo el formulario.
   - `ROLE_OPTIONS` (línea 62-67): agregar `{ value: "caja", label: "Caja", desc: "Ejecuta pagos a proveedores ya aprobados" }`.
   - `ROLE_BADGE` (línea 70-73): agregar `caja: "bg-brand-100 text-brand-700"` (único tono libre, consistente con la paleta índigo).
   - Panel de info de roles (línea ~523-533): agregar el bloque `{r.value === "caja" && (<><li>· Dashboard y Proveedores</li><li>· Solo registra pagos de órdenes ya aprobadas</li><li>· No puede crear ni aprobar órdenes</li></>)}`.

7. **`src/components/admin/admin-nav.tsx`**:
   - `ROLE_LABEL`: agregar `caja: "Caja"`.
   - Ítem "Dashboard" y "Ayuda" (`BOTTOM_ITEMS`): agregar `"caja"` a su `roles: [...]` (ya incluyen a todos los roles de staff).
   - Ítem "Proveedores" (sección ADMINISTRACIÓN): cambiar `roles: ["admin"]` → `roles: ["admin", "caja"]`. El resto de ítems de esa sección (Facturación, Cheques, Liquidaciones, etc.) quedan sin tocar.

8. **`src/app/(admin)/admin/dashboard/page.tsx`** — agregar la rama explícita **antes** del fallback a `AdminDashboard` (si no, caja vería el dashboard completo de admin):
   ```ts
   import { CajaDashboard } from "./_views/caja";
   ...
   if (role === "caja") return <CajaDashboard />;
   ```

## Fase 2 — `pagarOrdenPago` acepta `admin` **o** `caja`

Archivo: `src/app/(admin)/admin/proveedores/actions.ts`

```ts
export async function pagarOrdenPago(
  ordenId: string, proveedorId: string,
): Promise<{ error: string } | { ok: true; grupoId: string; aCuenta: number }> {
  try {
    const user = await requireRole("admin", "caja");   // antes: requireAdmin()
    ...
```

Nada más cambia en el cuerpo: `pagado_por: user.id` sigue correcto sea quien sea, y no hay ninguna otra asunción de rol dentro de la función. El resto de las actions del archivo (`crearOrdenPago`, `aprobarOrdenPago`, `anularOrdenPago`, `eliminarPagoProveedor`, `registrarGasto`, etc.) **quedan en `requireAdmin()` sin cambios** — caja solo ejecuta pagos.

Agregar la nueva ruta (Fase 3) a `revalidar()`:
```ts
function revalidar(proveedorId?: string) {
  revalidatePath("/admin/proveedores");
  if (proveedorId) revalidatePath(`/admin/proveedores/${proveedorId}`);
  revalidatePath("/admin/proveedores/pagos-pendientes");   // nuevo
  revalidatePath("/admin/cocina/recepciones");
}
```

## Fase 3 — Bandeja global "Órdenes pendientes de pago"

Hoy **no existe ninguna pantalla** que liste las órdenes `aprobada` de todos los proveedores juntas (solo se ven entrando proveedor por proveedor). Sin esto, caja no tiene forma eficiente de trabajar.

1. **`src/app/(admin)/admin/proveedores/actions.ts`** — nueva función:
   ```ts
   export type OrdenAprobadaGlobal = {
     id: string; proveedorId: string; proveedorNombre: string;
     monto: number; fecha: string; metodo: string;
     referencia: string | null; notas: string | null; aprobadoAt: string | null;
   };

   export async function listarOrdenesAprobadas(): Promise<OrdenAprobadaGlobal[]> {
     await requireRole("admin", "caja");
     const db = createAdminClient() as any;
     const { data } = await db.from("ordenes_pago")
       .select("id, proveedor_id, monto, fecha, metodo, referencia, notas, aprobado_at, proveedor:proveedores!proveedor_id(nombre)")
       .eq("estado", "aprobada")
       .order("fecha", { ascending: true });
     return ((data ?? []) as any[]).map(o => ({
       id: o.id, proveedorId: o.proveedor_id, proveedorNombre: o.proveedor?.nombre ?? "—",
       monto: Number(o.monto), fecha: o.fecha, metodo: o.metodo, referencia: o.referencia,
       notas: o.notas, aprobadoAt: o.aprobado_at ?? null,
     }));
   }
   ```

2. **`src/app/(admin)/admin/proveedores/pagos-pendientes/page.tsx`** (nuevo) — Server Component, mismo patrón de gate que `[id]/page.tsx` pero permitiendo `["admin", "caja"]`:
   ```tsx
   const ROLES_PERMITIDOS = ["admin", "caja"];
   ...
   if (!role || !ROLES_PERMITIDOS.includes(role)) redirect("/admin/dashboard");
   const ordenes = await listarOrdenesAprobadas();
   return <PagosPendientesClient ordenes={ordenes} />;
   ```

3. **`src/app/(admin)/admin/proveedores/pagos-pendientes/pagos-pendientes-client.tsx`** (nuevo, client) — usa `PageHeader`/`Card`/`CardHeader` (de `@/components/ui`), reusa `pagarOrdenPago` existente con `confirm()` + `useTransition`, lista cada orden con botón "Registrar pago". Seguir la paleta `n-*`/`brand-*`/tones, no clases legacy sueltas.

4. **Ampliar el gate de rol** (de `!== "admin"` a `!["admin","caja"].includes(...)`) en los 3 archivos que hoy son admin-only y a los que caja necesita entrar para navegar desde la bandeja:
   - `src/app/(admin)/admin/proveedores/page.tsx` (línea 18)
   - `src/app/(admin)/admin/proveedores/[id]/page.tsx` (línea 22)
   - `src/app/(admin)/admin/proveedores/orden-pago/[grupoId]/page.tsx` (línea 29)

## Fase 4 — Dashboard de caja

Nuevos archivos, siguiendo el patrón visual ya migrado de `_views/produccion.tsx` (KPIs arriba + 1 Card abajo, sin gráficos ni métricas que no se pidieron):

- **`src/app/(admin)/admin/dashboard/_data/caja.ts`** — carga `ordenes_pago` en estado `aprobada` (mismo query shape que `listarOrdenesAprobadas`, pero vive en `_data/` siguiendo la convención del resto de dashboards; no se unifica con la server action para no acoplar el dashboard a `proveedores/actions.ts`).
- **`src/app/(admin)/admin/dashboard/_views/caja.tsx`** — `PageHeader` + 2 `KpiCard` ("Órdenes pendientes de pago", "Monto total a pagar", ambas linkeando a `/admin/proveedores/pagos-pendientes`) + 1 `Card` con las primeras 5 órdenes a pagar.

## Fase 5 — Ocultar "Aprobar" y "Descartar" para caja en la ficha de proveedor

`FichaClient` (`src/app/(admin)/admin/proveedores/[id]/ficha-client.tsx`, línea 71-79) no recibe el rol actual. Agregar la prop:

```tsx
export function FichaClient({
  proveedorId, hoy, comprobantes, pagos, ordenes, rol,
}: {
  proveedorId: string; hoy: string; comprobantes: Comprobante[];
  pagos: PagoGrupo[]; ordenes: OrdenPendiente[]; rol: string;
}) {
```

y pasarla desde `[id]/page.tsx` (línea 137): `<FichaClient ... rol={user.app_metadata?.role as string} />`.

En el render de acciones de cada orden, condicionar "Aprobar" y "Descartar" a `rol === "admin"` (ambas actions siguen siendo `requireAdmin()`-only; ocultar el botón es higiene de UX, no el control real):

```tsx
{o.estado === "borrador" && rol === "admin" && (
  <button ...>Aprobar</button>
)}
{o.estado === "aprobada" && (
  <button ...>Registrar pago</button>   /* visible para admin y caja */
)}
{rol === "admin" && (
  <button ...>Descartar</button>
)}
```

El botón "+ Nueva orden de pago" y el "Eliminar" del historial de pagos (ambos ligados a actions `requireAdmin()`-only) se dejan visibles sin cambios — no se pidió ocultarlos y, si Javier confirma que corresponde, es un ajuste trivial de una línea cada uno más adelante.

## Fase 6 — Verificación

**Manual:**
1. Crear usuario de prueba con rol `caja` desde `/admin/staff` → confirmar que aparece en el listado (Fase 1.4) y que el `<select>` de rol lo ofrece (Fase 1.6).
2. Loguearse como `caja`: redirect a `/admin/dashboard` mostrando `CajaDashboard`; sidebar solo con Dashboard/Proveedores/Ayuda; navegar manualmente a `/admin/staff` o `/admin/cocina` por URL → debe redirigir.
3. Con una orden `aprobada` ya existente (creada+aprobada por un admin): entrar a `/admin/proveedores/pagos-pendientes`, click "Registrar pago" → pasa a `pagada`, desaparece de la bandeja, genera fila en `pagos_proveedores`.
4. Con una orden `borrador`: en la ficha del proveedor, confirmar que "Aprobar" no aparece para `caja`.
5. Logueado como `admin`: confirmar que sigue pudiendo aprobar y pagar sin cambios.
6. Confirmar que `vendedor`/`produccion` no pueden entrar a `/admin/proveedores*`.

**Automatizado:** `src/app/(admin)/admin/proveedores/actions.test.ts` mockea `requireRole` para que siempre resuelva OK ignorando los roles pedidos — el cambio de Fase 2 no rompe nada existente. Se recomienda (no es obligatorio) ajustar el mock para que sí valide `roles` contra un `state.role`, y agregar un test que confirme: caja puede pagar una orden ya aprobada, y caja recibe "No autorizado" al intentar crear o aprobar.

## Fuera de alcance (anotado, no se construye ahora)

Una posición de caja financiera real (saldo de banco/efectivo, conciliación de `pagos`/`pagos_proveedores` contra `cc_movimientos`, cheques, cobros de clientes) requiere decisiones de negocio de Javier que todavía no están tomadas. Este plan solo cierra el control operativo que ya estaba decidido: separar quién ejecuta el pago de quién lo crea y quién lo aprueba.
