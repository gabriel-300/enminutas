-- Agrega el estado 'en_distribucion' al enum order_status
-- Ejecutar en Supabase SQL Editor si no se usa supabase db push

ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'en_distribucion' AFTER 'despachado';
