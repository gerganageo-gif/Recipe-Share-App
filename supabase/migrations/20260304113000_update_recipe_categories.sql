alter table public.recipes
drop constraint if exists recipes_category_allowed_chk;

update public.recipes
set category = case
  when category = 'Закуска' then 'Закуски'
  when category = 'Обяд' then 'Основни ястия'
  when category = 'Вечеря' then 'Основни ястия'
  when category = 'Десерт' then 'Десерти'
  when category = 'Вегетарианско' then 'Вегетариански'
  when category = 'Друго' then 'Основни ястия'
  else category
end;

update public.recipes
set category = 'Основни ястия'
where category is null
   or category not in (
     'Закуски',
     'Салати',
     'Супи',
     'Основни ястия',
     'Десерти',
     'Здравословни',
     'Вегетариански'
   );

alter table public.recipes
alter column category set default 'Основни ястия';

alter table public.recipes
add constraint recipes_category_allowed_chk
check (
  category in (
    'Закуски',
    'Салати',
    'Супи',
    'Основни ястия',
    'Десерти',
    'Здравословни',
    'Вегетариански'
  )
);
