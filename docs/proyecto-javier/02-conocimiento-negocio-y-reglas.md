# En Minutas — Conocimiento del negocio y reglas de los datos

Documento de referencia para consultar la base de datos de En Minutas (Supabase / Postgres, proyecto "Minutas").
Foto tomada el **2026-09-26**. La base es de **producción y cambia todo el tiempo**: las cifras de este documento
son ilustrativas, las reglas son lo importante. Ante cualquier duda, consultá el dato vivo con SQL.

Acceso: solo lectura (SELECT) sobre el schema `public`. No se puede leer `auth` (usuarios y roles internos).

---

## 1. El negocio

- **Cooperativa de Trabajo Il Pane Nostro Ltda.** (marca **En Minutas**), Garupá, Misiones. Elabora alimentos congelados:
  chipá, empanadas, pizzas, tartas y rebozados de mandioca.
- Hoy vende **solo B2B mayorista**: distribuidores, gastronomía, minoristas y algunos clientes con condiciones especiales.
  Un pedido lo carga el equipo (admin o preventista) o lo hace el cliente desde su portal.
- Moneda **ARS**. IVA **21 %**. Zona horaria **Argentina (UTC-3, sin horario de verano)**.
- La app (Next.js + Supabase) está en producción real desde 2026-06-03. Los pedidos de prueba se limpiaron:
  **todo lo que hay hoy es real**. El primer pedido real es de fines de junio de 2026.
- Roles internos del sistema: admin, vendedor (preventista), producción, distribución (repartidor).
  Además existe una **comercializadora** que cobra comisión sobre todos los clientes (ver sección 6).

Volumen aproximado al 2026-09-26: 236 pedidos (233 B2B + 3 muestras), 75 productos (55 a la venta, 18 presentaciones de muestra
`es_muestra` y 2 inactivos), 36 clientes con pedidos B2B, 20 zonas de entrega.

---

## 2. Ciclo de vida del pedido

```
aprobado → enviado_prod → despachado → en_distribucion → delivered → liquidado
                                              └→ entrega_parcial → liquidado
cualquier estado → cancelled
```

| Estado | Significado | Pedidos al 26/9 |
|---|---|---|
| `aprobado` | Aprobado por admin, pendiente de producción | 6 |
| `enviado_prod` | Pasado a cocina / producción | 0 |
| `despachado` | Salió del depósito (repartidor, patente y fecha en `despacho_info`) | 0 |
| `en_distribucion` | En reparto | 2 |
| `delivered` | Entregado completo | 135 |
| `entrega_parcial` | Entregado incompleto (el faltante se cierra, ver sección 5) | 14 |
| `liquidado` | Entregado y cerrado administrativamente. Estado final, posterior a `delivered` | 36 |
| `cancelled` | Anulado | 43 |

`pending_payment` es un estado **transitorio válido**: es donde entran los pedidos que hace el cliente desde el portal y las muestras que solicita un vendedor, hasta que un admin los aprueba (hoy no hay ninguno en ese estado).

El enum `order_status` tiene además valores **heredados de una etapa B2C que hoy no se usa**:
`payment_review`, `paid`, `preparing`, `ready`, `in_delivery`, `shipped`, `refunded`.
Ningún pedido está hoy en esos estados; si aparecen, son una anomalía a señalar.

**Conjuntos de estados que hay que usar (definidos así en el código de la app):**

| Concepto | Estados |
|---|---|
| Ventas firmes (pedidos "en firme") | `aprobado`, `enviado_prod`, `despachado`, `en_distribucion`, `entrega_parcial`, `delivered`, `liquidado` |
| Entregado (lo que devenga comisión y se considera facturación real) | `delivered`, `entrega_parcial`, `liquidado` |
| Nunca contar como venta | `cancelled` y los estados heredados |

Regla por defecto: si te piden "ventas" sin más aclaración, usá **entregado** y decilo. Si piden "pedidos" o "cartera de
pedidos", usá **ventas firmes**. Aclaralo siempre en la respuesta.

