create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  accent text not null default 'from-accent-500 via-rose-400 to-orange-300',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);

create table if not exists public.profile_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  default_provider text not null default 'showcase',
  fallback_enabled boolean not null default true,
  autoplay_next_episode boolean not null default true,
  language text not null default 'en-US',
  region text not null default 'US',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.saved_titles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tmdb_id bigint not null,
  media_type text not null,
  media_activity_key text not null,
  snapshot jsonb not null default '{}'::jsonb,
  saved_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists saved_titles_profile_activity_key_idx
  on public.saved_titles(profile_id, media_activity_key);

create index if not exists saved_titles_profile_saved_at_idx
  on public.saved_titles(profile_id, saved_at desc);

create table if not exists public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  entry_key text not null,
  media_activity_key text not null,
  tmdb_id bigint not null,
  media_type text not null,
  season_number integer null,
  episode_number integer null,
  position_seconds double precision not null default 0,
  duration double precision not null default 1,
  percent double precision not null default 0,
  watched_complete boolean not null default false,
  provider text not null default 'showcase',
  snapshot jsonb null,
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists watch_progress_profile_entry_key_idx
  on public.watch_progress(profile_id, entry_key);

create index if not exists watch_progress_profile_updated_at_idx
  on public.watch_progress(profile_id, updated_at desc);

create table if not exists public.watch_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  entry_key text not null,
  media_activity_key text not null,
  tmdb_id bigint not null,
  media_type text not null,
  season_number integer null,
  episode_number integer null,
  provider text not null default 'showcase',
  percent double precision not null default 0,
  snapshot jsonb null,
  watched_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists watch_history_profile_entry_key_idx
  on public.watch_history(profile_id, entry_key);

create index if not exists watch_history_profile_watched_at_idx
  on public.watch_history(profile_id, watched_at desc);

alter table public.profiles enable row level security;
alter table public.profile_settings enable row level security;
alter table public.saved_titles enable row level security;
alter table public.watch_progress enable row level security;
alter table public.watch_history enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = user_id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

drop policy if exists "profile_settings_select_own" on public.profile_settings;
create policy "profile_settings_select_own"
  on public.profile_settings for select
  using (exists (select 1 from public.profiles where public.profiles.id = profile_settings.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "profile_settings_insert_own" on public.profile_settings;
create policy "profile_settings_insert_own"
  on public.profile_settings for insert
  with check (exists (select 1 from public.profiles where public.profiles.id = profile_settings.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "profile_settings_update_own" on public.profile_settings;
create policy "profile_settings_update_own"
  on public.profile_settings for update
  using (exists (select 1 from public.profiles where public.profiles.id = profile_settings.profile_id and public.profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles where public.profiles.id = profile_settings.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "profile_settings_delete_own" on public.profile_settings;
create policy "profile_settings_delete_own"
  on public.profile_settings for delete
  using (exists (select 1 from public.profiles where public.profiles.id = profile_settings.profile_id and public.profiles.user_id = auth.uid()));

drop policy if exists "saved_titles_select_own" on public.saved_titles;
create policy "saved_titles_select_own"
  on public.saved_titles for select
  using (exists (select 1 from public.profiles where public.profiles.id = saved_titles.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "saved_titles_insert_own" on public.saved_titles;
create policy "saved_titles_insert_own"
  on public.saved_titles for insert
  with check (exists (select 1 from public.profiles where public.profiles.id = saved_titles.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "saved_titles_update_own" on public.saved_titles;
create policy "saved_titles_update_own"
  on public.saved_titles for update
  using (exists (select 1 from public.profiles where public.profiles.id = saved_titles.profile_id and public.profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles where public.profiles.id = saved_titles.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "saved_titles_delete_own" on public.saved_titles;
create policy "saved_titles_delete_own"
  on public.saved_titles for delete
  using (exists (select 1 from public.profiles where public.profiles.id = saved_titles.profile_id and public.profiles.user_id = auth.uid()));

drop policy if exists "watch_progress_select_own" on public.watch_progress;
create policy "watch_progress_select_own"
  on public.watch_progress for select
  using (exists (select 1 from public.profiles where public.profiles.id = watch_progress.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "watch_progress_insert_own" on public.watch_progress;
create policy "watch_progress_insert_own"
  on public.watch_progress for insert
  with check (exists (select 1 from public.profiles where public.profiles.id = watch_progress.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "watch_progress_update_own" on public.watch_progress;
create policy "watch_progress_update_own"
  on public.watch_progress for update
  using (exists (select 1 from public.profiles where public.profiles.id = watch_progress.profile_id and public.profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles where public.profiles.id = watch_progress.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "watch_progress_delete_own" on public.watch_progress;
create policy "watch_progress_delete_own"
  on public.watch_progress for delete
  using (exists (select 1 from public.profiles where public.profiles.id = watch_progress.profile_id and public.profiles.user_id = auth.uid()));

drop policy if exists "watch_history_select_own" on public.watch_history;
create policy "watch_history_select_own"
  on public.watch_history for select
  using (exists (select 1 from public.profiles where public.profiles.id = watch_history.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "watch_history_insert_own" on public.watch_history;
create policy "watch_history_insert_own"
  on public.watch_history for insert
  with check (exists (select 1 from public.profiles where public.profiles.id = watch_history.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "watch_history_update_own" on public.watch_history;
create policy "watch_history_update_own"
  on public.watch_history for update
  using (exists (select 1 from public.profiles where public.profiles.id = watch_history.profile_id and public.profiles.user_id = auth.uid()))
  with check (exists (select 1 from public.profiles where public.profiles.id = watch_history.profile_id and public.profiles.user_id = auth.uid()));
drop policy if exists "watch_history_delete_own" on public.watch_history;
create policy "watch_history_delete_own"
  on public.watch_history for delete
  using (exists (select 1 from public.profiles where public.profiles.id = watch_history.profile_id and public.profiles.user_id = auth.uid()));
