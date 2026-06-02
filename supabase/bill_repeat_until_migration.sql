alter table public.bills
add column if not exists repeat_until date null;

alter table public.bills
add column if not exists repeat_until_type text default 'never';

update public.bills
set repeat_until_type = 'never'
where repeat_until_type is null;

alter table public.bills
alter column repeat_until_type set not null;

alter table public.bills
drop constraint if exists bills_repeat_until_type_check;

alter table public.bills
add constraint bills_repeat_until_type_check
check (repeat_until_type in ('never', 'specific_month'));