**Fechas del pedido en `orders`:** `created_at` (alta), `aprobado_at`, `despachado_at`, `entregado_at` (entrega).
El historial de cambios de estado está en `order_events` (una fila por cambio, con `status`, `message`, `created_at`).

**Numeración:** `B2B-AAAA-NNNN` para pedidos, `MST-AAAA-NNNN` para muestras (numeración global unificada).

---

## 3. Reglas de oro y trampas (leer antes de consultar)

1. **Cliente B2B: NO filtres por `profiles.role`.** Está desincronizado y deja clientes afuera (hay clientes con pedidos B2B cuyo `role` no es `'customer_b2b'`).
   `b2b_status IS NOT NULL` y `canal_id IS NOT NULL` sirven para *listar* clientes (47 y 46 de 65 perfiles; los 36 con pedidos
   tienen ambos), pero no son exactos.
   Forma más segura: partir de `orders WHERE channel = 'b2b_mayorista'` y unir con `profiles` por `customer_id`
   (o, para listar clientes, `profiles.canal_id IS NOT NULL`).
2. **Canal de precio del cliente = `profiles.canal_id` → `canales`** (slugs: `dist`, `gastro`, `min`, `tanda`, y `eve` inactivo).
   La columna `profiles.canal` (enum dist/gastro/min) es **heredada** y solo la tienen 18 perfiles: no la uses.
3. **Roles internos no visibles.** Vendedores, producción, distribución y admin viven en `auth.users` (no accesible para vos).
   Lo que sí ves: `profiles.vendedor_id` (preventista asignado al cliente), `profiles.comision_preventista_pct`,
   `profiles.es_comercializadora`. El perfil del preventista está en `profiles` con el mismo `id`.
4. **Precios: las columnas de precio de `products` son heredadas.** No uses `precio_lista`, `precio_dist`, `precio_gastro`,
   `precio_min`, `price_b2b`, `price_b2c` ni `margen_dist/gastro/min` de `products`. El precio de catálogo se **calcula al
   momento** (fórmula en sección 4) y no está guardado. Para cualquier análisis histórico usá lo que quedó en el pedido:
   `order_lines.unit_price`, `order_lines.line_total` y `order_lines.product_snapshot`.
5. **Nombre y datos de producto históricos:** `order_lines.product_snapshot` (jsonb) guarda `name`, `precio`, `unit_label`,
   `bolsas_caja`, `canal` tal como eran al pedir. El producto actual puede haber cambiado de nombre.
6. **`order_lines.quantity` NO siempre son cajas.** Cada producto se vende en su unidad (`product_snapshot->>'unit_label'`):
   "caja 4 bolsas x 30u", "Bolsas x 10kg", "Bolsa x 60uni", etc. **No sumes cantidades de productos distintos** sin agrupar
   por unidad; para comparar productos usá `line_total` (dinero) o convertí por unidad.
7. **Muestras** (`channel = 'muestra'`, numeración `MST-`): salen sin costo, no son ventas. Excluilas de ventas y facturación. Las **presentaciones de muestra** son productos con
   `products.es_muestra = true` (18 al 26/9): no se venden, así que no las incluyas en análisis de catálogo, precios ni ventas.
8. **Cancelados siempre afuera** salvo que pidan analizar cancelaciones.
9. **Zona horaria.** Los `timestamptz` están en UTC. Para agrupar por día o mes en hora argentina:
   `col AT TIME ZONE 'America/Argentina/Buenos_Aires'`. El mes de una entrega se define por `entregado_at` en hora AR
   (si es null, `created_at`). Las columnas `date` (como `pagos.fecha`) ya son fecha calendario, no las conviertas.
10. **Montos con IVA.** `orders.total` es **con IVA** e incluye descuento aplicado y cargo adicional
    (`cargo_adicional_monto`, con concepto en `cargo_adicional_concepto`: flete, IIBB u otro). Convención de la app para
    "sin IVA": `total / 1.21`. Aclará siempre si un monto es con o sin IVA.
