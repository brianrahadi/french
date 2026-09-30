-- Petit à petit — cloud sync.
-- One progress document per signed-in learner. Run this once in your Supabase
-- project: Dashboard → SQL Editor → New query → paste → Run.

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
