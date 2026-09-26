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
| Hosting | Vercel (crons in `vercel.json`) |

---

## Launch checklist (production)

1. Fill all secrets in Vercel / `.env.local` from `.env.example`
2. `supabase db push` (includes `005_production_hardening.sql`)
3. Stripe Dashboard → Connect Express enabled; webhook pointing to  
   `https://YOUR_DOMAIN/api/payments/webhook`  
   Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`, `account.updated`, `transfer.created`
4. Set `CRON_SECRET` (32+ chars) — Vercel Cron sends `Authorization: Bearer $CRON_SECRET`
5. Supabase Auth → URL config: add `https://YOUR_DOMAIN/auth/callback` to redirect allow list
6. Resend: verify `EMAIL_FROM_DOMAIN`
7. Zoom S2S OAuth app credentials
8. Seed first admin in SQL:  
   `UPDATE users SET role = 'admin' WHERE email = 'you@example.com';`
9. Teachers must: Connect Stripe → create lesson → set availability → get admin-verified

### Cron jobs (automatic on Vercel)

| Path | Schedule |
|------|----------|
| `/api/bookings/expire-pending` | every 10 min |
| `/api/bookings/maintenance` | every 15 min |
| `/api/bookings/send-reminders` | every 10 min |

---

## Setup (local)

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Environment

Fill `.env.local` (see `.env.example`).

### 3. Database

```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
```

### 4. Stripe webhook (local)

```bash
stripe listen --forward-to localhost:3000/api/payments/webhook
```

### 5. Run

```bash
npm run dev
```

---

## Core flows

- **Auth:** register (student/teacher) → email confirm (if enabled) → login → role dashboard; forgot/reset password via `/forgot-password`
- **Book:** browse `/teachers` → book → Stripe Payment Element → webhook confirms → Zoom created → `/join/[id]`
- **Cancel:** policy-based refund + slot release + email
- **Teacher:** onboarding includes Stripe Connect before students can pay

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
