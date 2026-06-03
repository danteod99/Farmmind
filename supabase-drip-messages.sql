-- ============================================================
-- DRIP_MESSAGES: queue para emails + WhatsApp programados
-- Workflow: scheduleSignupDrip(userId) inserta 7 rows con
-- scheduled_for offsets. Un cron las procesa cada 15 min.
-- Si el user ya pagó (es Pro), el cron salta los pasos restantes.
-- ============================================================

create table if not exists public.drip_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign text not null default 'signup_nurture',
  step int not null,
  channel text not null,                -- 'email' | 'whatsapp'
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending',
    -- pending | sent | failed | skipped | canceled
  provider_message_id text,
  error_message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Index para el cron query (mensajes pendientes vencidos)
create index if not exists drip_messages_due_idx
  on public.drip_messages(scheduled_for)
  where status = 'pending';

create index if not exists drip_messages_user_idx
  on public.drip_messages(user_id, campaign, step);

-- Idempotencia: un user solo se encola una vez por campaña/step
create unique index if not exists drip_messages_unique_idx
  on public.drip_messages(user_id, campaign, step);

alter table public.drip_messages enable row level security;

-- Solo service_role puede leer/escribir (no policies = bloqueado para cliente)

-- ── unsubscribes ──
create table if not exists public.email_unsubscribes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  reason text,
  channel text default 'all',  -- 'email' | 'whatsapp' | 'all'
  unsubscribed_at timestamptz not null default now()
);

alter table public.email_unsubscribes enable row level security;
-- Solo service_role
