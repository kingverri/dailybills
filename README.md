# DailyBills

DailyBills is a mobile-first PWA for gig workers and drivers who need to know:

> How much can I safely spend today, and how much do I need to earn before my next bills are due?

## What is included

- Next.js App Router, TypeScript, Tailwind CSS
- Supabase Auth and database access
- Protected app pages with onboarding after signup
- Profile and balance management
- Pay schedules: weekly, biweekly, twice per month, monthly, custom
- Bills CRUD with recurrence, category, status, and notes
- Vehicle CRUD with MPG and maintenance estimate
- Gas station CRUD with manual gas price updates
- Daily income CRUD with gross, miles, hours, gas, net profit, per-hour, and per-mile math
- Dashboard cards for safe spending, earning target, next bill, bills progress, month summary, and risk level
- PWA manifest, app icon placeholder, theme color, and service worker
- Supabase SQL schema with row-level security policies

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project.

3. In Supabase SQL Editor, run:

```sql
-- Copy and run the contents of supabase/schema.sql
```

4. Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase Notes

The schema is in `supabase/schema.sql`. It creates:

- `profiles`
- `pay_schedules`
- `bills`
- `gas_stations`
- `vehicles`
- `daily_income_entries`

Row-level security is enabled on every table. Each policy limits records to `auth.uid() = user_id`.

## Important Files

- `lib/financeCalculations.ts`: cash-flow, bill, income, gas, and risk calculations
- `lib/gasPriceService.ts`: gas price service boundary for a future external gas price API
- `lib/supabase.ts`: Supabase browser client
- `components/auth-provider.tsx`: shared auth/profile state
- `public/manifest.json`: PWA manifest
- `public/sw.js`: basic service worker

## Scripts

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
```

## Current MVP Limitations

- No bank or Plaid connection
- No automatic gas price API yet
- No native app store deployment
- No AI forecasting

The project is structured so those can be added later without rewriting the MVP core.
