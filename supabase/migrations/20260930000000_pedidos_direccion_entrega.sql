-- Punto de entrega = direcciones_entrega (ya existente: varias por cliente, una principal).
-- Etapa 1 (aditiva): el pedido pasa a apuntar a su punto de entrega y la tabla gana
-- teléfono/notas de entrega. NO toca direccion_*/zona_id de profiles (siguen vigentes
-- hasta que el código lea del punto).

alter table public.direcciones_entrega
  add column if not exists telefono      text,
  add column if not exists notas_entrega text;

-- Clientes B2B sin ninguna dirección cargada pero con datos de dirección/zona en el perfil:
-- se crea su punto principal desde el perfil.
insert into public.direcciones_entrega
  (profile_id, alias, calle, numero, piso, ciudad, zona_id, es_principal, telefono)
select p.id,
       coalesce(nullif(trim(p.full_name), ''), 'Principal'),
       p.direccion_calle, p.direccion_numero, p.direccion_piso,
       p.direccion_ciudad, p.zona_id, true, p.phone
from public.profiles p
where p.b2b_status is not null
  and (p.direccion_calle is not null or p.zona_id is not null)
  and not exists (select 1 from public.direcciones_entrega d where d.profile_id = p.id);

-- Pedidos: vínculo al punto de entrega (nullable; B2C/guest quedan en null)
alter table public.orders
  add column if not exists direccion_entrega_id uuid
  references public.direcciones_entrega(id) on delete set null;

create index if not exists orders_direccion_entrega_idx on public.orders(direccion_entrega_id);

-- Backfill solo donde no hay ambigüedad: el cliente tiene exactamente una dirección.
update public.orders o
set direccion_entrega_id = d.id
from public.direcciones_entrega d
where d.profile_id = o.customer_id
  and o.direccion_entrega_id is null
  and (select count(*) from public.direcciones_entrega x where x.profile_id = o.customer_id) = 1;
