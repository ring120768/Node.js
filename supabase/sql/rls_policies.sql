
-- Row Level Security (RLS) Policies for Car Crash Lawyer AI
-- This file contains skeleton RLS policies for all tables
-- Policies ensure users can only access their own data

-- =============================================
-- USERS TABLE POLICIES
-- =============================================

-- Enable RLS on users table
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
-- CREATE POLICY "Users can view own profile" ON public.users
--   FOR SELECT USING (auth.uid() = id::uuid OR auth.uid() = create_user_id::uuid);

-- Users can update their own profile
-- CREATE POLICY "Users can update own profile" ON public.users
--   FOR UPDATE USING (auth.uid() = id::uuid OR auth.uid() = create_user_id::uuid);

-- =============================================
-- TRANSCRIPTIONS TABLE POLICIES
-- =============================================

-- Enable RLS on transcription_queue table
-- ALTER TABLE public.transcription_queue ENABLE ROW LEVEL SECURITY;

-- Users can only see their own transcriptions
-- CREATE POLICY "Users can view own transcriptions" ON public.transcription_queue
--   FOR SELECT USING (auth.uid() = create_user_id::uuid);

-- Users can create transcriptions for themselves
-- CREATE POLICY "Users can create own transcriptions" ON public.transcription_queue
--   FOR INSERT WITH CHECK (auth.uid() = create_user_id::uuid);

-- Users can update their own transcriptions
-- CREATE POLICY "Users can update own transcriptions" ON public.transcription_queue
--   FOR UPDATE USING (auth.uid() = create_user_id::uuid);

-- =============================================
-- AI_LISTENING_TRANSCRIPTS TABLE POLICIES
-- =============================================

-- Enable RLS on ai_listening_transcripts table
-- ALTER TABLE public.ai_listening_transcripts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own AI transcripts
-- CREATE POLICY "Users can view own ai transcripts" ON public.ai_listening_transcripts
--   FOR SELECT USING (auth.uid() = create_user_id::uuid);

-- Users can create AI transcripts for themselves
-- CREATE POLICY "Users can create own ai transcripts" ON public.ai_listening_transcripts
--   FOR INSERT WITH CHECK (auth.uid() = create_user_id::uuid);

-- =============================================
-- INCIDENT_REPORTS TABLE POLICIES
-- =============================================

-- Enable RLS on incident_reports table
-- ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Users can only see their own incident reports
-- CREATE POLICY "Users can view own incidents" ON public.incident_reports
--   FOR SELECT USING (auth.uid() = create_user_id::uuid);

-- Users can create incident reports for themselves
-- CREATE POLICY "Users can create own incidents" ON public.incident_reports
--   FOR INSERT WITH CHECK (auth.uid() = create_user_id::uuid);

-- =============================================
-- EMERGENCY_CONTACTS TABLE POLICIES
-- =============================================

-- Enable RLS on emergency_contacts table
-- ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own emergency contacts
-- CREATE POLICY "Users can view own emergency contacts" ON public.emergency_contacts
--   FOR SELECT USING (auth.uid() = create_user_id::uuid);

-- Users can manage their own emergency contacts
-- CREATE POLICY "Users can manage own emergency contacts" ON public.emergency_contacts
--   FOR ALL USING (auth.uid() = create_user_id::uuid)
--   WITH CHECK (auth.uid() = create_user_id::uuid);

-- =============================================
-- GDPR_CONSENT TABLE POLICIES
-- =============================================

-- Enable RLS on gdpr_consent table
-- ALTER TABLE public.gdpr_consent ENABLE ROW LEVEL SECURITY;

-- Users can only see their own consent records
-- CREATE POLICY "Users can view own consent" ON public.gdpr_consent
--   FOR SELECT USING (auth.uid() = create_user_id::uuid);

-- Users can update their own consent
-- CREATE POLICY "Users can update own consent" ON public.gdpr_consent
--   FOR UPDATE USING (auth.uid() = create_user_id::uuid);

-- =============================================
-- AUDIT_LOGS TABLE POLICIES
-- =============================================

-- Enable RLS on audit_logs table
-- ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit logs
-- CREATE POLICY "Users can view own audit logs" ON public.audit_logs
--   FOR SELECT USING (auth.uid() = create_user_id::uuid);

-- System can create audit logs (service role bypass)
-- No INSERT policy needed as this is handled by service role

-- =============================================
-- STORAGE POLICIES (Supabase Storage)
-- =============================================

-- Incident audio files - users can only access their own files
-- CREATE POLICY "Users can view own incident audio" ON storage.objects
--   FOR SELECT USING (bucket_id = 'incident-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can upload own incident audio" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'incident-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can update own incident audio" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'incident-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own incident audio" ON storage.objects
--   FOR DELETE USING (bucket_id = 'incident-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- SERVICE ROLE POLICIES (Admin Access)
-- =============================================

-- Service role can bypass RLS for admin operations
-- This is handled automatically by Supabase for service_role key

-- =============================================
-- WEBHOOK POLICIES (Anonymous Access)
-- =============================================

-- Webhooks need anonymous access for Typeform/Zapier
-- This is handled by the webhook authentication middleware
-- No RLS policies needed for webhook endpoints

-- =============================================
-- NOTES
-- =============================================

-- 1. All policies use create_user_id as the primary identifier
-- 2. Service role key bypasses all RLS policies
-- 3. Anonymous users can only access webhook endpoints
-- 4. Storage policies ensure file isolation by user folder
-- 5. Audit logs are read-only for users, write-only for system

-- To apply these policies:
-- 1. Uncomment the relevant policies above
-- 2. Run this SQL in your Supabase SQL editor
-- 3. Test with different user contexts
-- 4. Monitor query performance after enabling RLS
