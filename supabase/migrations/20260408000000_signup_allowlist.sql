create table if not exists public.signup_allowlist (
  email text primary key,
  note text null,
  created_at timestamptz not null default timezone('utc', now()),
  used_at timestamptz null,
  constraint signup_allowlist_email_normalized check (email = lower(trim(email)))
);

alter table public.signup_allowlist enable row level security;
