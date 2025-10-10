
-- Migration: Implement RLS with auth_user_id pattern
-- Date: 2025-01-10
-- Description: Add auth_user_id column and RLS policies for owner-only access

-- Add auth_user_id column to user_signup table if it doesn't exist
ALTER TABLE public.user_signup 
ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

-- Create index on auth_user_id for performance
CREATE INDEX IF NOT EXISTS idx_user_signup_auth_user_id 
ON public.user_signup(auth_user_id);

-- Update existing records to set auth_user_id = uid (for existing data)
UPDATE public.user_signup 
SET auth_user_id = uid::uuid 
WHERE auth_user_id IS NULL AND uid IS NOT NULL;

-- Enable RLS on user_signup table
ALTER TABLE public.user_signup ENABLE row level security;

-- Create RLS policies for user_signup table (owner-only access)
CREATE POLICY "user_signup_sel" ON public.user_signup 
FOR SELECT USING (auth.uid() = auth_user_id);

CREATE POLICY "user_signup_ins" ON public.user_signup 
FOR INSERT WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "user_signup_upd" ON public.user_signup 
FOR UPDATE USING (auth.uid() = auth_user_id);

-- Optional: Add DELETE policy if needed
CREATE POLICY "user_signup_del" ON public.user_signup 
FOR DELETE USING (auth.uid() = auth_user_id);

-- Make auth_user_id NOT NULL after data migration
ALTER TABLE public.user_signup 
ALTER COLUMN auth_user_id SET NOT NULL;