11. **Los datos cambian.** Es producción en vivo; una consulta de hoy puede no dar lo mismo mañana. Poné siempre la fecha/hora
    de corte en los informes.
12. **Muchas tablas están vacías** (funciones aún no usadas). Antes de armar un informe sobre una tabla, mirá si tiene filas
    (sección 9).

---

## 4. Precios y montos

Precio de catálogo B2B por caja (función `calcularPrecio`, "v5"), calculado con datos de `products`, `canales`,
`parametros_globales` y `delivery_zones`:

```
margen         = margen_std | margen_premium  (del canal; premium si products.categoria = 'Premium')
lista_siva     = (costo × bolsas_caja) / (1 − margen)          -- costo = total por bolsa, incluye packaging
lista_civa     = lista_siva × (1 + iva_pct)                     -- iva_pct = 0.21
comision       = lista_siva × comision_pct                      -- override del cliente si existe; si no, 0.15. Sin IVA
flete (CIF)    = lista_siva × flete_pct × (1 + iva_pct)         -- flete_pct = override del cliente si existe; si no, el de su zona
final_civa     = round(lista_civa + comision + flete)            -- lo que paga el cliente por caja
precio_unidad  = final_civa / (u_bolsa × bolsas_caja)   (o × divisiones_display si está cargado)
```

- `products.costo` es el costo **por bolsa**; el costo de la caja es `costo × bolsas_caja`.
- Márgenes vigentes (`canales`, 2026-09-26): Distribuidor 40 % std / 45 % premium; Gastronomía 45 % / 50 %;
  Minorista 50 % / 55 %; TANDA 40 % / 35 %. `canales.descuento_pct` guarda un descuento por canal
  (Distribuidor 15, Gastronomía 8). Existen también `profiles.descuento_extra_pct` (descuento del cliente) y
  `volume_discounts` (descuento por volumen). Lo efectivamente aplicado queda en `orders.discount` y en los precios de cada línea.
- `parametros_globales`: `iva_pct = 0.21`, `comision_pct = 0.15`.
- **Overrides por cliente** (en `profiles`): `comision_pct_override` (NULL = usa el global; 0 = sin comisión; 6 clientes en 0 %) y
  `flete_pct_override` (NULL = usa el de su zona; 0 = sin flete; x = % propio; hoy ningún cliente lo usa). El flete por zona está
  en `delivery_zones.flete_pct`: al 26/9 solo 2 de las 20 zonas tienen flete mayor a 0.
- **Se congela en el pedido:** `order_lines.product_snapshot.precio` guarda el desglose de precio de cada línea, y `orders.flete_pct`
  y `orders.comision_pct` guardan los % vigentes al crear el pedido (`comision_pct` NULL = se usa el % vigente del cliente).
  Los pedidos anteriores al 25/9 tienen `flete_pct = 0`.
- El **costo del producto está en `products.costo`** (y `lotes.costo_unitario` para lotes de producción). Margen real de un
  pedido = comparar `order_lines.line_total` contra costo, pero el precio incluye IVA y comisión: descontalos.

---

## 5. Entrega parcial (modelo vigente desde 2026-09-23)

- Al confirmar una entrega parcial, **`order_lines.quantity/line_total` y `orders.subtotal/total` quedan con lo ENTREGADO**.
  Lo pedido originalmente queda solo en `orders.delivered_snapshot`:
  `{ lineas: [ { productId, name, pedido, entregado } ], timestamp }`. Las entregas parciales **nuevas** además guardan
  `motivo` (`sin_stock`, `rechazado`, `danado`, `otro`) y `total_original`; los parciales anteriores al 23/9 solo tienen
  `lineas` y `timestamp`.
- El faltante **se cierra** (no queda pedido pendiente). Opcionalmente un admin puede generar **un pedido nuevo** con el faltante:
  queda enlazado por `orders.origen_order_id` (apunta al pedido original) y con `orders.fecha_compromiso`.
  Ese pedido nuevo **no es demanda nueva**: no lo cuentes como cliente adicional ni sumes su monto a "lo pedido" del original.
