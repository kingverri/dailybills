create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  currency text not null default 'USD',
  country text not null default 'United States',
  state text,
  city text,
  current_balance numeric(12, 2) not null default 0,
  income_type text check (income_type in ('Fixed paycheck', 'Variable income', 'Gig work / driver', 'Mixed income')),
  work_type text check (work_type in ('Uber', 'Lyft', 'DoorDash', 'Uber Eats', 'Amazon Flex', 'Spark', 'Instacart', 'OnTrac', 'Other')),
  language text not null default 'en' check (language in ('en', 'pt', 'es')),
  plan text not null default 'free' check (plan in ('free', 'pro_monthly', 'pro_yearly')),
  theme text not null default 'dark' check (theme in ('dark', 'soft_light', 'light')),
  weekly_settlement_day text not null default 'friday' check (weekly_settlement_day in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
add column if not exists language text default 'en';

alter table public.profiles
add column if not exists weekly_settlement_day text default 'friday';

alter table public.profiles
add column if not exists plan text default 'free';

alter table public.profiles
add column if not exists theme text default 'dark';

update public.profiles
set language = 'en'
where language is null;

alter table public.profiles
alter column language set not null;

alter table public.profiles
drop constraint if exists profiles_language_check;

alter table public.profiles
add constraint profiles_language_check
check (language in ('en', 'pt', 'es'));

update public.profiles
set plan = 'free'
where plan is null;

alter table public.profiles
alter column plan set not null;

alter table public.profiles
drop constraint if exists profiles_plan_check;

alter table public.profiles
add constraint profiles_plan_check
check (plan in ('free', 'pro_monthly', 'pro_yearly'));

update public.profiles
set theme = 'dark'
where theme is null;

alter table public.profiles
alter column theme set not null;

alter table public.profiles
drop constraint if exists profiles_theme_check;

alter table public.profiles
add constraint profiles_theme_check
check (theme in ('dark', 'soft_light', 'light'));

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

create table if not exists public.pay_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schedule_type text not null check (schedule_type in ('weekly', 'biweekly', 'twice_per_month', 'monthly', 'custom')),
  day_of_week text check (day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  first_day_of_month integer check (first_day_of_month between 1 and 31),
  second_day_of_month integer check (second_day_of_month between 1 and 31),
  next_payment_date date,
  estimated_amount numeric(12, 2) not null default 0,
  is_variable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  due_date date not null,
  recurrence text not null default 'monthly' check (recurrence in ('monthly', 'weekly', 'biweekly', 'one-time', 'custom')),
  repeat_until date,
  repeat_until_type text not null default 'never' check (repeat_until_type in ('never', 'specific_month')),
  category text not null default 'Other' check (category in ('Rent', 'Car payment', 'Car insurance', 'Phone', 'Credit card', 'Loan', 'Gas', 'Food', 'Utilities', 'Other')),
  status text not null default 'unpaid' check (status in ('unpaid', 'paid')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gas_stations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text not null default '',
  city text not null default '',
  state text not null default '',
  zip_code text not null default '',
  fuel_type text not null default 'Regular' check (fuel_type in ('Regular', 'Midgrade', 'Premium', 'Diesel')),
  current_price numeric(8, 3) not null default 0,
  last_updated timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text not null,
  make text not null default '',
  model text not null default '',
  year integer not null check (year between 1950 and 2100),
  mpg numeric(8, 2) not null default 0 check (mpg >= 0),
  fuel_type text not null default 'Regular' check (fuel_type in ('Regular', 'Midgrade', 'Premium', 'Diesel')),
  monthly_maintenance_estimate numeric(12, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_income_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  income_entry_type text not null default 'actual' check (income_entry_type in ('actual', 'confirmed', 'extra_gig')),
  platform text not null check (platform in ('Uber', 'Lyft', 'DoorDash', 'Uber Eats', 'Amazon Flex', 'Spark', 'Instacart', 'OnTrac', 'Other')),
  gross_earnings numeric(12, 2) not null default 0,
  miles_driven numeric(10, 2) not null default 0,
  hours_worked numeric(10, 2) not null default 0,
  gas_spent numeric(12, 2) not null default 0,
  estimated_gas_cost numeric(12, 2) not null default 0,
  net_profit numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.daily_income_entries
add column if not exists income_entry_type text not null default 'actual';

alter table public.daily_income_entries
drop constraint if exists daily_income_entries_income_entry_type_check;

alter table public.daily_income_entries
add constraint daily_income_entries_income_entry_type_check
check (income_entry_type in ('actual', 'confirmed', 'extra_gig'));

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

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists pay_schedules_user_id_idx on public.pay_schedules(user_id);
create index if not exists bills_user_due_idx on public.bills(user_id, due_date);
create index if not exists gas_stations_user_id_idx on public.gas_stations(user_id);
create index if not exists vehicles_user_id_idx on public.vehicles(user_id);
create index if not exists daily_income_user_date_idx on public.daily_income_entries(user_id, date desc);
create index if not exists driver_logs_user_date_idx on public.driver_logs(user_id, date desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_pay_schedules_updated_at on public.pay_schedules;
create trigger set_pay_schedules_updated_at before update on public.pay_schedules
for each row execute function public.set_updated_at();

drop trigger if exists set_bills_updated_at on public.bills;
create trigger set_bills_updated_at before update on public.bills
for each row execute function public.set_updated_at();

drop trigger if exists set_gas_stations_updated_at on public.gas_stations;
create trigger set_gas_stations_updated_at before update on public.gas_stations
for each row execute function public.set_updated_at();

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists set_daily_income_entries_updated_at on public.daily_income_entries;
create trigger set_daily_income_entries_updated_at before update on public.daily_income_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_driver_logs_updated_at on public.driver_logs;
create trigger set_driver_logs_updated_at before update on public.driver_logs
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.pay_schedules enable row level security;
alter table public.bills enable row level security;
alter table public.gas_stations enable row level security;
alter table public.vehicles enable row level security;
alter table public.daily_income_entries enable row level security;
alter table public.driver_logs enable row level security;

drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can manage own profile" on public.profiles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage own pay schedules" on public.pay_schedules;
create policy "Users can manage own pay schedules" on public.pay_schedules
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage own bills" on public.bills;
create policy "Users can manage own bills" on public.bills
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage own gas stations" on public.gas_stations;
create policy "Users can manage own gas stations" on public.gas_stations
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage own vehicles" on public.vehicles;
create policy "Users can manage own vehicles" on public.vehicles
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage own daily income" on public.daily_income_entries;
create policy "Users can manage own daily income" on public.daily_income_entries
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can manage own driver logs" on public.driver_logs;
create policy "Users can manage own driver logs" on public.driver_logs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();
