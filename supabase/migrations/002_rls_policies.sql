-- ============================================================
-- Elevato Piano — Row Level Security Policies
-- ============================================================
-- All tables have RLS enabled with strict per-role policies
-- Admin role bypasses RLS via security definer functions
-- ============================================================

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

-- Helper function: is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Helper function: is teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'teacher'
  );
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cancellation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_documents ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS
-- ============================================================
-- Users can read their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());

-- Users can see public info of teachers (for marketplace)
CREATE POLICY "users_select_teachers_public" ON public.users
  FOR SELECT USING (role = 'teacher' AND is_active = true);

-- Admin can see all users
CREATE POLICY "users_admin_select_all" ON public.users
  FOR SELECT USING (public.is_admin());

-- Users can update only their own profile
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent self-role escalation
    role = (SELECT role FROM public.users WHERE id = auth.uid())
  );

-- Admin can update any user
CREATE POLICY "users_admin_update" ON public.users
  FOR UPDATE USING (public.is_admin());

-- Inserts handled by trigger (no direct insert policy needed for users)

-- ============================================================
-- TEACHER PROFILES
-- ============================================================
-- Anyone can view verified teacher profiles
CREATE POLICY "teacher_profiles_select_public" ON public.teacher_profiles
  FOR SELECT USING (is_verified = true);

-- Teachers can view their own (even if unverified)
CREATE POLICY "teacher_profiles_select_own" ON public.teacher_profiles
  FOR SELECT USING (user_id = auth.uid());

-- Admin can view all
CREATE POLICY "teacher_profiles_admin_all" ON public.teacher_profiles
  FOR ALL USING (public.is_admin());

-- Teachers can insert/update their own profile
CREATE POLICY "teacher_profiles_insert_own" ON public.teacher_profiles
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND public.is_teacher()
  );

CREATE POLICY "teacher_profiles_update_own" ON public.teacher_profiles
  FOR UPDATE USING (
    user_id = auth.uid() AND public.is_teacher()
  )
  WITH CHECK (
    user_id = auth.uid() AND
    -- Cannot self-verify
    is_verified = (SELECT is_verified FROM public.teacher_profiles WHERE user_id = auth.uid())
  );

-- ============================================================
-- TEACHER DOCUMENTS
-- ============================================================
CREATE POLICY "teacher_docs_own" ON public.teacher_documents
  FOR ALL USING (
    teacher_id = (
      SELECT id FROM public.teacher_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "teacher_docs_admin" ON public.teacher_documents
  FOR ALL USING (public.is_admin());

-- ============================================================
-- LESSONS
-- ============================================================
-- Anyone can view active lessons
CREATE POLICY "lessons_select_active" ON public.lessons
  FOR SELECT USING (is_active = true);

-- Teachers can view all their own lessons (including inactive)
CREATE POLICY "lessons_select_own" ON public.lessons
  FOR SELECT USING (teacher_id = auth.uid());

-- Teachers can manage their own lessons
CREATE POLICY "lessons_insert_own" ON public.lessons
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid() AND public.is_teacher()
  );

CREATE POLICY "lessons_update_own" ON public.lessons
  FOR UPDATE USING (
    teacher_id = auth.uid() AND public.is_teacher()
  );

CREATE POLICY "lessons_delete_own" ON public.lessons
  FOR DELETE USING (
    teacher_id = auth.uid() AND public.is_teacher()
  );

CREATE POLICY "lessons_admin_all" ON public.lessons
  FOR ALL USING (public.is_admin());

-- ============================================================
-- AVAILABILITY SLOTS
-- ============================================================
-- Anyone can view open slots (for booking calendar)
CREATE POLICY "slots_select_open" ON public.availability_slots
  FOR SELECT USING (true); -- all slots visible for calendar display

-- Teachers manage their own slots
CREATE POLICY "slots_insert_own" ON public.availability_slots
  FOR INSERT WITH CHECK (
    teacher_id = auth.uid() AND public.is_teacher()
  );

CREATE POLICY "slots_update_own" ON public.availability_slots
  FOR UPDATE USING (
    teacher_id = auth.uid() AND public.is_teacher()
  );

CREATE POLICY "slots_delete_own" ON public.availability_slots
  FOR DELETE USING (
    teacher_id = auth.uid() AND public.is_teacher()
    -- Cannot delete a booked slot
    AND NOT is_booked
  );

CREATE POLICY "slots_admin_all" ON public.availability_slots
  FOR ALL USING (public.is_admin());

-- ============================================================
-- BOOKINGS
-- ============================================================
-- Students can view their own bookings
CREATE POLICY "bookings_student_own" ON public.bookings
  FOR SELECT USING (student_id = auth.uid());

-- Teachers can view their own bookings
CREATE POLICY "bookings_teacher_own" ON public.bookings
  FOR SELECT USING (teacher_id = auth.uid());

-- Admin can view all
CREATE POLICY "bookings_admin_all" ON public.bookings
  FOR ALL USING (public.is_admin());

-- Students can create bookings (actual logic via book_slot function)
CREATE POLICY "bookings_student_insert" ON public.bookings
  FOR INSERT WITH CHECK (
    student_id = auth.uid() AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'student'
  );

-- Students can cancel their own pending/confirmed bookings
CREATE POLICY "bookings_student_cancel" ON public.bookings
  FOR UPDATE USING (
    student_id = auth.uid() AND
    status IN ('pending', 'confirmed')
  )
  WITH CHECK (
    student_id = auth.uid() AND
    status = 'cancelled'
  );

-- Teachers can update booking status
CREATE POLICY "bookings_teacher_update" ON public.bookings
  FOR UPDATE USING (teacher_id = auth.uid());

-- ============================================================
-- PAYMENTS
-- ============================================================
-- Students can view their own payment records
CREATE POLICY "payments_student_own" ON public.payments
  FOR SELECT USING (student_id = auth.uid());

-- Teachers can view payments for their bookings
CREATE POLICY "payments_teacher_own" ON public.payments
  FOR SELECT USING (teacher_id = auth.uid());

-- Admin full access
CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL USING (public.is_admin());

-- Only server-side (service role) can insert payments
-- No direct client insert policy — inserts via Edge Functions only

-- ============================================================
-- REVIEWS
-- ============================================================
-- Anyone can read visible reviews
CREATE POLICY "reviews_select_visible" ON public.reviews
  FOR SELECT USING (is_visible = true);

-- Students can write one review per completed booking
CREATE POLICY "reviews_student_insert" ON public.reviews
  FOR INSERT WITH CHECK (
    student_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id
        AND student_id = auth.uid()
        AND status = 'completed'
    )
  );

