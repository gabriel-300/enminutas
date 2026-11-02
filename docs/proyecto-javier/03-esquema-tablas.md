# Esquema de tablas — base En Minutas (schema public)

Generado el 2026-09-26 desde la base real (47 tablas). Formato: `columna tipo`; `PK` = clave primaria; `->tabla` = clave foránea; `{a|b}` = valores permitidos del enum; `CHECK[...]` = restricción.
Las filas entre paréntesis son la cantidad de registros a esa fecha. Tablas en 0 filas = funciones aún sin uso. Ver reglas y trampas en el documento de conocimiento del negocio.
Ojo: `->auth.users` apunta al schema `auth`, que no es accesible.

### profiles (65 filas)
id uuid PK ->auth.users, role user_role{customer_b2c|customer_b2b|repartidor|admin_enminutas|admin_ideaia}, full_name text, phone text, document_type text, document_number text, created_at timestamptz, updated_at timestamptz, canal client_canal{dist|gastro|min}, zona_id uuid ->delivery_zones, b2b_status text CHECK[b2b_status = ANY 'pendiente', 'activo', 'inactivo'], vendedor_id uuid ->auth.users, notas_internas text, direccion_calle text, direccion_numero text, direccion_piso text, direccion_ciudad text, descuento_extra_pct numeric CHECK[descuento_extra_pct >= 0::numeric AND descuento_extra_pct < 100::numeric], canal_id uuid ->canales, comision_preventista_pct numeric, comision_pct_override numeric, es_comercializadora bool, flete_pct_override numeric CHECK[flete_pct_override IS NULL OR flete_pct_override >= 0::numeric AND flete_pct_override < 1::numeric], plazo_pago_dias int4 (null = 30 días)

### b2b_accounts (0 filas)
id uuid PK, profile_id uuid ->profiles, business_name text, cuit text, iva_condition text, status b2b_status{pending|approved|rejected|suspended}, credit_limit numeric, current_balance numeric, approved_by uuid ->profiles, approved_at timestamptz, notes text, created_at timestamptz, domicilio_fiscal text

### addresses (0 filas)
id uuid PK, profile_id uuid ->profiles, label text, street text, number text, floor text, apartment text, city text, province text, postal_code text, reference text, lat numeric, lng numeric, is_default bool, created_at timestamptz

### categories (9 filas)
id uuid PK, slug text, name text, description text, image_url text, sort_order int4, is_active bool, created_at timestamptz, visible_en_tienda bool

### products (75 filas)
id uuid PK, sku text, slug text, name text, short_description text, description text, category_id uuid ->categories, price_b2c numeric, price_b2b numeric, min_quantity_b2b int4, unit_label text, weight_grams int4, freezer_required bool, is_active bool, cover_image_url text, gallery_urls jsonb, metadata jsonb, created_at timestamptz, updated_at timestamptz, costo numeric, kg_caja numeric, bolsas_caja int4, pkg_unitario numeric, pkg_bulto numeric, margen_dist numeric, margen_gastro numeric, margen_min numeric, mult_bolsas bool, extra_images _text, cooking_methods _text, stock_cajas numeric, stock_minimo int4, precio_dist numeric, precio_gastro numeric, precio_min numeric, precio_lista numeric, codigo int4, presentacion text, u_bolsa int4, linea_id int4 ->lineas_producto, categoria text CHECK[categoria = ANY 'Estándar', 'Premium'], divisiones_display int4, es_muestra bool, vida_util_dias int4, receta_producto_id uuid ->products

### product_variants (0 filas)
id uuid PK, product_id uuid ->products, sku text, name text, price_b2c_delta numeric, price_b2b_delta numeric, stock int4, is_active bool

### delivery_zones (20 filas)
id uuid PK, name text, polygon jsonb, base_fee numeric, estimated_minutes int4, is_active bool, flete_kg numeric, km int4, precio_km numeric, capacidad_kg int4, codigo varchar, updated_at timestamptz, flete_pct numeric CHECK[flete_pct >= 0::numeric AND flete_pct < 1::numeric]

