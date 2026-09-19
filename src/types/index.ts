// ============================================================
// Stanza — Application Types
// ============================================================

export type UserRole = 'student' | 'teacher' | 'admin'
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'refunded'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded' | 'partially_refunded'
export type DisputeStatus = 'open' | 'under_review' | 'resolved_student' | 'resolved_teacher' | 'closed'
export type NotificationType =
  | 'booking_confirmed' | 'booking_cancelled' | 'booking_reminder'
  | 'payment_received' | 'review_received' | 'message_received'
  | 'teacher_approved' | 'refund_processed'
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly'
export type LessonLevel = 'beginner' | 'intermediate' | 'advanced' | 'all_levels'
export type LessonLanguage = 'english' | 'spanish' | 'french' | 'german' | 'other'
export type LessonDuration = 30 | 45 | 60 | 90
export type LessonCategory = 'piano' | 'violin' | 'cello' | 'animation' | '2d_art'

// ============================================================
// Database Row Types
// ============================================================

export interface DBUser {
  id: string
  role: UserRole
  full_name: string
  email: string
  avatar_url: string | null
  timezone: string
  bio: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DBTeacherProfile {
  id: string
  user_id: string
  bio: string | null
  headline: string | null
  experience_years: number
  specialties: string[] | null
  languages: LessonLanguage[]
  is_verified: boolean
  verification_note: string | null
  stripe_account_id: string | null
  stripe_onboarding_complete: boolean
  average_rating: number
  total_reviews: number
  total_lessons_taught: number
  is_accepting_students: boolean
  created_at: string
  updated_at: string
}

export interface DBLesson {
  id: string
  teacher_id: string
  title: string
  description: string | null
  duration_mins: LessonDuration
  price_cents: number
  level: LessonLevel
  category: LessonCategory
  is_active: boolean
  max_students: number
  created_at: string
  updated_at: string
}

export interface DBAvailabilitySlot {
  id: string
  teacher_id: string
  start_time: string
  end_time: string
  is_recurring: boolean
  recurring_freq: RecurringFrequency | null
  recurring_end_date: string | null
  is_booked: boolean
  created_at: string
}

export interface DBBooking {
  id: string
  student_id: string
  teacher_id: string
  lesson_id: string
  slot_id: string
  status: BookingStatus
  scheduled_at: string
  ends_at: string
  zoom_meeting_id: string | null
  zoom_join_url: string | null
  zoom_start_url: string | null
  notes: string | null
  is_recurring: boolean
  recurring_group_id: string | null
  stripe_payment_intent_id: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
}

export interface DBPayment {
  id: string
  booking_id: string
  student_id: string
  teacher_id: string
  stripe_payment_intent_id: string
  stripe_charge_id: string | null
  stripe_transfer_id: string | null
  amount_cents: number
  platform_fee_cents: number
  teacher_payout_cents: number
  currency: string
  status: PaymentStatus
  idempotency_key: string
  refund_amount_cents: number
  stripe_refund_id: string | null
  refunded_at: string | null
  created_at: string
  updated_at: string
}

export interface DBReview {
  id: string
  booking_id: string
  student_id: string
  teacher_id: string
  rating: number
  comment: string | null
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface DBMessage {
  id: string
  sender_id: string
  receiver_id: string
  booking_id: string | null
  content: string
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface DBDispute {
  id: string
  booking_id: string
  opened_by: string
  status: DisputeStatus
  reason: string
  resolution_note: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface DBNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  body: string | null
  data: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
}

export interface DBCancellationPolicy {
  id: string
  teacher_id: string
  full_refund_hours: number
  partial_refund_pct: number
  partial_refund_hours: number
  no_refund_hours: number
  created_at: string
  updated_at: string
}

// ============================================================
// Application (joined/enriched) Types
// ============================================================

export interface Teacher extends DBUser {
  profile: DBTeacherProfile
  lessons?: DBLesson[]
}

export interface BookingWithDetails extends DBBooking {
  student: Pick<DBUser, 'id' | 'full_name' | 'avatar_url' | 'email' | 'timezone'>
  teacher: Pick<DBUser, 'id' | 'full_name' | 'avatar_url' | 'email' | 'timezone'>
  lesson: DBLesson
  payment?: DBPayment
  review?: DBReview
}

export interface TeacherWithProfile extends DBUser {
  teacher_profiles: DBTeacherProfile
}

// ============================================================
// Supabase Database Type (for generated client)
// Prefer regenerating via `npm run db:types` for full accuracy.
// ============================================================
export interface Database {
  public: {
    Tables: {
      users: { Row: DBUser; Insert: Omit<DBUser, 'created_at' | 'updated_at'>; Update: Partial<DBUser>; Relationships: [] }
      teacher_profiles: { Row: DBTeacherProfile; Insert: Omit<DBTeacherProfile, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DBTeacherProfile>; Relationships: [] }
      lessons: { Row: DBLesson; Insert: Omit<DBLesson, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DBLesson>; Relationships: [] }
      availability_slots: { Row: DBAvailabilitySlot; Insert: Omit<DBAvailabilitySlot, 'id' | 'created_at'>; Update: Partial<DBAvailabilitySlot>; Relationships: [] }
      bookings: { Row: DBBooking; Insert: Omit<DBBooking, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DBBooking>; Relationships: [] }
      payments: { Row: DBPayment; Insert: Omit<DBPayment, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DBPayment>; Relationships: [] }
      reviews: { Row: DBReview; Insert: Omit<DBReview, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DBReview>; Relationships: [] }
      messages: { Row: DBMessage; Insert: Omit<DBMessage, 'id' | 'created_at'>; Update: Partial<DBMessage>; Relationships: [] }
      disputes: { Row: DBDispute; Insert: Omit<DBDispute, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DBDispute>; Relationships: [] }
      notifications: { Row: DBNotification; Insert: Omit<DBNotification, 'id' | 'created_at'>; Update: Partial<DBNotification>; Relationships: [] }
      cancellation_policies: { Row: DBCancellationPolicy; Insert: Omit<DBCancellationPolicy, 'id' | 'created_at' | 'updated_at'>; Update: Partial<DBCancellationPolicy>; Relationships: [] }
    }
    Views: Record<string, never>
    Functions: {
      book_slot: {
        Args: { p_slot_id: string; p_student_id: string; p_lesson_id: string; p_notes?: string | null }
        Returns: string
      }
      current_user_role: { Args: Record<string, never>; Returns: UserRole }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      is_teacher: { Args: Record<string, never>; Returns: boolean }
    }
    Enums: {
      user_role: UserRole
      booking_status: BookingStatus
      payment_status: PaymentStatus
      dispute_status: DisputeStatus
      notification_type: NotificationType
      lesson_category: LessonCategory
    }
    CompositeTypes: Record<string, never>
  }
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface CreateBookingRequest {
  slotId: string
  lessonId: string
  notes?: string
  isRecurring?: boolean
  recurringFrequency?: RecurringFrequency
}

export interface CreateBookingResponse {
  bookingId: string
  paymentIntentClientSecret: string
  amount: number
  currency: string
}

export interface CreatePaymentIntentRequest {
  bookingId: string
  idempotencyKey: string
}

export interface CancelBookingRequest {
  bookingId: string
  reason?: string
}

export interface CancelBookingResponse {
  success: boolean
  refundAmount: number
  refundId?: string
}

export interface CreateReviewRequest {
  bookingId: string
  rating: number
  comment?: string
}

export interface SearchTeachersParams {
  minPrice?: number
  maxPrice?: number
  minRating?: number
  level?: LessonLevel
  category?: LessonCategory
  language?: LessonLanguage
  availability?: string // ISO date
  timezone?: string
  page?: number
  limit?: number
}

export interface TeacherSearchResult {
  teachers: TeacherWithProfile[]
  total: number
  page: number
  limit: number
}

// ============================================================
// Zod Validators (used throughout)
// ============================================================
// Actual Zod schemas are in /lib/validators/
// Type aliases shown here for documentation
export type CreateBookingInput = CreateBookingRequest
export type UpdateAvailabilityInput = {
  slots: Array<{
    startTime: string
    endTime: string
    isRecurring?: boolean
    recurringFreq?: RecurringFrequency
    recurringEndDate?: string
  }>
}

// ============================================================
// Context/Auth Types
// ============================================================
export interface AuthUser {
  id: string
  email: string
  role: UserRole
  full_name: string
  avatar_url: string | null
  timezone: string
}

export interface SessionContext {
  user: AuthUser | null
  isLoading: boolean
  signOut: () => Promise<void>
}
