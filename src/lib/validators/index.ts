// src/lib/validators/index.ts
import { z } from 'zod'

// ============================================================
// Common
// ============================================================
export const UUIDSchema = z.string().uuid()
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ============================================================
// Auth
// ============================================================
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain number'),
  full_name: z.string().min(2).max(100),
  role: z.enum(['student', 'teacher']),
  timezone: z.string().default('UTC'),
})
export type RegisterInput = z.infer<typeof RegisterSchema>

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
export type LoginInput = z.infer<typeof LoginSchema>

// ============================================================
// Lessons
// ============================================================
export const CreateLessonSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(100),
  description: z.string().max(1000).optional().or(z.literal('')),
  duration_mins: z.number().int().refine(v => [30, 45, 60, 90].includes(v), {
    message: 'Duration must be 30, 45, 60, or 90 minutes',
  }),
  price_cents: z.number().int().min(100, 'Price must be at least $1').max(100000),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'all_levels']),
  category: z.enum(['piano', 'violin', 'cello', 'animation', '2d_art']).default('piano'),
})
export type CreateLessonInput = z.infer<typeof CreateLessonSchema>

export const UpdateLessonSchema = CreateLessonSchema.partial().extend({
  is_active: z.boolean().optional(),
})
export type UpdateLessonInput = z.infer<typeof UpdateLessonSchema>

// ============================================================
// Availability
// ============================================================
export const AvailabilitySlotSchema = z.object({
  start_time: z.string().datetime(), // ISO 8601 UTC
  end_time: z.string().datetime(),
  is_recurring: z.boolean().default(false),
  recurring_freq: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
  recurring_end_date: z.string().optional(),
}).refine(
  data => new Date(data.end_time) > new Date(data.start_time),
  { message: 'end_time must be after start_time', path: ['end_time'] }
).refine(
  data => !data.is_recurring || data.recurring_freq !== undefined,
  { message: 'recurring_freq required when is_recurring is true', path: ['recurring_freq'] }
)

export const BulkAvailabilitySchema = z.object({
  slots: z.array(AvailabilitySlotSchema).min(1).max(100),
})
export type BulkAvailabilityInput = z.infer<typeof BulkAvailabilitySchema>

// ============================================================
// Bookings
// ============================================================
export const CreateBookingSchema = z.object({
  slot_id: UUIDSchema,
  lesson_id: UUIDSchema,
  notes: z.string().max(500).optional(),
  is_recurring: z.boolean().default(false),
  recurring_frequency: z.enum(['weekly', 'biweekly', 'monthly']).optional(),
})
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>

export const CancelBookingSchema = z.object({
  booking_id: UUIDSchema,
  reason: z.string().max(500).optional(),
})
export type CancelBookingInput = z.infer<typeof CancelBookingSchema>

// ============================================================
// Payments
// ============================================================
export const CreatePaymentIntentSchema = z.object({
  booking_id: UUIDSchema,
  idempotency_key: z.string().min(16).max(64),
})
export type CreatePaymentIntentInput = z.infer<typeof CreatePaymentIntentSchema>

// ============================================================
// Reviews
// ============================================================
export const CreateReviewSchema = z.object({
  booking_id: UUIDSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000).optional(),
})
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>

// ============================================================
// Messages
// ============================================================
export const SendMessageSchema = z.object({
  receiver_id: UUIDSchema,
  content: z.string().min(1).max(2000),
  booking_id: UUIDSchema.optional(),
})
export type SendMessageInput = z.infer<typeof SendMessageSchema>

// ============================================================
// Teacher Profile
// ============================================================
export const UpdateTeacherProfileSchema = z.object({
  bio: z.string().max(2000).optional(),
  headline: z.string().max(200).optional(),
  experience_years: z.number().int().min(0).max(50).optional(),
  specialties: z.array(z.string()).max(10).optional(),
  languages: z.array(z.enum(['english', 'spanish', 'french', 'german', 'other'])).min(1).optional(),
  is_accepting_students: z.boolean().optional(),
  timezone: z.string().optional(),
})
export type UpdateTeacherProfileInput = z.infer<typeof UpdateTeacherProfileSchema>

// ============================================================
// Cancellation Policy
// ============================================================
export const CancellationPolicySchema = z.object({
  full_refund_hours: z.number().int().min(0).max(168),
  partial_refund_pct: z.number().int().min(0).max(100),
  partial_refund_hours: z.number().int().min(0).max(168),
  no_refund_hours: z.number().int().min(0),
}).refine(
  data => data.full_refund_hours >= data.partial_refund_hours,
  { message: 'full_refund_hours must be >= partial_refund_hours' }
)
export type CancellationPolicyInput = z.infer<typeof CancellationPolicySchema>

// ============================================================
// Search / Filter
// ============================================================
export const SearchTeachersSchema = z.object({
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'all_levels']).optional(),
  category: z.enum(['piano', 'violin', 'cello', 'animation', '2d_art']).optional(),
  language: z.enum(['english', 'spanish', 'french', 'german', 'other']).optional(),
  date: z.string().optional(), // filter by availability on a date
  timezone: z.string().optional(),
  query: z.string().max(100).optional(), // text search
  ...PaginationSchema.shape,
})
export type SearchTeachersInput = z.infer<typeof SearchTeachersSchema>

// ============================================================
// Admin
// ============================================================
export const AdminUpdateUserSchema = z.object({
  is_active: z.boolean().optional(),
  role: z.enum(['student', 'teacher', 'admin']).optional(),
})
export type AdminUpdateUserInput = z.infer<typeof AdminUpdateUserSchema>

export const AdminVerifyTeacherSchema = z.object({
  teacher_profile_id: UUIDSchema,
  is_verified: z.boolean(),
  verification_note: z.string().max(500).optional(),
})
export type AdminVerifyTeacherInput = z.infer<typeof AdminVerifyTeacherSchema>

export const AdminResolveDisputeSchema = z.object({
  dispute_id: UUIDSchema,
  status: z.enum(['resolved_student', 'resolved_teacher', 'closed']),
  resolution_note: z.string().min(10).max(1000),
  issue_refund: z.boolean().default(false),
})
export type AdminResolveDisputeInput = z.infer<typeof AdminResolveDisputeSchema>
