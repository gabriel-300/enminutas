-- Permite marcar la nota interna de un pedido como visible para el cliente
-- (se muestra en el remito impreso). Por defecto queda oculta (solo staff).
alter table public.orders
  add column if not exists notes_visible_cliente boolean not null default false;
