-- ══════════════════════════════════════════════════════════════════════
-- EN MINUTAS — Migración 011: Módulo de Distribución
-- Correr en SQL Editor de Supabase
-- ══════════════════════════════════════════════════════════════════════

-- Columna para registrar cuándo se confirmó la entrega
alter table public.orders
  add column if not exists entregado_at timestamptz;
