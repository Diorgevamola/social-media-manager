-- Migration: Add story_sequence as valid post_type
-- Run this in the Supabase SQL editor

-- Step 1: Drop the existing CHECK constraint on post_type
ALTER TABLE public.schedule_posts
  DROP CONSTRAINT IF EXISTS schedule_posts_post_type_check;

-- Step 2: Add the updated CHECK constraint including story_sequence
ALTER TABLE public.schedule_posts
  ADD CONSTRAINT schedule_posts_post_type_check
  CHECK (post_type IN ('post', 'reel', 'carousel', 'story', 'story_sequence'));

-- Step 3: Ensure slide_image_urls column exists (from carousel-slides-migration)
ALTER TABLE public.schedule_posts
  ADD COLUMN IF NOT EXISTS slide_image_urls JSONB DEFAULT '{}'::jsonb;
