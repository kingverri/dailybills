alter table public.driver_logs
add column if not exists work_type text default 'driver';

alter table public.driver_logs
add column if not exists tips_received numeric default 0;

alter table public.driver_logs
add column if not exists stops_completed numeric default 0;

update public.driver_logs
set work_type = 'driver'
where work_type is null;

update public.driver_logs
set tips_received = 0
where tips_received is null;

update public.driver_logs
set stops_completed = 0
where stops_completed is null;

alter table public.driver_logs
alter column work_type set not null;

alter table public.driver_logs
alter column tips_received set not null;

alter table public.driver_logs
alter column stops_completed set not null;

alter table public.driver_logs
drop constraint if exists driver_logs_work_type_check;

alter table public.driver_logs
add constraint driver_logs_work_type_check
check (work_type in (
  'driver',
  'cleaner',
  'restaurant_worker',
  'server_waiter',
  'warehouse',
  'construction',
  'landscaping',
  'delivery_courier',
  'other'
));

alter table public.driver_logs
drop constraint if exists driver_logs_platform_check;

alter table public.driver_logs
add constraint driver_logs_platform_check
check (platform in (
  'Uber',
  'Lyft',
  'DoorDash',
  'Uber Eats',
  'Amazon Flex',
  'Spark',
  'Instacart',
  'OnTrac',
  'House cleaning',
  'Office cleaning',
  'Airbnb cleaning',
  'Hotel cleaning',
  'Company',
  'Private client',
  'Restaurant',
  'Bar',
  'Cafe',
  'Catering',
  'Hotel',
  'Warehouse',
  'Amazon',
  'FedEx',
  'UPS',
  'Walmart',
  'Construction',
  'Contractor',
  'Day labor',
  'Landscaping',
  'Lawn care',
  'Snow removal',
  'Other'
));
