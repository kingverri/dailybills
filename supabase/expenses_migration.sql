create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  amount numeric(12, 2) not null check (amount >= 0),
  merchant text,
  category text not null default 'other' check (category in ('groceries', 'restaurant_fast_food', 'amazon_online', 'gas', 'car', 'home', 'tools', 'personal', 'other')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx on public.expenses(user_id, date desc);

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at before update on public.expenses
for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

drop policy if exists "Users can manage own expenses" on public.expenses;
create policy "Users can manage own expenses" on public.expenses
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
