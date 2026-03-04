update public.profiles
set
  display_name = 'Admin Chef',
  avatar_url = coalesce(avatar_url, 'https://api.dicebear.com/9.x/initials/svg?seed=Admin%20Chef'),
  bio = coalesce(bio, 'Администратор и любител на класическата кухня.')
where email = 'admin@recipeshare.app';

update public.profiles
set
  display_name = 'Demo User',
  avatar_url = coalesce(avatar_url, 'https://api.dicebear.com/9.x/initials/svg?seed=Demo%20User'),
  bio = coalesce(bio, 'Ентусиаст в готвенето и споделянето на бързи рецепти.')
where email = 'demo@recipeshare.app';

update public.profiles
set
  avatar_url = coalesce(
    avatar_url,
    'https://api.dicebear.com/9.x/initials/svg?seed=' || replace(coalesce(display_name, split_part(email, '@', 1)), ' ', '%20')
  ),
  bio = coalesce(bio, 'Обича да експериментира в кухнята и да споделя идеи.')
where avatar_url is null
   or bio is null;

update public.user_roles
set role = 'admin'
where user_id in (
  select id
  from public.profiles
  where email = 'admin@recipeshare.app'
);

update public.user_roles
set role = 'user'
where user_id in (
  select id
  from public.profiles
  where email = 'demo@recipeshare.app'
)
and role <> 'admin';

with seed_recipes(author_email, category, title, description, ingredients, instructions) as (
  values
    ('demo@recipeshare.app', 'Закуски', 'Овесени палачинки с банан',
      'Лесни палачинки без бяла захар, подходящи за закуска.',
      '2 банана\n2 яйца\n4 с.л. фини овесени ядки\n1 ч.л. канела',
      '1. Намачкай бананите.\n2. Добави яйцата и овесените ядки.\n3. Изпечи на незалепващ тиган по 2 минути на страна.'),

    ('demo@recipeshare.app', 'Салати', 'Средиземноморска салата с фета',
      'Свежа салата с домати, краставици и ароматен дресинг.',
      '2 домата\n1 краставица\n100 г фета\nмаслини\nзехтин\nриган',
      '1. Нарежи зеленчуците и фетата.\n2. Добави маслините.\n3. Овкуси със зехтин, риган и щипка сол.'),

    ('demo@recipeshare.app', 'Десерти', 'Шоколадов чиа пудинг',
      'Бърз десерт без печене с какао и чиа семена.',
      '400 мл мляко\n4 с.л. чиа\n2 с.л. какао\n1 с.л. мед',
      '1. Смеси млякото, какаото и меда.\n2. Добави чиа семената.\n3. Остави в хладилник за 4 часа.'),

    ('demo@recipeshare.app', 'Здравословни', 'Домашен хумус с печен чесън',
      'Кремообразен хумус с лек аромат на печен чесън.',
      '400 г нахут\n2 с.л. тахан\n1 глава печен чесън\nлимон\nзехтин',
      '1. Пасирай нахута с тахана.\n2. Добави печения чесън и лимон.\n3. Долей зехтин до желана текстура.'),

    ('admin@recipeshare.app', 'Супи', 'Крем супа от тиква',
      'Кадифена есенна супа с морков и индийско орехче.',
      '800 г тиква\n1 морков\n1 картоф\n1 глава лук\nсметана',
      '1. Задуши лука и моркова.\n2. Добави тиквата и картофа с вода.\n3. Свари, пасирай и добави сметана.'),

    ('admin@recipeshare.app', 'Основни ястия', 'Пиле с гъби и ориз',
      'Класическо семейно ястие, готово за под 40 минути.',
      '500 г пилешко филе\n250 г гъби\n1 ч.ч. ориз\n1 глава лук',
      '1. Запържи лука и пилето.\n2. Добави гъбите и ориза.\n3. Долей вода и готви до готовност.'),

    ('admin@recipeshare.app', 'Вегетариански', 'Пълнени чушки с булгур',
      'Вкусни пълнени чушки с булгур и зеленчуци.',
      '6 чушки\n1 ч.ч. булгур\n1 морков\n1 тиквичка\nдомати',
      '1. Приготви плънка от булгур и зеленчуци.\n2. Напълни чушките.\n3. Печи около 45 минути на 190 градуса.'),

    ('admin@recipeshare.app', 'Десерти', 'Печени ябълки с орехи',
      'Ароматен домашен десерт с канела и мед.',
      '4 ябълки\n60 г орехи\n2 с.л. мед\nканела',
      '1. Издълбай ябълките.\n2. Напълни с орехи, мед и канела.\n3. Печи 25 минути на 180 градуса.'),

    ('admin@recipeshare.app', 'Основни ястия', 'Ризото с гъби',
      'Кремообразно ризото с пармезан и пресен магданоз.',
      '1 ч.ч. ориз арборио\n300 г гъби\n1 л зеленчуков бульон\nпармезан',
      '1. Задуши гъбите.\n2. Добавяй бульон към ориза на етапи.\n3. Финиширай с пармезан и магданоз.'),

    ('admin@recipeshare.app', 'Супи', 'Леща яхния с моркови',
      'Хранителна и бюджетна рецепта за всеки ден.',
      '1 ч.ч. леща\n1 морков\n1 глава лук\n1 ч.л. червен пипер',
      '1. Измий лещата и я сложи да ври.\n2. Добави зеленчуците и подправките.\n3. Остави да къкри до омекване.')
),
seed_recipe_rows as (
  select
    p.id as author_id,
    s.category,
    s.title,
    s.description,
    s.ingredients,
    s.instructions
  from seed_recipes s
  join public.profiles p on p.email = s.author_email
)
insert into public.recipes (author_id, category, title, description, ingredients, instructions)
select
  sr.author_id,
  sr.category,
  sr.title,
  sr.description,
  sr.ingredients,
  sr.instructions