-- Students can update their own reviews (within 24h window enforced in app)
CREATE POLICY "reviews_student_update_own" ON public.reviews
  FOR UPDATE USING (student_id = auth.uid());

-- Admin can manage all reviews
CREATE POLICY "reviews_admin_all" ON public.reviews
  FOR ALL USING (public.is_admin());

-- ============================================================
-- MESSAGES
-- ============================================================
-- Users can see messages they sent or received
CREATE POLICY "messages_own_conversations" ON public.messages
  FOR SELECT USING (
    sender_id = auth.uid() OR receiver_id = auth.uid()
  );

-- Users can send messages
CREATE POLICY "messages_insert_own" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- Users can mark their received messages as read
CREATE POLICY "messages_update_read" ON public.messages
  FOR UPDATE USING (receiver_id = auth.uid())
  WITH CHECK (
    receiver_id = auth.uid() AND
    is_read = true -- can only update to mark as read
  );

-- Admin can view all
CREATE POLICY "messages_admin_all" ON public.messages
  FOR ALL USING (public.is_admin());

-- ============================================================
-- DISPUTES
-- ============================================================
-- Parties involved can view their dispute
CREATE POLICY "disputes_select_own" ON public.disputes
  FOR SELECT USING (
    opened_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.student_id = auth.uid() OR b.teacher_id = auth.uid())
    )
  );

-- Student or teacher can open a dispute on their booking
CREATE POLICY "disputes_insert_own" ON public.disputes
  FOR INSERT WITH CHECK (
    opened_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.student_id = auth.uid() OR b.teacher_id = auth.uid())
        AND b.status IN ('confirmed', 'completed')
    )
  );

-- Admin manages all disputes
CREATE POLICY "disputes_admin_all" ON public.disputes
  FOR ALL USING (public.is_admin());

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
-- Users can only view their own notifications
CREATE POLICY "notifications_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

-- Users can mark their notifications as read
CREATE POLICY "notifications_update_read" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND is_read = true);

-- Only server-side can insert notifications
-- No direct client insert policy

CREATE POLICY "notifications_admin_all" ON public.notifications
  FOR ALL USING (public.is_admin());

-- ============================================================
-- CANCELLATION POLICIES
-- ============================================================
-- Anyone can read cancellation policies (needed pre-booking)
CREATE POLICY "cancel_policies_public_read" ON public.cancellation_policies
  FOR SELECT USING (true);

-- Teachers manage their own
CREATE POLICY "cancel_policies_teacher_own" ON public.cancellation_policies
  FOR ALL USING (teacher_id = auth.uid() AND public.is_teacher());

CREATE POLICY "cancel_policies_admin" ON public.cancellation_policies
  FOR ALL USING (public.is_admin());

-- ============================================================
-- GRANT permissions for service role (Edge Functions)
-- ============================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
