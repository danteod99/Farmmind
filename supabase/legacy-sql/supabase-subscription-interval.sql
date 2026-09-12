-- ============================================================
-- profiles.subscription_interval: distingue mensual vs anual
-- Necesario para gatear /cursos: solo "year" da acceso.
-- ============================================================

alter table public.profiles
  add column if not exists subscription_interval text;
    -- 'month' | 'year' | null

-- Index para consultas rápidas (gating de cursos)
create index if not exists profiles_sub_interval_idx
  on public.profiles(subscription_interval)
  where subscription_interval is not null;
