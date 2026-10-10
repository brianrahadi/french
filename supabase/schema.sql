-- Petit à petit — cloud sync and People profiles.
-- One progress document per signed-in learner, plus a public profile for the
-- People page. Run this in your Supabase project: Dashboard → SQL Editor → New
-- query → paste → Run. It's safe to run again after an update.

create table if not exists public.progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  version bigint not null default 1,
  device text,
  updated_at timestamptz not null default now()
);

-- Row-level security: each learner can only read and change their own row.
alter table public.progress enable row level security;

drop policy if exists "Own progress: read" on public.progress;
create policy "Own progress: read" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Own progress: create" on public.progress;
create policy "Own progress: create" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Own progress: update" on public.progress;
create policy "Own progress: update" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Own progress: delete" on public.progress;
create policy "Own progress: delete" on public.progress
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.progress to authenticated;

-- Realtime: lets an open app hear about saves from the learner's other devices.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'progress'
  ) then
    alter publication supabase_realtime add table public.progress;
  end if;
end $$;

-- Admin dashboard (/admin): the app owner can list every learner with their
-- progress. Only the confirmed email addresses below get an answer; anyone
-- else gets "not allowed". Change the list here (and ADMIN_EMAILS in
-- src/features/admin/access.ts, which only decides who sees the link).
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid())
      and email_confirmed_at is not null
      and lower(email) in ('brian.rahadi@gmail.com')
  );
$$;

create or replace function public.admin_users()
returns table (
  id uuid,
  email text,
  name text,
  avatar text,
  provider text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  progress_at timestamptz,
  version bigint,
  device text,
  data jsonb
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
    select
      u.id,
      u.email::text,
      coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
      coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
      u.raw_app_meta_data ->> 'provider',
      u.created_at,
      u.last_sign_in_at,
      p.updated_at,
      p.version,
      p.device,
      p.data
    from auth.users u
    left join public.progress p on p.user_id = u.id
    order by coalesce(p.updated_at, u.last_sign_in_at, u.created_at) desc;
end;
$$;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.admin_users() from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_users() to authenticated;

-- ───────────── People: public profiles ─────────────
-- One row per learner with what other signed-in learners can see on the People
-- page: name, picture, and a summary of progress (level, study days, skill mix).
-- The progress document above stays private; the app publishes this snapshot
-- separately after each sync. Email addresses are never copied here.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '' check (char_length(name) <= 100),
  avatar_url text check (char_length(avatar_url) <= 500),
  -- false = hidden from the People page (the learner can still see their own row).
  listed boolean not null default true,
  -- Small numbers for the list: level, words started, last study day, streak.
  summary jsonb check (pg_column_size(summary) < 2000),
  -- Everything the profile page draws: level progress, sections, daily activity.
  stats jsonb check (pg_column_size(stats) < 1000000),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles: signed-in learners read listed ones" on public.profiles;
create policy "Profiles: signed-in learners read listed ones" on public.profiles
  for select to authenticated using (listed or (select auth.uid()) = user_id);

drop policy if exists "Own profile: create" on public.profiles;
create policy "Own profile: create" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Own profile: update" on public.profiles;
create policy "Own profile: update" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Own profile: delete" on public.profiles;
create policy "Own profile: delete" on public.profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.profiles to authenticated;

-- Everyone who signs up gets a profile straight away, so they appear on the
-- People page even before their first sync fills in their progress.
create or replace function public.handle_new_learner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, name, avatar_url, joined_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''), 'Learner'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    new.created_at
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_learner();

-- Learners who signed up before profiles existed.
insert into public.profiles (user_id, name, avatar_url, joined_at)
select
  u.id,
  coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), nullif(u.raw_user_meta_data ->> 'name', ''), 'Learner'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'),
  u.created_at
from auth.users u
on conflict (user_id) do nothing;
