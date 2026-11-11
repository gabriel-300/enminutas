-- Registrar quién hizo cada cambio de estado de un pedido.
-- El trigger log_order_event insertaba order_events sin actor_id. Ahora toma el usuario de
-- orders.status_changed_by, que la app setea junto con cada cambio de status.
alter table public.orders add column if not exists status_changed_by uuid references auth.users(id);

create or replace function public.log_order_event()
returns trigger language plpgsql security definer as $$
begin
  if (tg_op = 'INSERT') or (old.status is distinct from new.status) then
    insert into public.order_events (order_id, status, actor_id)
    values (new.id, new.status, new.status_changed_by);
  end if;
  return new;
end; $$;
