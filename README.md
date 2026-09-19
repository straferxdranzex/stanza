# Stanza

Two-sided marketplace for online creative lessons — **Piano, Violin, Cello, Animation, and 2D Art**.

Students book teachers, pay via Stripe Connect (1% platform fee), and join lessons on Zoom. Teachers manage lessons, availability, and payouts. Admins verify teachers and resolve disputes.

---

## Tech stack

| Layer | Technology |
|--------|------------|
| App | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS (dark / gold Stanza theme) |
| Backend | Supabase (Auth, Postgres, RLS) |
| Payments | Stripe Connect Express |
| Video | Zoom Server-to-Server OAuth |
| Email | Resend |
| Validation | Zod |
| Tests | Vitest |

---

## Features

- Student & teacher registration with RBAC
- Lesson catalog by category
- Availability calendar + atomic slot booking
- Stripe Payment Element checkout
- Auto Zoom meetings on payment success
- Secure `/join/[bookingId]` gate
- Messaging, reviews, earnings, payment history
- Admin: users, bookings, transactions, analytics, disputes
- Cron endpoints for abandoned checkouts + Zoom retry

---

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Environment

Fill `.env.local` (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` / `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `ZOOM_ACCOUNT_ID` / `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET`
- `RESEND_API_KEY` / `EMAIL_FROM_DOMAIN`
- `NEXT_PUBLIC_APP_URL`
- `CRON_SECRET`

### 3. Database

```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
```

### 4. Stripe webhook (local)

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`, `account.updated`, `transfer.created`

### 5. Run

```bash
npm run dev
```

### 6. Cron (production)

Every ~10 minutes:

```bash
curl -X POST "$APP_URL/api/bookings/expire-pending" -H "Authorization: Bearer $CRON_SECRET"
curl -X POST "$APP_URL/api/bookings/maintenance" -H "Authorization: Bearer $CRON_SECRET"
```

---

## Project structure

```
src/
  app/                  # Pages + API routes
  components/           # Landing, dashboards, booking, admin
  lib/                  # supabase, stripe, zoom, email, validators
  types/
supabase/migrations/    # Schema + RLS
tests/
middleware.ts           # Auth + RBAC
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run test` | Vitest |
| `npm run db:push` | `supabase db push` |
| `npm run db:types` | Generate Supabase types |

---

## Roles

| Role | Access |
|------|--------|
| Student | Browse, book, pay, message, review |
| Teacher | Lessons, availability, earnings, Stripe Connect |
| Admin | Users, bookings, transactions, analytics, disputes, teacher verification |

---

Built as **Stanza**.
