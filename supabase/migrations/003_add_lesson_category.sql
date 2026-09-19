-- ============================================================
-- Migration 003: Add lesson_category to lessons table
-- Stanza — supports Piano, Violin, Cello, Animation, 2D Art
-- ============================================================

-- Create the enum type
CREATE TYPE lesson_category AS ENUM (
  'piano',
  'violin',
  'cello',
  'animation',
  '2d_art'
);

-- Add the category column to lessons (defaults to 'piano' for existing rows)
ALTER TABLE lessons
  ADD COLUMN category lesson_category NOT NULL DEFAULT 'piano';

-- Index for filtering by category on the teachers browse page
CREATE INDEX idx_lessons_category ON lessons (category);

-- Composite index for category + teacher queries
CREATE INDEX idx_lessons_teacher_category ON lessons (teacher_id, category);
