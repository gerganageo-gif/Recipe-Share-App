insert into public.recipes (id, author_id, title, description, ingredients, instructions)
select
  gen_random_uuid(),
  p.id,
  'Демо рецепта - Салата с киноа',
  'Бърза и здравословна салата, подходяща за вечеря.',
  '1 ч.ч. киноа\n2 домата\n1 краставица\nзехтин\nлимонов сок\nсол',
  '1. Сварете киноата.\n2. Нарежете зеленчуците.\n3. Смесете всички продукти и овкусете.'
from public.profiles p
where p.email = 'demo@recipeshare.app'
  and not exists (
    select 1
    from public.recipes r
    where r.author_id = p.id
      and r.title = 'Демо рецепта - Салата с киноа'
  );

update public.user_roles
set role = 'admin'
where user_id in (
  select id
  from public.profiles
  where email = 'admin@recipeshare.app'
);
