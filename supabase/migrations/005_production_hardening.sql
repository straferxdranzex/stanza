-- 005_production_hardening.sql
-- Launch-critical DB fixes: signup role whitelist, availability overlap,
-- and book_slot auth binding.

-- ─── 1. Prevent admin privilege escalation on signup ─────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  requested_role TEXT;
  safe_role user_role;
BEGIN
  requested_role := lower(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));

  IF requested_role = 'teacher' THEN
    safe_role := 'teacher';
  ELSE
    -- Only student/teacher allowed via signup. Admin is ops-only.
    safe_role := 'student';
  END IF;

  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    safe_role
  );

  IF safe_role = 'teacher' THEN
    INSERT INTO public.teacher_profiles (user_id)
    VALUES (NEW.id);

    -- Default cancellation policy for new teachers
    INSERT INTO public.cancellation_policies (teacher_id)
    VALUES (NEW.id)
    ON CONFLICT (teacher_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- ─── 2. Fix availability: allow multiple open slots per teacher ──
-- The previous unique index on (teacher_id) WHERE is_booked = false
-- allowed only ONE open slot per teacher.
DROP INDEX IF EXISTS public.idx_no_overlap_slots;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping slots for the same teacher (any status)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_overlapping_slots'
  ) THEN
    ALTER TABLE public.availability_slots
      ADD CONSTRAINT no_overlapping_slots
      EXCLUDE USING gist (
        teacher_id WITH =,
        tstzrange(start_time, end_time, '[)') WITH &&
      );
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not add no_overlapping_slots: %', SQLERRM;
END;
$$;

-- Track reminder emails so cron does not double-send
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- Dispute notification type (safe if already present)
DO $$ BEGIN
  ALTER TYPE notification_type ADD VALUE 'dispute_opened';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. book_slot must bind to the authenticated student ─────────
CREATE OR REPLACE FUNCTION public.book_slot(
  p_slot_id    UUID,
  p_student_id UUID,
  p_lesson_id  UUID,
  p_notes      TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_slot       availability_slots%ROWTYPE;
  v_lesson     lessons%ROWTYPE;
  v_booking_id UUID;
  v_caller     UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthorized: authentication required';
  END IF;

  IF v_caller IS DISTINCT FROM p_student_id THEN
    RAISE EXCEPTION 'unauthorized: cannot book for another student';
  END IF;

  SELECT * INTO v_slot FROM availability_slots
    WHERE id = p_slot_id AND is_booked = false
    FOR UPDATE NOWAIT;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'slot_unavailable: Slot % is already booked or does not exist', p_slot_id;
  END IF;

  SELECT * INTO v_lesson FROM lessons
    WHERE id = p_lesson_id AND teacher_id = v_slot.teacher_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_lesson: Lesson not found or inactive';
  END IF;

  INSERT INTO bookings (
    student_id, teacher_id, lesson_id, slot_id,
    scheduled_at, ends_at, notes, status
  )
  VALUES (
    p_student_id, v_slot.teacher_id, p_lesson_id, p_slot_id,
    v_slot.start_time, v_slot.end_time, p_notes, 'pending'
  )
  RETURNING id INTO v_booking_id;

  UPDATE availability_slots SET is_booked = true WHERE id = p_slot_id;

  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.book_slot(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_slot(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_slot(UUID, UUID, UUID, TEXT) TO service_role;
