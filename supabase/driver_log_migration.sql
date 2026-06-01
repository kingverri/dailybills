alter table public.profiles
add column if not exists weekly_settlement_day text default 'friday';

update public.profiles
set weekly_settlement_day = 'friday'
where weekly_settlement_day is null;

alter table public.profiles
alter column weekly_settlement_day set not null;

alter table public.profiles
drop constraint if exists profiles_weekly_settlement_day_check;

alter table public.profiles
add constraint profiles_weekly_settlement_day_check
check (weekly_settlement_day in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'));

create table if not exists public.driver_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  platform text not null check (platform in ('Uber', 'Lyft', 'DoorDash', 'Uber Eats', 'Amazon Flex', 'Spark', 'Instacart', 'OnTrac', 'Other')),
  start_time time,
  end_time time,
  miles_driven numeric(10, 2) not null default 0,
  gross_earnings numeric(12, 2) not null default 0,
  gas_spent numeric(12, 2) not null default 0,
  gas_price_per_gallon numeric(8, 3) not null default 0,
  extra_expenses numeric(12, 2) not null default 0,
  extra_expense_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists driver_logs_user_date_idx on public.driver_logs(user_id, date desc);

drop trigger if exists set_driver_logs_updated_at on public.driver_logs;
create trigger set_driver_logs_updated_at before update on public.driver_logs
for each row execute function public.set_updated_at();

alter table public.driver_logs enable row level security;

drop policy if exists "Users can manage own driver logs" on public.driver_logs;
create policy "Users can manage own driver logs" on public.driver_logs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
