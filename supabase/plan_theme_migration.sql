alter table public.profiles
add column if not exists plan text default 'free';

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

alter table public.profiles
add column if not exists theme text default 'dark';

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
