-- Migration 004: Allow users to see counterparts from bookings/messages
-- Teachers previously could not resolve student names under RLS.

CREATE POLICY "users_select_booking_or_message_counterparts" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE (b.student_id = auth.uid() AND b.teacher_id = users.id)
         OR (b.teacher_id = auth.uid() AND b.student_id = users.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (m.sender_id = auth.uid() AND m.receiver_id = users.id)
         OR (m.receiver_id = auth.uid() AND m.sender_id = users.id)
    )
  );