### orders (236 filas)
id uuid PK, order_number text, channel order_channel{b2c_nacional|b2b_mayorista|pedido_ya_local|muestra}, customer_id uuid ->profiles, guest_email text, guest_phone text, status order_status{pending_payment|payment_review|paid|preparing|ready|in_delivery|shipped|delivered|cancelled|refunded|aprobado|enviado_prod|despachado|en_distribucion|entrega_parcial|liquidado}, subtotal numeric, shipping_fee numeric, discount numeric, total numeric, ideia_commission_rate numeric, ideia_commission_amount numeric, shipping_method text, shipping_address_id uuid ->addresses, shipping_snapshot jsonb, delivery_zone_id uuid ->delivery_zones, direccion_entrega_id uuid ->direcciones_entrega, assigned_driver_id uuid ->profiles, tracking_number text, payment_method text, payment_declared_at timestamptz, payment_confirmed_at timestamptz, payment_confirmed_by uuid ->profiles, payment_proof_url text, mp_preference_id text, mp_payment_id text, notes text, created_at timestamptz, updated_at timestamptz, aprobado_por uuid ->profiles, aprobado_at timestamptz, despachado_at timestamptz, entregado_at timestamptz, delivered_snapshot jsonb, firma_data text, firma_fecha timestamptz, firma_aclaracion text, orden_ruta int4, muestra_destinatario text, despacho_info jsonb, muestra_observacion text, notes_visible_cliente bool, cargo_adicional_concepto text, cargo_adicional_monto numeric, origen_order_id uuid ->orders, fecha_compromiso date, muestra_contacto text, muestra_prospecto_id uuid ->pipeline_prospectos, solicitado_por uuid ->profiles, flete_pct numeric CHECK[flete_pct >= 0::numeric AND flete_pct < 1::numeric], comision_pct numeric CHECK[comision_pct IS NULL OR comision_pct >= 0::numeric AND comision_pct < 1::numeric]

### order_lines (716 filas)
id uuid PK, order_id uuid ->orders, product_id uuid ->products, variant_id uuid ->product_variants, product_snapshot jsonb, quantity int4 CHECK[quantity >= 0], quantity_original numeric NOT NULL, unit_price numeric, line_total numeric

### order_events (2121 filas)
id uuid PK, order_id uuid ->orders, status order_status{pending_payment|payment_review|paid|preparing|ready|in_delivery|shipped|delivered|cancelled|refunded|aprobado|enviado_prod|despachado|en_distribucion|entrega_parcial|liquidado}, message text, actor_id uuid ->profiles, created_at timestamptz

### driver_locations (0 filas)
driver_id uuid PK ->profiles, order_id uuid ->orders, lat numeric, lng numeric, heading numeric, speed_kmh numeric, updated_at timestamptz

### platform_settings (1 filas)
id int4 PK CHECK[id = 1], ideia_commission_rate numeric, bank_cbu text, bank_alias text, bank_holder text, cuit_emisor text, whatsapp_phone_display text, updated_at timestamptz

### ideia_liquidations (0 filas)
id uuid PK, period_start date, period_end date, total_gmv numeric, total_commission numeric, orders_count int4, status text, paid_at timestamptz, notes text, created_at timestamptz

### stock_movements (481 filas)
id uuid PK, product_id uuid ->products, qty numeric, type text CHECK[type = ANY 'produccion', 'despacho', 'ajuste', 'muestra'], order_id uuid ->orders, notes text, created_by uuid ->profiles, created_at timestamptz

### recipes (26 filas)
id uuid PK, product_id uuid ->products, yield_cajas numeric, notes text, created_at timestamptz, updated_at timestamptz, vida_util_dias int4

### recipe_steps (70 filas)
id uuid PK, recipe_id uuid ->recipes, step_order int4, description text, minutes numeric, notes text

### recipe_ingredients (215 filas)
id uuid PK, recipe_id uuid ->recipes, nombre text, cantidad numeric, unidad text, costo numeric, insumo_id uuid ->insumos

### sales_goals (0 filas)
id uuid PK, vendedor_id uuid ->profiles, mes text, objetivo numeric

### volume_discounts (3 filas)
id uuid PK, min_cajas int4, descuento_pct numeric, label text, activo bool

### contact_logs (0 filas)
id uuid PK, vendedor_id uuid ->profiles, cliente_id uuid ->profiles, tipo text, notas text, created_at timestamptz

### canales (5 filas)
id uuid PK, slug text, nombre text, descuento_pct numeric CHECK[descuento_pct >= 0::numeric AND descuento_pct < 100::numeric], activo bool, sort_order int4, created_at timestamptz, margen_std numeric, margen_premium numeric, markup_pvp numeric, margen_venta_directa numeric