- Consecuencia práctica: para ventas/facturación usá `orders.total` y `order_lines` tal cual (ya reflejan lo entregado).
  Para medir **fill rate / faltantes** comparás `pedido` vs `entregado` en `delivered_snapshot->'lineas'`.

---

## 6. Comisiones (preventistas y comercializadora)

Fuente de verdad: pantalla **/admin/comisiones** de la app y su export CSV. Si un cálculo por SQL no coincide con esa
pantalla, prevalece la pantalla y hay que avisarlo.

**Devengo:** la comisión de un pedido se genera **al entregarse** (`delivered`, `entrega_parcial`, `liquidado`, canal
`b2b_mayorista`) y cae en el **mes de `entregado_at`** en hora argentina. **Un pedido sin `entregado_at` no comisiona**
(ya no se usa `created_at` como reemplazo): por ejemplo, un pedido pasado a `liquidado` sin haberse entregado no genera comisión.

**Pool por cliente:** cada cliente tiene un "pool" de comisión = `orders.comision_pct` del pedido (congelado al crearlo) o, si es
NULL, `profiles.comision_pct_override` del cliente, y si también es NULL, `parametros_globales.comision_pct` (15 %). Es el
porcentaje que ese cliente ya lleva **dentro de su precio**. Si el pool es 0, **nadie cobra comisión sobre ese cliente**
(hoy 6 clientes están en 0 % por decisión comercial: TANDA y las sucursales de Panadería Petri).

**Fórmula por pedido** (con y sin factura por igual; ya **no** se usan los pagos `sin_factura` como base):

```
base                 = orders.total − orders.cargo_adicional_monto      -- con IVA; el cargo adicional manual no comisiona
divisor              = 1 + iva_pct + pool + flete_pct × (1 + iva_pct)   -- flete_pct = orders.flete_pct (flete CIF incluido en el precio)
comisión_total       = base × pool / divisor
preventista          = base × min(comision_preventista_pct, pool) / divisor
comercializadora     = comisión_total − preventista
```

El flete CIF que el precio lleva incluido **queda fuera de la base** (por eso está en el divisor).

**Reparto:** el preventista asignado al cliente (`profiles.vendedor_id`) se queda con su `comision_preventista_pct`
(tope: el pool). La comercializadora (`profiles.es_comercializadora = true`, hay un solo perfil) se queda con el resto del
pool de **todos** los clientes, tengan o no preventista. Si el preventista asignado es la propia comercializadora, se lleva
todo el pool.

**Devoluciones:** una devolución aprobada o cerrada **descuenta** comisión, como ajuste negativo en el mes de
`devoluciones.fecha` y con el % vigente del cliente. No reabre meses ya pagados (si el mes estaba pagado, queda como ajuste a
compensar). La tabla `devoluciones` está hoy vacía.

**Pagos de comisión:** tabla `comisiones_pagos` (una fila por vendedor + mes + cliente, con `monto`, `pct`, `ventas`
congelados al pagar). Admite montos **negativos** (ajustes a compensar). Al pagar, la app recalcula los montos en el servidor;
si después del pago hubo nuevas entregas de ese mes, la pantalla muestra la diferencia como "extra" para pagarla aparte.
Al 26/9 la tabla está **vacía**: todavía no se registró ningún pago de comisión.

---

## 7. Cobranzas y cuenta corriente

- `pagos`: cobros de clientes. `order_id` es null cuando es un **pago a cuenta** (sin pedido asociado); `grupo_id` agrupa un
  mismo cobro repartido entre varios pedidos; `sin_factura = true` marca cobros sin factura. Al 26/9: 34 pagos.
- **Deuda por pedido** (así la calcula la pantalla de cuentas corrientes): `orders.total − SUM(pagos.monto WHERE order_id = pedido)`.
  Ojo: los cobros no registrados en el sistema no aparecen, así que **la deuda calculada puede estar sobreestimada**; presentala
  como "deuda según lo registrado".
