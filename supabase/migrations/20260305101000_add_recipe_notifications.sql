create table if not exists public.recipe_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  comment_id uuid references public.recipe_comments (id) on delete set null,
  type text not null check (type in ('favorite', 'comment')),
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_recipe_notifications_recipient_created
  on public.recipe_notifications (recipient_id, created_at desc);

create index if not exists idx_recipe_notifications_recipient_unread_created
  on public.recipe_notifications (recipient_id, is_read, created_at desc);

create or replace function public.notify_recipe_favorited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipe_author_id uuid;
begin
  select author_id
  into recipe_author_id
  from public.recipes
  where id = new.recipe_id;

  if recipe_author_id is null or recipe_author_id = new.user_id then
    return new;
  end if;

  insert into public.recipe_notifications (
    recipient_id,
    actor_id,
    recipe_id,
    type
  )
  values (
    recipe_author_id,
    new.user_id,
    new.recipe_id,
    'favorite'
  );

  return new;
end;
$$;

create or replace function public.notify_recipe_commented()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipe_author_id uuid;
begin
  select author_id
  into recipe_author_id
  from public.recipes
  where id = new.recipe_id;

  if recipe_author_id is null or recipe_author_id = new.author_id then
    return new;
  end if;

  insert into public.recipe_notifications (
    recipient_id,
    actor_id,
    recipe_id,
    comment_id,
    type
  )
  values (
    recipe_author_id,
    new.author_id,
    new.recipe_id,
    new.id,
    'comment'
  );

  return new;
end;
$$;

drop trigger if exists trg_recipe_favorites_notify on public.recipe_favorites;
create trigger trg_recipe_favorites_notify
after insert on public.recipe_favorites
for each row
execute function public.notify_recipe_favorited();

drop trigger if exists trg_recipe_comments_notify on public.recipe_comments;
create trigger trg_recipe_comments_notify
after insert on public.recipe_comments
for each row
execute function public.notify_recipe_commented();

alter table public.recipe_notifications enable row level security;

drop policy if exists "Users view own recipe notifications" on public.recipe_notifications;
create policy "Users view own recipe notifications"
on public.recipe_notifications
for select
to authenticated
using (auth.uid() = recipient_id);

drop policy if exists "Users update own recipe notifications" on public.recipe_notifications;
create policy "Users update own recipe notifications"
on public.recipe_notifications
for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

drop policy if exists "Users delete own recipe notifications" on public.recipe_notifications;
create policy "Users delete own recipe notifications"
on public.recipe_notifications
for delete
to authenticated
using (auth.uid() = recipient_id);
