create table if not exists public.inventory_items (
  id text primary key,
  name text not null,
  quantity numeric not null,
  unit text not null,
  category text not null,
  expiry_date date not null,
  status text not null check (status in ('in-stock', 'consumed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.shopping_list_items (
  id text primary key,
  name text not null,
  quantity numeric not null,
  unit text not null,
  category text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.recipes (
  id text primary key,
  title text not null,
  summary text null,
  original_text text not null,
  ingredients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.weekly_plan_entries (
  id text primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  day text not null,
  meal text not null,
  cooked_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (day, meal)
);

create table if not exists public.kitchen_meta (
  id text primary key,
  recipe_analysis jsonb null,
  dismissed_expiring_ids text[] not null default '{}',
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.inventory_items enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.recipes enable row level security;
alter table public.weekly_plan_entries enable row level security;
alter table public.kitchen_meta enable row level security;
