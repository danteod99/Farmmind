-- Editor Privado (equipo de edición de Dante) — correr en el SQL Editor
create table if not exists public.editor_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_email text not null,
  nombre text,
  status text not null default 'pendiente',
  input_path text,
  output_path text,
  flags jsonb default '{}'::jsonb,
  error text
);
alter table public.editor_jobs enable row level security;

create table if not exists public.editor_allowlist (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.editor_allowlist enable row level security;

insert into storage.buckets (id, name, public)
  values ('editor-privado', 'editor-privado', false)
  on conflict (id) do nothing;

-- Accesos autorizados (pedido de Dante 2026-08-21)
insert into public.editor_allowlist (email) values
  ('danteod18@gmail.com'),
  ('danteod99@gmail.com')
on conflict (email) do nothing;
