# Migraciones

**Las migraciones nuevas van en `supabase/migrations/`**, con nombre `YYYYMMDDHHMMSS_descripcion.sql`.
Se aplican con `apply_migration` (MCP de Supabase) usando el mismo nombre, así el historial de la base y el repo coinciden.

- Tablas creadas por SQL puro necesitan `GRANT ALL` explícito a `anon`, `authenticated` y `service_role`.
- Un valor nuevo de `order_status` requiere `ALTER TYPE ... ADD VALUE` (es un ENUM de PostgreSQL).
- Después de cambiar el esquema, regenerar `src/types/database.ts` (`generate_typescript_types`).
- Nunca commitear SQL de borrado masivo: la base tiene pedidos y clientes reales.

## `legacy/`

Scripts históricos (`002`–`048`, `combined_migration.sql`, `cms-nuevos-campos.sql`) que se corrían a mano en el SQL Editor,
antes de usar `supabase/migrations/`. Se conservan sólo como referencia: **no volver a ejecutarlos**. Varios son seeds/resets de
datos demo, y `048_limpiar_pedidos.sql` borra todos los pedidos.

## Estado conocido (2026-09-21)

El historial de migraciones aplicado en la base sólo arranca el 2026-06-22; el esquema anterior salió de los scripts de `legacy/`.
Hay migraciones aplicadas en la base que no tienen archivo en `supabase/migrations/`:
`fix_decrement_stock_return_boolean`, `fix_fk_contact_logs_sales_goals_to_profiles`, `rename_ideaia_to_ideia`,
`rename_platform_settings_ideaia_col`, `depositos`, `muestras_enum_columns`, `muestras_index`, `despacho_info`,
`muestra_observacion`, `cc_movimientos_order_id`, `profiles_comision_pct_override`, `contenido_web_cms`,
`categories_image_description`, `lineas_canal_exclusivo`.
Por eso el repo no alcanza para reconstruir la base desde cero; la fuente de verdad es la base de producción.
Pendiente: tomar un dump del esquema actual como línea base.
