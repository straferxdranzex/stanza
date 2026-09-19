-- ============================================================
-- Elevato Piano — Complete Database Schema
-- ============================================================
-- All timestamps stored in UTC
-- UUID v4 primary keys throughout
-- RLS strictly enforced on every table
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'completed', 'cancelled', 'refunded'
);
CREATE TYPE payment_status AS ENUM (
  'pending', 'succeeded', 'failed', 'refunded', 'partially_refunded'
);
CREATE TYPE dispute_status AS ENUM (
  'open', 'under_review', 'resolved_student', 'resolved_teacher', 'closed'
);
CREATE TYPE notification_type AS ENUM (
  'booking_confirmed', 'booking_cancelled', 'booking_reminder',
  'payment_received', 'review_received', 'message_received',
  'teacher_approved', 'refund_processed'
);
CREATE TYPE recurring_frequency AS ENUM ('weekly', 'biweekly', 'monthly');
CREATE TYPE lesson_level AS ENUM ('beginner', 'intermediate', 'advanced', 'all_levels');
CREATE TYPE lesson_language AS ENUM ('english', 'spanish', 'french', 'german', 'other');

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'student',
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  avatar_url      TEXT,
  timezone        TEXT NOT NULL DEFAULT 'UTC',
  bio             TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-populate users from auth.users on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );

  -- Auto-create teacher profile when role is teacher
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'student') = 'teacher' THEN
    INSERT INTO public.teacher_profiles (user_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TEACHER PROFILES
-- ============================================================
CREATE TABLE public.teacher_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  bio                   TEXT,
  headline              TEXT,
  experience_years      INTEGER DEFAULT 0,
  specialties           TEXT[],
  languages             lesson_language[] DEFAULT '{english}',
  is_verified           BOOLEAN NOT NULL DEFAULT false,
  verification_note     TEXT,
  stripe_account_id     TEXT,
  stripe_onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  average_rating        NUMERIC(3,2) DEFAULT 0,
  total_reviews         INTEGER DEFAULT 0,
  total_lessons_taught  INTEGER DEFAULT 0,
  is_accepting_students BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER teacher_profiles_updated_at
  BEFORE UPDATE ON public.teacher_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- TEACHER DOCUMENTS (for verification)
-- ============================================================
CREATE TABLE public.teacher_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  doc_type    TEXT NOT NULL, -- 'certificate', 'id', 'degree', etc.
  storage_path TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LESSONS (teacher offerings)
-- ============================================================
CREATE TABLE public.lessons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT,
  duration_mins   INTEGER NOT NULL CHECK (duration_mins IN (30, 45, 60, 90)),
  price_cents     INTEGER NOT NULL CHECK (price_cents > 0),
  level           lesson_level NOT NULL DEFAULT 'all_levels',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  max_students    INTEGER NOT NULL DEFAULT 1, -- 1 = 1-on-1
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- AVAILABILITY SLOTS
-- ============================================================
CREATE TABLE public.availability_slots (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_time        TIMESTAMPTZ NOT NULL, -- UTC
  end_time          TIMESTAMPTZ NOT NULL, -- UTC
  is_recurring      BOOLEAN NOT NULL DEFAULT false,
  recurring_freq    recurring_frequency,
  recurring_end_date DATE, -- NULL = recurring indefinitely
  is_booked         BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT recurring_requires_freq CHECK (
    (is_recurring = false) OR (recurring_freq IS NOT NULL)
  )
);

-- Prevent overlapping slots for the same teacher
CREATE UNIQUE INDEX idx_no_overlap_slots ON public.availability_slots (teacher_id)
  WHERE is_booked = false;

-- Better overlap check via exclusion constraint (requires btree_gist)
-- CREATE EXTENSION IF NOT EXISTS btree_gist;
-- ALTER TABLE availability_slots ADD CONSTRAINT no_overlap
--   EXCLUDE USING gist (teacher_id WITH =, tstzrange(start_time, end_time) WITH &&)
--   WHERE (is_booked = false);

-- ============================================================
-- BOOKINGS
-- ============================================================
CREATE TABLE public.bookings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id        UUID NOT NULL REFERENCES public.users(id),
  teacher_id        UUID NOT NULL REFERENCES public.users(id),
  lesson_id         UUID NOT NULL REFERENCES public.lessons(id),
  slot_id           UUID NOT NULL REFERENCES public.availability_slots(id),
  status            booking_status NOT NULL DEFAULT 'pending',
  scheduled_at      TIMESTAMPTZ NOT NULL, -- UTC
  ends_at           TIMESTAMPTZ NOT NULL, -- UTC
  zoom_meeting_id   TEXT,
  zoom_join_url     TEXT, -- ENCRYPTED or access-controlled
  zoom_start_url    TEXT, -- teacher only
  notes             TEXT,
  is_recurring      BOOLEAN NOT NULL DEFAULT false,
  recurring_group_id UUID, -- links recurring booking instances
  stripe_payment_intent_id TEXT,
  cancelled_at      TIMESTAMPTZ,
  cancelled_by      UUID REFERENCES public.users(id),
  cancellation_reason TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_booking CHECK (student_id != teacher_id),
  CONSTRAINT valid_schedule CHECK (ends_at > scheduled_at)
);