- Un pago solo pasa el pedido a `liquidado` si el pedido **ya fue entregado** (`delivered` o `entrega_parcial`). Un cobro anticipado
  no cambia el estado de un pedido que todavía está en camino.
- **No hay límite de crédito operativo:** la tabla `b2b_accounts` (donde la app busca el límite) está vacía, por eso la pantalla
  `/admin/cuentas-corrientes` de la app sale sin clientes y el límite no se aplica. La cobranza real se lleva desde la ficha de
  cada cliente y la tabla `pagos`.
- `cc_movimientos` es un libro de cuenta corriente con **muy pocos registros** (24: cargos y ajustes automáticos por pedido). No lo uses solo
  para saldos; la pantalla `/admin/cuentas-corrientes` es la referencia.
- `facturas` / `factura_items` (1 registro), `cheques` y `devoluciones` (vacías): módulos administrativos apenas usados.
  No hay integración fiscal con ARCA/AFIP en producción.

---

## 8. Stock, producción y costos

- **Stock de producto terminado real = `lotes`** (`activo = true`, `cantidad_actual`, con `fecha_vencimiento`). "Sin lotes = sin
  stock". `products.stock_cajas` es un acumulado que mantiene la app y puede diferir: ante diferencias, mandan los lotes.
- `stock_movements` (tipos `produccion`, `despacho`, `ajuste`, `muestra`) es el historial de movimientos de producto terminado.
  Revisá el signo de `qty` en cada tipo antes de sumar.
- `produccion`: producciones registradas (producto, `cantidad_cajas`, fecha, receta, `cantidad_lotes`).
- **Recetas:** `recipes` (una por producto, `yield_cajas` = cajas que rinde, `vida_util_dias`), `recipe_ingredients`
  (insumo, cantidad, unidad, costo) y `recipe_steps`.
- **Insumos:** `insumos` (48; `stock_actual`, `stock_minimo`, `punto_pedido`, `precio_unitario`, `categoria`),
  `insumos_movimientos` (`ingreso` / `egreso` / `ajuste`), `categorias_insumos`.
- **Compras / recepción de mercadería:** `recepciones` (cabecera: proveedor, número, total y su desglose `neto` + `iva` + `percepciones`; `otros_impuestos` es copia de `percepciones`, no sumarlos) y
  `recepciones_items` (insumo, cantidad, `precio_unitario`, `iva_pct`, `fecha_vencimiento`).

---

## 9. Qué tablas se usan y cuáles están vacías (al 2026-09-26)

**Con datos:** `profiles` (65), `products` (75), `categories` (9), `canales` (5), `delivery_zones` (20),
`direcciones_entrega` (35), `orders` (236), `order_lines` (716), `order_events` (2.121), `pagos` (34), `cc_movimientos` (24),
`lotes` (95), `stock_movements` (481), `produccion` (24), `recipes` (26), `recipe_ingredients` (215), `recipe_steps` (70),
`insumos` (48), `insumos_movimientos` (310), `recepciones` (16), `recepciones_items` (31), `lineas_producto` (8),
`disponibilidad_lineas` (5), `volume_discounts` (3), `parametros_globales` (2), `depositos` (1), `pipeline_prospectos` (1), `facturas` (1),
`factura_items` (1), `contenido_web` (66, textos del sitio), `categorias_insumos` (11), `platform_settings` (1).

**Vacías (funciones todavía sin uso):** `comisiones_pagos`, `cheques`, `devoluciones`, `devolucion_items`, `precios_cliente`
(precios especiales por cliente), `contact_logs`, `plantillas_pedido`, `plantilla_items`,
`objetivos_ventas`, `sales_goals`, `b2b_accounts`.

**Heredadas de una etapa B2C / plataforma IDEIA (sin uso):** `addresses`, `product_variants`, `driver_locations`,
`ideia_liquidations`, `platform_settings.ideia_commission_rate`, `orders.ideia_commission_*`, `orders.mp_*` (Mercado Pago),
`products.price_b2c`.

