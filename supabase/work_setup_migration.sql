alter table public.profiles
add column if not exists preferred_work_types jsonb default '[]'::jsonb;

alter table public.profiles
add column if not exists preferred_platforms jsonb default '[]'::jsonb;

alter table public.profiles
add column if not exists default_work_type text null;

alter table public.profiles
add column if not exists default_platform text null;

update public.profiles
set preferred_work_types = '[]'::jsonb
where preferred_work_types is null;

alter table public.profiles
alter column preferred_work_types set not null;

update public.profiles
set preferred_platforms = '[]'::jsonb
where preferred_platforms is null;

alter table public.profiles
alter column preferred_platforms set not null;

alter table public.profiles
drop constraint if exists profiles_default_work_type_check;

alter table public.profiles
add constraint profiles_default_work_type_check
check (
  default_work_type is null
  or default_work_type in ('driver', 'cleaner', 'restaurant_worker', 'server_waiter', 'warehouse', 'construction', 'landscaping', 'delivery_courier', 'other')
);

alter table public.driver_logs
add column if not exists hourly_rate numeric default 0;

update public.driver_logs
set hourly_rate = 0
where hourly_rate is null;

alter table public.driver_logs
alter column hourly_rate set not null;
