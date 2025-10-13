
# Deployment Configuration

## Environment Variables

### Required
- `TYPEFORM_SECRET` - Required for Typeform webhook signature verification
- `SUPABASE_URL` - Database connection URL
- `SUPABASE_SERVICE_ROLE_KEY` - Database service role key

### Optional
- `ZAPIER_SHARED_SECRET` - Optional secret for Zapier webhook authentication
- `FORCE_WWW` - Set to 'true' to force www. redirect (bypasses webhooks)

## HTTPS Configuration

The app automatically handles HTTPS redirects while bypassing webhook endpoints to prevent 301/302/307 responses that could break webhook delivery.

### Webhook Bypass Routes
- `/webhooks/*` - All webhook endpoints bypass HTTPS/WWW redirects
- Body limits set to 50MB (minimum 1MB for webhooks)

## Response Strategy

Webhooks use fast-response pattern:
1. Immediate 204 response
2. Async processing with `setImmediate()`
3. No database/AI operations in response path

## Replit Deployment

The app is configured for Replit deployment with:
- Port: 5000 (forwarded to 80/443 in production)
- Host: 0.0.0.0 (required for external access)
- Public URL: `https://workspace.ring120768.repl.co`

### Webhook Endpoints for External Services

Configure these URLs in your external services:

- **Typeform**: `https://workspace.ring120768.repl.co/webhooks/typeform`
- **Zapier**: `https://workspace.ring120768.repl.co/webhooks/zapier`
- **User Signup**: `https://workspace.ring120768.repl.co/webhooks/user_signup`
- **Incident Reports**: `https://workspace.ring120768.repl.co/webhooks/incident_reports`
