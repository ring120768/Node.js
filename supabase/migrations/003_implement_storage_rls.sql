

-- Migration: Implement Storage RLS for user-scoped file access
-- Date: 2025-01-10
-- Description: Configure storage buckets and RLS policies

-- Ensure storage.objects has RLS enabled
ALTER TABLE storage.objects ENABLE row level security;

-- Create RLS policy for SELECT (viewing files)
-- Users can only access files in their own folder: ${user_id}/...
CREATE POLICY "storage_objects_sel" ON storage.objects 
FOR SELECT USING (
  auth.uid()::text = split_part(name, '/', 1)
);

-- Create RLS policy for INSERT (uploading files)
-- Users can only upload to their own folder: ${user_id}/...
CREATE POLICY "storage_objects_ins" ON storage.objects 
FOR INSERT WITH CHECK (
  auth.uid()::text = split_part(name, '/', 1)
);

-- Create RLS policy for UPDATE (updating file metadata)
-- Users can only update files in their own folder
CREATE POLICY "storage_objects_upd" ON storage.objects 
FOR UPDATE USING (
  auth.uid()::text = split_part(name, '/', 1)
);

-- Create RLS policy for DELETE (removing files)
-- Users can only delete files in their own folder
CREATE POLICY "storage_objects_del" ON storage.objects 
FOR DELETE USING (
  auth.uid()::text = split_part(name, '/', 1)
);

-- Note: All buckets should be created as PRIVATE in Supabase dashboard
-- File sharing will be done through server-created signed URLs only