from seed_recipe_rows sr
where not exists (
  select 1
  from public.recipes r
  where r.author_id = sr.author_id
    and r.title = sr.title
);

with seed_comments(recipe_title, author_email, content) as (
  values
    ('Овесени палачинки с банан', 'admin@recipeshare.app', 'Супер идея за лека закуска преди работа.'),
    ('Овесени палачинки с банан', 'demo@recipeshare.app', 'Правя ги често и с боровинки, стават чудесни.'),
    ('Средиземноморска салата с фета', 'admin@recipeshare.app', 'Добавих малко каперси и вкусът стана още по-добър.'),
    ('Средиземноморска салата с фета', 'demo@recipeshare.app', 'Перфектна е за лека вечеря.'),
    ('Шоколадов чиа пудинг', 'admin@recipeshare.app', 'Страхотен десерт, който се приготвя за минути.'),
    ('Шоколадов чиа пудинг', 'demo@recipeshare.app', 'Поръсих отгоре с кокосови стърготини и се получи много добре.'),
    ('Домашен хумус с печен чесън', 'admin@recipeshare.app', 'Опитай и с малко кимион за по-наситен аромат.'),
    ('Домашен хумус с печен чесън', 'demo@recipeshare.app', 'Сервирах с пълнозърнести крекери и беше хит.'),
    ('Крем супа от тиква', 'demo@recipeshare.app', 'Добавих джинджифил и стана много ароматна.'),
    ('Крем супа от тиква', 'admin@recipeshare.app', 'Щипка индийско орехче прави чудеса тук.'),
    ('Пиле с гъби и ориз', 'demo@recipeshare.app', 'Удобна рецепта за делнична вечер.'),
    ('Пълнени чушки с булгур', 'demo@recipeshare.app', 'Много добра вегетарианска алтернатива.'),
    ('Печени ябълки с орехи', 'demo@recipeshare.app', 'Прекрасен аромат в цялата кухня.'),
    ('Ризото с гъби', 'demo@recipeshare.app', 'Следвах стъпките и стана кремообразно от първия път.'),
    ('Леща яхния с моркови', 'demo@recipeshare.app', 'Проста, вкусна и засищаща рецепта.')
),
comment_rows as (
  select
    r.id as recipe_id,
    p.id as author_id,
    s.content
  from seed_comments s
  join public.recipes r on r.title = s.recipe_title
  join public.profiles p on p.email = s.author_email
)
insert into public.recipe_comments (recipe_id, author_id, content)
select
  c.recipe_id,
  c.author_id,
  c.content
from comment_rows c
where not exists (
  select 1
  from public.recipe_comments rc
  where rc.recipe_id = c.recipe_id
    and rc.author_id = c.author_id
    and rc.content = c.content
);
