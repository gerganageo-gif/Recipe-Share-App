alter table public.recipes
add column if not exists category text;

update public.recipes
set category = 'Друго'
where category is null;

alter table public.recipes
alter column category set default 'Друго';

alter table public.recipes
alter column category set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'recipes_category_allowed_chk'
  ) then
    alter table public.recipes
    add constraint recipes_category_allowed_chk
    check (category in ('Закуска', 'Обяд', 'Вечеря', 'Десерт', 'Вегетарианско', 'Друго'));
  end if;
end;
$$;

create index if not exists idx_recipes_category_created
on public.recipes (category, created_at desc);