### direcciones_entrega (puntos de entrega; un cliente tiene varios)
id uuid PK, profile_id uuid ->profiles, alias text (nombre de la sucursal), calle text, numero text, piso text, ciudad text, zona_id uuid ->delivery_zones, es_principal bool, activo bool, telefono text, notas_entrega text, created_at timestamptz
Regla: el cliente (profiles) es la razón social (un CUIT, una cuenta corriente); cada sucursal es una fila acá. orders.direccion_entrega_id indica a qué punto va cada pedido; la zona del pedido es orders.delivery_zone_id (no la del perfil).

### lineas_producto (8 filas)
id int4 PK, nombre text, orden int4, canal_exclusivo_id uuid ->canales

### disponibilidad_lineas (5 filas)
id uuid PK, linea_id int4 ->lineas_producto, disponible bool, desde date, hasta date, nota varchar, created_at timestamptz

### parametros_globales (2 filas)
clave text PK, valor numeric, descripcion text, actualizado_at timestamptz, actualizado_por uuid ->auth.users

### facturas (1 filas)
id uuid PK, tipo text CHECK[tipo = ANY 'A', 'B', 'C', 'NC'], punto_venta int4, numero int4, cliente_id uuid ->profiles, razon_social text, cuit text, condicion_iva text CHECK[condicion_iva = ANY 'responsable_inscripto', 'monotributista', 'consumidor_final', 'exento], domicilio_fiscal text, fecha_emision date, fecha_vencimiento date, pedido_refs _text, neto_gravado_21 numeric, neto_gravado_105 numeric, neto_no_gravado numeric, iva_21 numeric, iva_105 numeric, total numeric, condicion_pago text CHECK[condicion_pago = ANY 'contado', '30_dias', '60_dias', '90_dias', 'cheque'], observaciones text, estado text CHECK[estado = ANY 'borrador', 'emitida', 'cobrada', 'anulada'], numero_afip int4, cae text, cae_vencimiento date, created_at timestamptz, created_by uuid ->profiles, updated_at timestamptz

### factura_items (1 filas)
id uuid PK, factura_id uuid ->facturas, orden int4, descripcion text, cantidad numeric CHECK[cantidad > 0::numeric], unidad text, precio_unitario numeric CHECK[precio_unitario >= 0::numeric], alicuota_iva numeric CHECK[alicuota_iva = ANY 0::numeric, 10.5, 21::numeric], subtotal numeric, iva_monto numeric, total numeric

### cc_movimientos (24 filas)
id uuid PK, cliente_id uuid ->profiles, fecha date, tipo text CHECK[tipo = ANY 'cargo', 'pago', 'ajuste', 'nota_credito'], descripcion text, monto numeric, referencia text, factura_id uuid ->facturas, created_at timestamptz, created_by uuid ->profiles, order_id uuid ->orders

### lotes (95 filas)
id uuid PK, producto_id uuid ->products, numero_lote text, fecha_ingreso date, fecha_vencimiento date, cantidad_inicial numeric CHECK[cantidad_inicial > 0::numeric], cantidad_actual numeric CHECK[cantidad_actual >= 0::numeric], unidad text, proveedor text, costo_unitario numeric, observaciones text, activo bool, created_at timestamptz, created_by uuid ->profiles, deposito_id uuid ->depositos

### devoluciones (0 filas)
id uuid PK, pedido_id uuid ->orders, cliente_id uuid ->profiles, fecha date, motivo text, estado text CHECK[estado = ANY 'solicitada', 'aprobada', 'rechazada', 'cerrada'], monto_total numeric, observaciones text, cc_movimiento_id uuid ->cc_movimientos, created_at timestamptz, created_by uuid ->profiles, updated_at timestamptz

### devolucion_items (0 filas)
id uuid PK, devolucion_id uuid ->devoluciones, descripcion text, cantidad numeric CHECK[cantidad > 0::numeric], precio_unitario numeric CHECK[precio_unitario >= 0::numeric], subtotal numeric

### cheques (0 filas)
id uuid PK, cliente_id uuid ->profiles, numero_cheque text, banco text, librador text, monto numeric CHECK[monto > 0::numeric], fecha_emision date, fecha_acreditacion date, estado text CHECK[estado = ANY 'en_cartera', 'depositado', 'acreditado', 'rechazado'], observaciones text, cc_movimiento_id uuid ->cc_movimientos, created_at timestamptz, created_by uuid ->profiles, updated_at timestamptz

### objetivos_ventas (0 filas)
id uuid PK, anio int4 CHECK[anio >= 2024], mes int4 CHECK[mes >= 1 AND mes <= 12], canal text, monto_meta numeric CHECK[monto_meta >= 0::numeric], created_at timestamptz, created_by uuid ->profiles, updated_at timestamptz

### precios_cliente (0 filas)
id uuid PK, cliente_id uuid ->profiles, producto_id uuid ->products, tipo text CHECK[tipo = ANY 'precio_fijo', 'descuento_pct'], precio_fijo numeric, descuento_pct numeric, vigente_desde date, vigente_hasta date, notas text, created_at timestamptz, created_by uuid ->profiles, updated_at timestamptz

### pipeline_prospectos (1 filas)
id uuid PK, empresa text, contacto_nombre text, contacto_telefono text, contacto_email text, zona text, canal_objetivo text, estado prospecto_estado{nuevo|contactado|interesado|propuesta_enviada|ganado|perdido}, valor_estimado numeric, preventista_id uuid ->profiles, fecha_proximo_contacto date, notas text, motivo_perdida text, convertido_cliente_id uuid ->profiles, created_at timestamptz, created_by uuid ->profiles, updated_at timestamptz, direccion text

### plantillas_pedido (0 filas)
id uuid PK, cliente_id uuid ->profiles, nombre text, created_at timestamptz, updated_at timestamptz

### plantilla_items (0 filas)
id uuid PK, plantilla_id uuid ->plantillas_pedido, producto_id uuid ->products, cantidad int4 CHECK[cantidad > 0], created_at timestamptz

### depositos (1 filas)
id uuid PK, nombre text, descripcion text, direccion text, activo bool, created_at timestamptz, updated_at timestamptz

### insumos (48 filas)
id uuid PK, nombre text, unidad text, precio_unitario numeric, proveedor text, notas text, updated_at timestamptz, created_at timestamptz, stock_actual numeric, stock_minimo numeric, punto_pedido numeric, stock_maximo numeric, categoria text

### pagos (34 filas)
id uuid PK, cliente_id uuid ->profiles, monto numeric CHECK[monto > 0::numeric], fecha date, metodo text, referencia text, notas text, created_by uuid ->auth.users, created_at timestamptz, order_id uuid ->orders, factura_numero text, sin_factura bool, grupo_id uuid

### insumos_movimientos (310 filas)
id uuid PK, insumo_id uuid ->insumos, tipo text CHECK[tipo = ANY 'ingreso', 'egreso', 'ajuste'], cantidad numeric, motivo text, referencia_id uuid, notas text, created_by uuid ->profiles, created_at timestamptz

### produccion (24 filas)
id uuid PK, producto_id uuid ->products, receta_id uuid ->recipes, cantidad_cajas numeric CHECK[cantidad_cajas > 0::numeric], fecha date, notas text, created_by uuid ->profiles, created_at timestamptz, cantidad_lotes numeric

### categorias_insumos (11 filas)
id uuid PK, nombre text, valor text, color text, orden int4, created_at timestamptz

### recepciones (16 filas)
id uuid PK, tipo text CHECK[tipo = ANY 'factura', 'remito', 'gasto'], numero text, proveedor text, fecha date, notas text, total numeric, created_by uuid ->profiles, created_at timestamptz, otros_impuestos numeric, imagen_url text, proveedor_cuit text, proveedor_id uuid ->proveedores, fecha_vencimiento_pago date, genera_deuda boolean, categoria_gasto text CHECK[luz|agua|gas|internet_telefono|alquiler|impuestos|servicios|otros]

### proveedores
id uuid PK, nombre text, cuit text, condicion_pago_dias int4, contacto text, telefono text, email text, notas text, activo boolean, created_at timestamptz

### pagos_proveedores
id uuid PK, proveedor_id uuid ->proveedores, recepcion_id uuid ->recepciones (null = a cuenta), monto numeric CHECK[monto > 0], fecha date, metodo text, referencia text, notas text, grupo_id uuid, created_by uuid, created_at timestamptz

### recepciones_items (31 filas)
id uuid PK, recepcion_id uuid ->recepciones, insumo_id uuid ->insumos, cantidad numeric CHECK[cantidad > 0::numeric], unidad text, precio_unitario numeric, subtotal numeric, iva_pct numeric, fecha_vencimiento date

### contenido_web (66 filas)
clave text PK, seccion text, etiqueta text, tipo text, valor text, actualizado_en timestamptz

### comisiones_pagos (0 filas)
id uuid PK, vendedor_id uuid ->profiles, cliente_id uuid ->profiles, mes text, monto numeric, pct numeric, ventas numeric, fecha_pago date, notas text, created_at timestamptz, created_by uuid ->profiles

