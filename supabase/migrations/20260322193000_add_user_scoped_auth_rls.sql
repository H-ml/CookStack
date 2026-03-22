alter table public.inventory_items add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.shopping_list_items add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.recipes add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.weekly_plan_entries add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.kitchen_meta add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists inventory_items_user_id_idx on public.inventory_items(user_id);
create index if not exists shopping_list_items_user_id_idx on public.shopping_list_items(user_id);
create index if not exists recipes_user_id_idx on public.recipes(user_id);
create index if not exists weekly_plan_entries_user_id_idx on public.weekly_plan_entries(user_id);

alter table public.weekly_plan_entries drop constraint if exists weekly_plan_entries_day_meal_key;
alter table public.weekly_plan_entries add constraint weekly_plan_entries_user_day_meal_key unique (user_id, day, meal);

alter table public.kitchen_meta drop constraint if exists kitchen_meta_user_id_key;
alter table public.kitchen_meta add constraint kitchen_meta_user_id_key unique (user_id);

drop policy if exists "inventory_items_own_rows" on public.inventory_items;
create policy "inventory_items_own_rows" on public.inventory_items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "shopping_list_items_own_rows" on public.shopping_list_items;
create policy "shopping_list_items_own_rows" on public.shopping_list_items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "recipes_own_rows" on public.recipes;
create policy "recipes_own_rows" on public.recipes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "weekly_plan_entries_own_rows" on public.weekly_plan_entries;
create policy "weekly_plan_entries_own_rows" on public.weekly_plan_entries
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "kitchen_meta_own_rows" on public.kitchen_meta;
create policy "kitchen_meta_own_rows" on public.kitchen_meta
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