---

## 10. Consultas de ejemplo (probadas contra la base real)

Ventas entregadas por mes (con y sin IVA):
```sql
SELECT to_char(entregado_at AT TIME ZONE 'America/Argentina/Buenos_Aires','YYYY-MM') AS mes,
       count(*) AS pedidos, round(sum(total)) AS total_civa, round(sum(total)/1.21) AS total_siva
FROM orders
WHERE channel = 'b2b_mayorista' AND status IN ('delivered','entrega_parcial','liquidado')
GROUP BY 1 ORDER BY 1;
```

Ventas entregadas por canal de precio del cliente:
```sql
SELECT c.nombre AS canal, count(DISTINCT o.id) AS pedidos, round(sum(o.total)) AS total_civa
FROM orders o
JOIN profiles p ON p.id = o.customer_id
JOIN canales  c ON c.id = p.canal_id
WHERE o.channel = 'b2b_mayorista' AND o.status IN ('delivered','entrega_parcial','liquidado')
GROUP BY 1 ORDER BY 3 DESC;
```

Productos más vendidos en dinero (con su unidad de venta):
```sql
SELECT pr.name AS producto, l.product_snapshot->>'unit_label' AS unidad,
       sum(l.quantity) AS cantidad, round(sum(l.line_total)) AS total_civa
FROM order_lines l
JOIN orders   o  ON o.id = l.order_id
JOIN products pr ON pr.id = l.product_id
WHERE o.channel = 'b2b_mayorista' AND o.status IN ('delivered','entrega_parcial','liquidado')
GROUP BY 1,2 ORDER BY 4 DESC LIMIT 10;
```

Deuda por cliente según lo registrado (pedidos entregados menos pagos con pedido asociado):
```sql
SELECT p.full_name AS cliente, count(*) AS pedidos_con_saldo,
       round(sum(o.total - coalesce(pg.pagado,0))) AS saldo
FROM orders o
JOIN profiles p ON p.id = o.customer_id
LEFT JOIN (SELECT order_id, sum(monto) AS pagado FROM pagos WHERE order_id IS NOT NULL GROUP BY order_id) pg
       ON pg.order_id = o.id
WHERE o.channel = 'b2b_mayorista' AND o.status IN ('delivered','entrega_parcial','liquidado')
  AND o.total - coalesce(pg.pagado,0) > 0.5
GROUP BY 1 ORDER BY 3 DESC;
```

Stock de producto terminado por producto (desde lotes):
```sql
SELECT pr.name AS producto, sum(l.cantidad_actual) AS stock, min(l.fecha_vencimiento) AS proximo_vencimiento
FROM lotes l JOIN products pr ON pr.id = l.producto_id
WHERE l.activo AND l.cantidad_actual > 0
GROUP BY 1 ORDER BY 2 DESC;
```

Entregas parciales: pedido vs entregado por producto:
```sql
SELECT o.order_number, l->>'name' AS producto,
       (l->>'pedido')::numeric AS pedido, (l->>'entregado')::numeric AS entregado
FROM orders o, jsonb_array_elements(o.delivered_snapshot->'lineas') l
WHERE o.delivered_snapshot IS NOT NULL
ORDER BY o.entregado_at DESC NULLS LAST;
```

---

## 11. Límites de tu acceso

- Solo lectura; cada consulta se corta a los **30 segundos**. Usá `LIMIT` y agregá por período en vez de traer filas crudas.
- No podés leer `auth` (emails, roles internos). Si un informe necesita "quién es el vendedor X", usá `profiles`.
- Hay datos personales de clientes (nombre, teléfono, dirección, documento). Usalos solo si el informe lo necesita y no los
  copies a lugares públicos.
- Si una consulta da un resultado raro (cero, vacío, cifras enormes), sospechá primero de un filtro de esta guía
  (rol, estado, canal, zona horaria) antes de concluir que el negocio es así.
