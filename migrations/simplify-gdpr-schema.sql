-- Migration to simplify GDPR schema
ALTER TABLE gdpr_consent ALTER COLUMN user_id DROP NOT NULL;