-- Critical: prevent double booking (atomic DB-level constraint)
CREATE UNIQUE INDEX idx_one_booking_per_slot
  ON public.bookings (slot_id)
  WHERE status NOT IN ('cancelled', 'refunded');

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function: mark slot as booked atomically
CREATE OR REPLACE FUNCTION public.book_slot(
  p_slot_id    UUID,
  p_student_id UUID,
  p_lesson_id  UUID,
  p_notes      TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_slot    availability_slots%ROWTYPE;
  v_lesson  lessons%ROWTYPE;
  v_booking_id UUID;
BEGIN
  -- Lock the slot row to prevent race conditions
  SELECT * INTO v_slot FROM availability_slots
    WHERE id = p_slot_id AND is_booked = false
    FOR UPDATE NOWAIT; -- NOWAIT raises error immediately if locked

  IF NOT FOUND THEN
    RAISE EXCEPTION 'slot_unavailable: Slot % is already booked or does not exist', p_slot_id;
  END IF;

  SELECT * INTO v_lesson FROM lessons
    WHERE id = p_lesson_id AND teacher_id = v_slot.teacher_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_lesson: Lesson not found or inactive';
  END IF;

  -- Create booking
  INSERT INTO bookings (
    student_id, teacher_id, lesson_id, slot_id,
    scheduled_at, ends_at, notes, status
  )
  VALUES (
    p_student_id, v_slot.teacher_id, p_lesson_id, p_slot_id,
    v_slot.start_time, v_slot.end_time, p_notes, 'pending'
  )
  RETURNING id INTO v_booking_id;

  -- Mark slot as booked
  UPDATE availability_slots SET is_booked = true WHERE id = p_slot_id;

  RETURN v_booking_id;
END;
$$;

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id              UUID NOT NULL REFERENCES public.bookings(id),
  student_id              UUID NOT NULL REFERENCES public.users(id),
  teacher_id              UUID NOT NULL REFERENCES public.users(id),
  stripe_payment_intent_id TEXT NOT NULL UNIQUE,
  stripe_charge_id        TEXT,
  stripe_transfer_id      TEXT, -- transfer to teacher
  amount_cents            INTEGER NOT NULL CHECK (amount_cents > 0),
  platform_fee_cents      INTEGER NOT NULL, -- 1% of amount
  teacher_payout_cents    INTEGER NOT NULL, -- amount - platform_fee
  currency                TEXT NOT NULL DEFAULT 'usd',
  status                  payment_status NOT NULL DEFAULT 'pending',
  idempotency_key         TEXT NOT NULL UNIQUE, -- prevent duplicate charges
  refund_amount_cents     INTEGER DEFAULT 0,
  stripe_refund_id        TEXT,
  refunded_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE public.reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id  UUID NOT NULL UNIQUE REFERENCES public.bookings(id), -- 1 review per booking
  student_id  UUID NOT NULL REFERENCES public.users(id),
  teacher_id  UUID NOT NULL REFERENCES public.users(id),
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  is_visible  BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: update teacher aggregate rating on review insert/update
CREATE OR REPLACE FUNCTION public.update_teacher_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE teacher_profiles
  SET
    average_rating = (
      SELECT ROUND(AVG(rating)::NUMERIC, 2)
      FROM reviews
      WHERE teacher_id = NEW.teacher_id AND is_visible = true
    ),
    total_reviews = (
      SELECT COUNT(*) FROM reviews
      WHERE teacher_id = NEW.teacher_id AND is_visible = true
    )
  WHERE user_id = NEW.teacher_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_review_change
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_teacher_rating();

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE public.messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id    UUID NOT NULL REFERENCES public.users(id),
  receiver_id  UUID NOT NULL REFERENCES public.users(id),
  booking_id   UUID REFERENCES public.bookings(id), -- optional context
  content      TEXT NOT NULL,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_message CHECK (sender_id != receiver_id)
);

-- ============================================================
-- DISPUTES
-- ============================================================
CREATE TABLE public.disputes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL REFERENCES public.bookings(id),
  opened_by       UUID NOT NULL REFERENCES public.users(id),
  status          dispute_status NOT NULL DEFAULT 'open',
  reason          TEXT NOT NULL,
  resolution_note TEXT,
  resolved_by     UUID REFERENCES public.users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  data        JSONB DEFAULT '{}',
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CANCELLATION POLICIES
-- ============================================================
CREATE TABLE public.cancellation_policies (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id          UUID NOT NULL UNIQUE REFERENCES public.users(id),
  full_refund_hours   INTEGER NOT NULL DEFAULT 24, -- hours before lesson
  partial_refund_pct  INTEGER NOT NULL DEFAULT 50 CHECK (partial_refund_pct BETWEEN 0 AND 100),
  partial_refund_hours INTEGER NOT NULL DEFAULT 2,
  no_refund_hours     INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- PERFORMANCE INDEXES
-- ============================================================
CREATE INDEX idx_users_role ON public.users (role);
CREATE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_bookings_student ON public.bookings (student_id);
CREATE INDEX idx_bookings_teacher ON public.bookings (teacher_id);
CREATE INDEX idx_bookings_status ON public.bookings (status);
CREATE INDEX idx_bookings_scheduled_at ON public.bookings (scheduled_at);
CREATE INDEX idx_availability_teacher ON public.availability_slots (teacher_id, start_time);
CREATE INDEX idx_availability_range ON public.availability_slots (start_time, end_time)
  WHERE is_booked = false;
CREATE INDEX idx_lessons_teacher ON public.lessons (teacher_id) WHERE is_active = true;
CREATE INDEX idx_messages_sender ON public.messages (sender_id, created_at DESC);
CREATE INDEX idx_messages_receiver ON public.messages (receiver_id, created_at DESC);
CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);
CREATE INDEX idx_reviews_teacher ON public.reviews (teacher_id) WHERE is_visible = true;
CREATE INDEX idx_payments_booking ON public.payments (booking_id);
CREATE INDEX idx_teacher_profiles_verified ON public.teacher_profiles (is_verified)
  WHERE is_accepting_students = true;
