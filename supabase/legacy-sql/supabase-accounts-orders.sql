-- ============================================================
-- ACCOUNTS_ORDERS: pedidos de cuentas externas (dark.shopping)
-- Auto-fulfillment: debita saldo USD -> compra en dark.shopping
-- -> guarda credenciales devueltas en credentials_text.
-- ============================================================

create table if not exists public.accounts_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'dark.shopping',
  provider_order_id text,
  product_id text not null,
  product_name text,
  quantity int not null default 1,
  unit_price_usd numeric(12,4) not null,
  total_cost_usd numeric(12,4) not null,
  status text not null default 'pending',
    -- pending | processing | completed | failed | refunded
  credentials_text text,
  error_message text,
  idempotence_id text unique,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists accounts_orders_user_idx
  on public.accounts_orders(user_id, created_at desc);

create index if not exists accounts_orders_status_idx
  on public.accounts_orders(status);

alter table public.accounts_orders enable row level security;

-- Solo el dueño lee sus pedidos
drop policy if exists "own_accounts_orders_select" on public.accounts_orders;
create policy "own_accounts_orders_select" on public.accounts_orders
  for select using (auth.uid() = user_id);

-- Insert/update bloqueado para cliente; backend usa service_role
-- (no policies para insert/update/delete = nada permitido salvo service_role)
