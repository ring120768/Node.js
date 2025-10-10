
-- Migration: Create storage buckets
-- Date: 2025-01-10
-- Description: Create storage buckets for audio files, documents, and user uploads

-- Create audio storage bucket for transcription files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'audio-transcriptions',
    'audio-transcriptions', 
    false,
    52428800, -- 50MB limit
    ARRAY['audio/webm', 'audio/wav', 'audio/mp3', 'audio/m4a', 'audio/mpeg']
) ON CONFLICT (id) DO NOTHING;

-- Create documents bucket for PDFs and reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create user-uploads bucket for profile images, vehicle photos, etc.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'user-uploads',
    'user-uploads',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;
