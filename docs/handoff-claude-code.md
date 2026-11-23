# Handoff — Rediseño frontend "En Minutas" (Claude Code + Opus)

> Prompt listo para pegar en Claude Code. Contexto completo también en Engram
> (proyecto `enminutas`, topic `frontend/redesign-proposal`).

---

## PROMPT

Actuá como **senior frontend designer + engineer** en `C:\claude-proyecto\minutas`.

### Contexto
"En Minutas" (enminutas.com.ar) = ERP + e-commerce de alimentos ultracongelados a base de mandioca (Posadas, Misiones). Stack: **Next.js 16.2.6 + React 19 + Tailwind v4** — los tokens viven en `@theme` dentro de `src/app/globals.css` (**NO hay tailwind.config**). Antes de escribir código: leé `AGENTS.md` (avisa que esta versión de Next tiene breaking changes — docs en `node_modules/next/dist/docs/`) y abrí `docs/propuesta-diseno-frontend.html` (mockup del rediseño aprobado).

### REGLA CRÍTICA
**NO tocar la página pública** (enminutas.com.ar): nada de `(marketing)/`, `(store)/`, checkout, `cart-drawer`, `components/site/`, `components/catalog/`, `site.module.css`, ni el layout raíz `src/app/layout.tsx`. Solo el **sistema**: `(admin)/`, `(repartidor)/`, `(b2b)/`, `components/admin/`, `components/b2b/`, `components/remito/`, y `components/ui/` (compartido — solo cambios neutros).

### Estado (Fase 0 ya completada en opencode + GLM)
- Tokens globales semánticos en `@theme static` de `globals.css`: `success/danger/warning/info` con `-bg`/`-border`/`-solid`, más `success-hover`, `wa`/`wa-dark`, `brand-50..950` (índigo), `n-0..n-900` (neutros cálidos).
- Barrido completo de paleta default de Tailwind (`green/red/blue/emerald/yellow`) en el sistema → tokens. Checkout conserva defaults **intencionalmente** (es público).
- Isologo EM unificado a `bg-brand-700` (login-form, register-form, pendiente, layout B2B) y `var(--color-brand-950)` en remito.
- Fuente del panel: **Nunito** (`src/app/(admin)/layout.tsx` + `.admin-panel` en globals.css). El sitio público conserva sus fuentes (no tocar).
- `npx tsc --noEmit` pasa limpio. **PENDIENTE: `npm run build`** (el script `lint` —`eslint` a secas— se cuelga; verificá con build).

### FASE 1 — Panel admin (hacer primero)
1. **Reescribir `src/components/admin/admin-nav.tsx` (líneas 172-337)**: está todo en inline styles con hex sueltos (`#17153a`, `#9a9ad0`, `#342e8f`…). Pasar a Tailwind con tokens `brand-*`/`n-*`, hover por CSS (hoy usa estado React `onMouseEnter/Leave`), `focus-visible` accesible, contador de alertas con clases del kit. Mantener comportamiento (grupos, item activo, drawer mobile líneas 377-422).
2. **Estados transversales**: `loading.tsx` para el grupo `(admin)` usando `Skeleton` de `components/ui/skeleton.tsx`; `not-found.tsx` global; usar los 3 `error.tsx` de `admin/pedidos` como patrón y llevar errores con icono + retry a las listas que hoy muestran texto plano (`admin/pedidos/page.tsx:56-61`).
3. **Pipeline**: `src/app/(admin)/admin/pipeline/constants.ts:3-7` duplica y contradice `PIPELINE_TONE` de `components/ui/tones.ts` → borrar el duplicado y usar `tones.ts` como única fuente.

### FASE 2 — Repartidor (PWA de uso diario)
`repartidor-client.tsx` con el look del mockup (sección 03, teléfono 1): header `brand-950` con chip de progreso, cards de entrega con badge semántico (punto + texto), botón principal `bg-success-solid`, acciones secundarias outline. Botones ad-hoc → `components/ui/Button` cuando sea posible. Mobile-first, targets táctiles grandes.

### FASE 3 — Auth + B2B
1. **Extender el patrón de remapeo** de `.admin-panel` (`globals.css:184-258`): crear una clase (ej. `.system-skin`) que re-mapee `tierra-*`/`dorado-*`/`crema-*`/`neutral-*` → `brand-*`/`n-*` y aplicarla al wrapper de `(b2b)/layout.tsx` y al grupo `(auth)`. Así el portal queda índigo sin tocar decenas de archivos (mismo truco que ya usa el panel).
2. Reemplazar el emoji 📦 de `components/b2b/catalogo-client.tsx:82` por el placeholder `NoPhoto` del sitio (`components/site/catalog/`) o un bloque con tapiz de marca.
3. Contraste AA: `text-neutral-400` → `text-neutral-600`/`n-600` en textos informativos (`b2b/catalogo-client.tsx:89-107`), precio "a consultar" ilegible (`:110`).

### Convenciones
- Nunca paleta default de Tailwind: solo tokens de `globals.css` (`bg-success-bg`, `text-danger`, `border-info-border`, `bg-brand-700`…).
- El color **nunca es la única señal**: cada tono lleva punto + texto (`components/ui/tones.ts`).
- Radios del sistema: botones `rounded-lg` (patrón `admin:` en `button-styles.ts`), cards 12-16px.
- Verificar con `npm run build` al terminar cada fase.

### Al terminar
Guardar en Engram (`mem_save`, topic_key `frontend/redesign-proposal`) lo hecho + session summary para la próxima sesión.
