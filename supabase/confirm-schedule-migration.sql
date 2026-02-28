-- Migration: Add confirmed column to schedule_posts
-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/pfxjrejnimudetjxaawu/editor

ALTER TABLE schedule_posts
  ADD COLUMN IF NOT EXISTS confirmed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_schedule_posts_confirmed
  ON schedule_posts(confirmed, status, date)
  WHERE confirmed = TRUE AND status = 'planned';
