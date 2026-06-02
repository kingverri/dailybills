create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.bill_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  occurrence_date date not null,
  status text not null default 'unpaid',
  paid_at timestamptz null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint bill_occurrences_status_check check (status in ('paid', 'unpaid')),
  constraint bill_occurrences_unique unique (user_id, bill_id, occurrence_date)
);

create index if not exists bill_occurrences_user_bill_date_idx
on public.bill_occurrences(user_id, bill_id, occurrence_date);

drop trigger if exists set_bill_occurrences_updated_at on public.bill_occurrences;
create trigger set_bill_occurrences_updated_at
before update on public.bill_occurrences
for each row execute function public.set_updated_at();

alter table public.bill_occurrences enable row level security;

drop policy if exists "Users can view own bill occurrences" on public.bill_occurrences;
create policy "Users can view own bill occurrences"
on public.bill_occurrences
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own bill occurrences" on public.bill_occurrences;
create policy "Users can insert own bill occurrences"
on public.bill_occurrences
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own bill occurrences" on public.bill_occurrences;
create policy "Users can update own bill occurrences"
on public.bill_occurrences
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own bill occurrences" on public.bill_occurrences;
create policy "Users can delete own bill occurrences"
on public.bill_occurrences
for delete
using (auth.uid() = user_id);
