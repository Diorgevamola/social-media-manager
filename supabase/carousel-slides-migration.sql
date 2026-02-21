-- ============================================================
-- Carousel Slides Migration
-- Adds: slide_image_urls JSONB column to schedule_posts
-- Stores Supabase Storage URLs for each carousel slide
-- Key format: { "0": "https://...", "1": "https://...", ... }
-- Run this in your Supabase SQL Editor
-- ============================================================

ALTER TABLE public.schedule_posts
  ADD COLUMN IF NOT EXISTS slide_image_urls JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.schedule_posts.slide_image_urls IS
  'Per-slide image URLs for carousel posts. Keys are slide indices (0-based strings), values are Supabase Storage public URLs.';
