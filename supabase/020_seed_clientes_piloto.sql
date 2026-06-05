-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Carga inicial de clientes B2B — Piloto
-- Contraseña temporal: Minutas2024!
-- Idempotente: se puede correr múltiples veces sin error
-- ══════════════════════════════════════════════════════════════════════

-- ── 1. Zonas Interior ────────────────────────────────────────────────
insert into public.delivery_zones (name, polygon, base_fee, estimated_minutes, flete_kg)
values
  ('Interior Ruta 12', '{"type":"Point","coordinates":[]}'::jsonb, 0, 0, 450),
  ('Interior Ruta 14', '{"type":"Point","coordinates":[]}'::jsonb, 0, 0, 450)
on conflict do nothing;

-- ── 2. Clientes ──────────────────────────────────────────────────────
do $$
declare
  v_id           uuid;
  v_zona_posadas uuid;
  v_zona_r12     uuid;
  v_zona_r14     uuid;
begin
  -- Limpiar perfiles huérfanos (sin auth.user correspondiente)
  delete from public.profiles
  where id not in (select id from auth.users);

  -- Obtener zonas
  select id into v_zona_posadas from public.delivery_zones
    where name ilike '%posadas%' or name ilike '%NEA%' or name ilike '%costanera%'
    order by name limit 1;
  select id into v_zona_r12 from public.delivery_zones where name ilike '%ruta 12%' limit 1;
  select id into v_zona_r14 from public.delivery_zones where name ilike '%ruta 14%' limit 1;

  if v_zona_posadas is null then raise exception 'No se encontró zona Posadas'; end if;
  if v_zona_r12     is null then raise exception 'No se encontró Interior Ruta 12'; end if;
  if v_zona_r14     is null then raise exception 'No se encontró Interior Ruta 14'; end if;

  -- ── Macro para crear un cliente ─────────────────────────────────────
  -- Si el auth.user ya existe: obtiene su ID y actualiza el perfil.
  -- Si no existe: lo crea todo desde cero.

  -- 01 · YPF Alem R14
  select id into v_id from auth.users where email = 'ypf-alem-r14@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ypf-alem-r14@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"YPF Alem R14"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'ypf-alem-r14@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','ypf-alem-r14@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'YPF Alem R14','customer_b2b','gastro',v_zona_r14,'activo',null,'cuit','30543294760','Ruta Nac 14 y Progresiva','851','Leandro N. Alem','Razón social: Adolfo Sartori S.A.')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 02 · YPF Alem Centro
  select id into v_id from auth.users where email = 'ypf-alem-centro@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ypf-alem-centro@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"YPF Alem Centro"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'ypf-alem-centro@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','ypf-alem-centro@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'YPF Alem Centro','customer_b2b','gastro',v_zona_r14,'activo','3754422730','cuit','30543294760','Av. Belgrano','977','Leandro N. Alem','Razón social: Adolfo Sartori S.A.')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 03 · YPF Jauretche
  select id into v_id from auth.users where email = 'ypf-jauretche@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ypf-jauretche@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"YPF Jauretche"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'ypf-jauretche@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','ypf-jauretche@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'YPF Jauretche','customer_b2b','gastro',v_zona_posadas,'activo','3764487387','cuit','30543294760','Av. Quaranta','6450','Posadas','Razón social: Adolfo Sartori S.A.')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 04 · YPF Santa Ana
  select id into v_id from auth.users where email = 'ypf-santa-ana@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ypf-santa-ana@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"YPF Santa Ana"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'ypf-santa-ana@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','ypf-santa-ana@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_ciudad,notas_internas)
  values (v_id,'YPF Santa Ana','customer_b2b','gastro',v_zona_r12,'activo',null,'cuit','30543294760','Ruta 12 y 103','Santa Ana','Razón social: Adolfo Sartori S.A.')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, direccion_calle=excluded.direccion_calle, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 05 · YPF Garupá
  select id into v_id from auth.users where email = 'ypf-garupa@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ypf-garupa@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"YPF Garupá"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'ypf-garupa@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','ypf-garupa@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_ciudad,notas_internas)
  values (v_id,'YPF Garupá','customer_b2b','gastro',v_zona_posadas,'activo','3764270961','cuit','30543294760','Ntra Sra del Carmen y El Ceibo','Garupá','Razón social: Adolfo Sartori S.A.')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, direccion_calle=excluded.direccion_calle, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 06 · YPF Nueva
  select id into v_id from auth.users where email = 'ypf-nueva@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ypf-nueva@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"YPF Nueva"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'ypf-nueva@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','ypf-nueva@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_ciudad,notas_internas)
  values (v_id,'YPF Nueva','customer_b2b','gastro',v_zona_r12,'activo','3764458822','cuit','30543294760','Rta 12 y Av San Martín Colectora','Santa Ana','Razón social: Adolfo Sartori S.A.')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, direccion_calle=excluded.direccion_calle, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 07 · YPF Santa Catalina
  select id into v_id from auth.users where email = 'ypf-santa-catalina@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ypf-santa-catalina@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"YPF Santa Catalina"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'ypf-santa-catalina@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','ypf-santa-catalina@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_ciudad,notas_internas)
  values (v_id,'YPF Santa Catalina','customer_b2b','gastro',v_zona_posadas,'activo','3764458822','cuit','30543294760','Av. Santa Catalina y Francia','Posadas','Razón social: Adolfo Sartori S.A.')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, direccion_calle=excluded.direccion_calle, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 08 · YPF Alonso SRL
  select id into v_id from auth.users where email = 'ypf-alonso@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ypf-alonso@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"YPF Alonso SRL"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'ypf-alonso@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','ypf-alonso@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'YPF Alonso SRL','customer_b2b','gastro',v_zona_posadas,'activo','3764909065','cuit','30710383436','Av. Lopez y Planes','3524','Posadas','Razón social: YPF Alonso SRL')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 09 · YPF Cocomarola
  select id into v_id from auth.users where email = 'ypf-cocomarola@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ypf-cocomarola@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"YPF Cocomarola"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'ypf-cocomarola@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','ypf-cocomarola@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'YPF Cocomarola','customer_b2b','gastro',v_zona_posadas,'activo','3764454078','cuit','30710383436','Av. Cocomarola','7350','Posadas','Razón social: YPF Alonso SRL')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 10 · YPF Rta 213
  select id into v_id from auth.users where email = 'ypf-rta213@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ypf-rta213@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"YPF Rta 213"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'ypf-rta213@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','ypf-rta213@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'YPF Rta 213','customer_b2b','gastro',v_zona_posadas,'activo','3764457098','cuit','30710383436','Av. Alicia Moreau de Justo','7800','Posadas','Razón social: YPF Alonso SRL')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 11 · Shell Av. Uruguay
  select id into v_id from auth.users where email = 'shell-uruguay@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','shell-uruguay@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Shell Av. Uruguay"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'shell-uruguay@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','shell-uruguay@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'Shell Av. Uruguay','customer_b2b','gastro',v_zona_posadas,'activo','3764451300','cuit','30656256512','Av. Uruguay','5818','Posadas','Razón social: Estación Shell')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 12 · Nuestra Esencia
  select id into v_id from auth.users where email = 'nuestra-esencia@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','nuestra-esencia@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Nuestra Esencia"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'nuestra-esencia@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','nuestra-esencia@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'Nuestra Esencia','customer_b2b','gastro',v_zona_posadas,'activo','3764604928','cuit','23171707919','Colón','2111','Posadas','Razón social: Cabañas Walter Esteban')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 13 · Que Frío
  select id into v_id from auth.users where email = 'que-frio@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','que-frio@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Que Frío"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'que-frio@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','que-frio@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'Que Frío','customer_b2b','dist',v_zona_posadas,'activo','3764106016','cuit','30715672096','Alemania','2345','Posadas','Razón social: Frontic S Soluciones Tecnológicas SRL')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 14 · Panadería Don Fernando
  select id into v_id from auth.users where email = 'panaderia-don-fernando@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','panaderia-don-fernando@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Panadería Don Fernando"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'panaderia-don-fernando@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','panaderia-don-fernando@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'Panadería Don Fernando','customer_b2b','gastro',v_zona_r14,'activo','3754507487','cuit','27170627763','Av. Belgrano','1457','Leandro N. Alem','Razón social: Panadería Don Fernando')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 15 · Granja Camila
  select id into v_id from auth.users where email = 'granja-camila@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','granja-camila@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Granja Camila"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'granja-camila@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','granja-camila@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'Granja Camila','customer_b2b','dist',v_zona_r12,'activo','3751500937','cuit','20334194648','Av. San Martín','766','Eldorado','Razón social: Granja Camila')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 16 · Fortín Cataratas
  select id into v_id from auth.users where email = 'fortin-cataratas@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','fortin-cataratas@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Fortín Cataratas"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'fortin-cataratas@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','fortin-cataratas@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'Fortín Cataratas','customer_b2b','gastro',v_zona_r12,'activo','3757432791','cuit','30698145036','Bosetti','29','Puerto Iguazú','Razón social: Comercial JR SRL')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 17 · La Chula Bar
  select id into v_id from auth.users where email = 'la-chula-bar@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','la-chula-bar@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"La Chula Bar"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'la-chula-bar@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','la-chula-bar@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'La Chula Bar','customer_b2b','gastro',v_zona_r14,'activo','3755556835','cuit','20271461101','Av. San Martín','1291','Aristóbulo del Valle','Razón social: Sebastián Matías Gejo')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 18 · Carnicería Don Francisco
  select id into v_id from auth.users where email = 'carniceria-don-francisco@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','carniceria-don-francisco@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Carnicería Don Francisco"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'carniceria-don-francisco@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','carniceria-don-francisco@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'Carnicería Don Francisco','customer_b2b','min',v_zona_r14,'activo','3755743333','cuit','27254094515','Calle Juana Konopka','1356','Leandro N. Alem','Razón social: Mariela Soledad Rodríguez')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 19 · Oveja Negra
  select id into v_id from auth.users where email = 'oveja-negra@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','oveja-negra@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Oveja Negra"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'oveja-negra@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','oveja-negra@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'Oveja Negra','customer_b2b','min',v_zona_posadas,'activo','3757460267','cuit','30717927199','Entre Ríos','2362','Posadas','Razón social: Oveja Negra S.A.S.')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 20 · YPF Puerto Rico
  select id into v_id from auth.users where email = 'ypf-puerto-rico@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','ypf-puerto-rico@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"YPF Puerto Rico"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'ypf-puerto-rico@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','ypf-puerto-rico@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'YPF Puerto Rico','customer_b2b','gastro',v_zona_r12,'activo','3743446777','cuit','30715394150','Av. San Martín','2646','Puerto Rico','Razón social: Seewald Centro SA')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 21 · Chetops
  select id into v_id from auth.users where email = 'chetops@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','chetops@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Chetops"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'chetops@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','chetops@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_ciudad,notas_internas)
  values (v_id,'Chetops','customer_b2b','gastro',v_zona_r14,'activo','3755602411','cuit','20309036590','Av. Libertador frente al Banco','San Vicente','Razón social: Rubén Antonio Chriniuk')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 22 · Revendedor Buera
  select id into v_id from auth.users where email = 'revendedor-buera@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','revendedor-buera@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Revendedor Buera"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'revendedor-buera@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','revendedor-buera@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_ciudad,notas_internas)
  values (v_id,'Revendedor Buera','customer_b2b','dist',v_zona_r14,'activo','3764262624','dni','32040972','Barrio Jardín Calle 1 Casa 8','San José','Razón social: Buera Rafaela')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 23 · El Almacén del Río
  select id into v_id from auth.users where email = 'el-almacen-del-rio@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','el-almacen-del-rio@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"El Almacén del Río"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'el-almacen-del-rio@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','el-almacen-del-rio@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_ciudad,notas_internas)
  values (v_id,'El Almacén del Río','customer_b2b','gastro',v_zona_posadas,'activo','3765103069','cuit','27257788879','Av. San Martín y Alma Fuerte CH. 182','Posadas','Razón social: Carina Andrea Matijasevich')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 24 · Shel Levanon
  select id into v_id from auth.users where email = 'shel-levanon@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','shel-levanon@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Shel Levanon"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'shel-levanon@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','shel-levanon@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_ciudad,notas_internas)
  values (v_id,'Shel Levanon','customer_b2b','gastro',v_zona_posadas,'activo','3751460357','cuit',null,'Av. López y Planes Calle 101','Posadas','Razón social: Grondal S.A.')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, direccion_calle=excluded.direccion_calle, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 25 · Vinicius Resto Bar
  select id into v_id from auth.users where email = 'vinicius-resto-bar@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','vinicius-resto-bar@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Vinicius Resto Bar"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'vinicius-resto-bar@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','vinicius-resto-bar@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_numero,direccion_ciudad,notas_internas)
  values (v_id,'Vinicius Resto Bar','customer_b2b','gastro',v_zona_posadas,'activo','3764490129','cuit','20248196190','Felix de Azara','1580','Posadas','Razón social: Jaquet Luis Alberto')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_numero=excluded.direccion_numero, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  -- 26 · Mundo Lácteo 2
  select id into v_id from auth.users where email = 'mundo-lacteo-2@enminutas.temp';
  if v_id is null then
    v_id := gen_random_uuid();
    insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
    values ('00000000-0000-0000-0000-000000000000',v_id,'authenticated','authenticated','mundo-lacteo-2@enminutas.temp',crypt('Minutas2024!',gen_salt('bf')),now(),'{"provider":"email","providers":["email"],"role":"customer_b2b"}'::jsonb,'{"full_name":"Mundo Lácteo 2"}'::jsonb,now(),now(),'','','','');
    insert into auth.identities (id,provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
    values (gen_random_uuid(),'mundo-lacteo-2@enminutas.temp',v_id,json_build_object('sub',v_id::text,'email','mundo-lacteo-2@enminutas.temp','email_verified',true),'email',now(),now(),now());
  end if;
  insert into public.profiles (id,full_name,role,canal,zona_id,b2b_status,phone,document_type,document_number,direccion_calle,direccion_ciudad,notas_internas)
  values (v_id,'Mundo Lácteo 2','customer_b2b','min',v_zona_posadas,'activo','3764282928','cuit','33718665049','Calle Las Calandrias y Las Violetas','Posadas','Razón social: JU&MA E Hijos S.R.L.')
  on conflict (id) do update set full_name=excluded.full_name, canal=excluded.canal, zona_id=excluded.zona_id, b2b_status=excluded.b2b_status, phone=excluded.phone, document_number=excluded.document_number, direccion_calle=excluded.direccion_calle, direccion_ciudad=excluded.direccion_ciudad, notas_internas=excluded.notas_internas;

  raise notice '✓ 26 clientes B2B cargados correctamente';
end; $$;
