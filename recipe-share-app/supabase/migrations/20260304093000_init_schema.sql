create extension if not exists "pgcrypto";

create type public.app_role as enum ('user', 'admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null check (char_length(display_name) between 2 and 80),
  avatar_url text,
  bio text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 5 and 600),
  ingredients text not null,
  instructions text not null,
  image_url text,
  image_path text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recipe_comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  content text not null check (char_length(content) between 2 and 1000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recipe_favorites (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (recipe_id, user_id)
);

create index if not exists idx_user_roles_role on public.user_roles (role);
create index if not exists idx_recipes_author_created on public.recipes (author_id, created_at desc);
create index if not exists idx_recipes_created on public.recipes (created_at desc);
create index if not exists idx_recipe_comments_recipe_created on public.recipe_comments (recipe_id, created_at desc);
create index if not exists idx_recipe_favorites_user_created on public.recipe_favorites (user_id, created_at desc);

create or replace function public.set_current_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_roles where user_id = auth.uid();
$$;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_admin_user() to authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_current_timestamp();

drop trigger if exists trg_user_roles_updated_at on public.user_roles;
create trigger trg_user_roles_updated_at
before update on public.user_roles
for each row
execute function public.set_current_timestamp();

drop trigger if exists trg_recipes_updated_at on public.recipes;
create trigger trg_recipes_updated_at
before update on public.recipes
for each row
execute function public.set_current_timestamp();

drop trigger if exists trg_recipe_comments_updated_at on public.recipe_comments;
create trigger trg_recipe_comments_updated_at
before update on public.recipe_comments
for each row
execute function public.set_current_timestamp();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

insert into public.profiles (id, email, display_name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  display_name = excluded.display_name;

insert into public.user_roles (user_id, role)
select p.id, 'user'::public.app_role
from public.profiles p
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_comments enable row level security;
alter table public.recipe_favorites enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles
for select
using (true);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users update own profile or admin" on public.profiles;
create policy "Users update own profile or admin"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin_user())
with check (auth.uid() = id or public.is_admin_user());

drop policy if exists "Users view own role or admins view all" on public.user_roles;
create policy "Users view own role or admins view all"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id or public.is_admin_user());

drop policy if exists "Only admins can insert roles" on public.user_roles;
create policy "Only admins can insert roles"
on public.user_roles
for insert
to authenticated
with check (public.is_admin_user());

drop policy if exists "Only admins can update roles" on public.user_roles;
create policy "Only admins can update roles"
on public.user_roles
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Only admins can delete roles" on public.user_roles;
create policy "Only admins can delete roles"
on public.user_roles
for delete
to authenticated
using (public.is_admin_user());

drop policy if exists "Recipes are publicly readable" on public.recipes;
create policy "Recipes are publicly readable"
on public.recipes
for select
using (true);

drop policy if exists "Users insert own recipes" on public.recipes;
create policy "Users insert own recipes"
on public.recipes
for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Users or admins update recipes" on public.recipes;
create policy "Users or admins update recipes"
on public.recipes
for update
to authenticated
using (auth.uid() = author_id or public.is_admin_user())
with check (auth.uid() = author_id or public.is_admin_user());

drop policy if exists "Users or admins delete recipes" on public.recipes;
create policy "Users or admins delete recipes"
on public.recipes
for delete
to authenticated
using (auth.uid() = author_id or public.is_admin_user());

drop policy if exists "Comments are publicly readable" on public.recipe_comments;
create policy "Comments are publicly readable"
on public.recipe_comments
for select
using (true);

drop policy if exists "Users insert own comments" on public.recipe_comments;
create policy "Users insert own comments"
on public.recipe_comments
for insert
to authenticated
with check (auth.uid() = author_id);

drop policy if exists "Users or admins update comments" on public.recipe_comments;
create policy "Users or admins update comments"
on public.recipe_comments
for update
to authenticated
using (auth.uid() = author_id or public.is_admin_user())
with check (auth.uid() = author_id or public.is_admin_user());

drop policy if exists "Users or admins delete comments" on public.recipe_comments;
create policy "Users or admins delete comments"
on public.recipe_comments
for delete
to authenticated
using (auth.uid() = author_id or public.is_admin_user());

drop policy if exists "Users view own favorites or admin" on public.recipe_favorites;
create policy "Users view own favorites or admin"
on public.recipe_favorites
for select
to authenticated
using (auth.uid() = user_id or public.is_admin_user());

drop policy if exists "Users insert own favorites" on public.recipe_favorites;
create policy "Users insert own favorites"
on public.recipe_favorites
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users or admins delete favorites" on public.recipe_favorites;
create policy "Users or admins delete favorites"
on public.recipe_favorites
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin_user());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-images',
  'recipe-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read recipe images" on storage.objects;
create policy "Public can read recipe images"
on storage.objects
for select
using (bucket_id = 'recipe-images');

drop policy if exists "Users upload images in own folder" on storage.objects;
create policy "Users upload images in own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'recipe-images'
  and coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

drop policy if exists "Users or admins update recipe images" on storage.objects;
create policy "Users or admins update recipe images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'recipe-images'
  and (
    coalesce((storage.foldername(name))[1], '') = auth.uid()::text
    or public.is_admin_user()
  )
)
with check (
  bucket_id = 'recipe-images'
  and (
    coalesce((storage.foldername(name))[1], '') = auth.uid()::text
    or public.is_admin_user()
  )
);

drop policy if exists "Users or admins delete recipe images" on storage.objects;
create policy "Users or admins delete recipe images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'recipe-images'
  and (
    coalesce((storage.foldername(name))[1], '') = auth.uid()::text
    or public.is_admin_user()
  )
);
