# Claude Code Global Rules

## Project Overview

**Car Crash Lawyer AI** - GDPR-compliant legal documentation system for UK traffic accidents.

**Stack**: Node.js, Express, Supabase (PostgreSQL), Adobe PDF Services, OpenAI
**Environment**: Claude Code + Replit
**Location**: UK (DD/MM/YYYY, £ GBP, GMT/BST timezone, +44 phone codes, British English)

**Key Flow**: Typeform → Webhooks → Image Processing → PDF Generation (17 pages, 150+ fields) → Email

## Core Philosophy

**Default Behaviour**: Just do it. Action over asking for routine development tasks.

**Code Quality**:
- Clarity > Cleverness
- Working > "Perfect"
- Solve today's actual problem, not hypothetical future ones
- Add complexity only when specifically requested
- No backward compatibility unless explicitly needed

**Security First**:
- Validate all user inputs
- Use Supabase RLS policies (service role bypasses for webhooks)
- Sanitize data before displaying (prevent XSS)
- Never commit credentials or API keys to Git
- Use environment variables for all secrets

## Permissions & Execution

### ✅ Auto-Execute (No Confirmation)

**File Operations**
- Create, edit, delete, rename files
- Set up project structure and folders

**Development**
- Write/modify JavaScript, HTML, CSS, Node.js
- Fix bugs, implement features, refactor code
- Install packages, create configs
- Add validation and error handling
- Create validation scripts after implementing

**Supabase Direct Access** (Development Only)
- Query development database
- Create/modify tables and schemas (dev environment)
- Set up RLS policies (dev environment)
- Upload files to Storage
- Create Edge Functions
- View logs

**GitHub Direct Access**
- Commit to development/feature branches
- Create branches and pull requests
- Update documentation and issues
- Manage project board

**Adobe PDF Services**
- Read and analyze PDFs
- Extract text/data from PDFs
- Generate test/development PDFs
- Fill forms, compress, convert formats

### ⚠️ Ask First

- Production database changes (INSERT, UPDATE, DELETE)
- Pushing to main/master branch
- Deleting multiple files or tables (>3 items)
- Bulk operations (>10 records)
- Security or RLS policy changes in production
- Processing sensitive/legal PDFs
- Any destructive operations
- Cost-impacting changes (upgrading tiers, new paid services)
- Major architectural changes (switching frameworks, refactoring >5 files)

## Context Engineering

**Goal**: Give Claude the right information at the right time to make smart decisions.

### Provide Context Upfront

When starting work, share:
- **What exists**: "Form in index.html handles signup via auth.js"
- **What's broken**: "PDF upload fails for files >5MB with timeout"
- **What's connected**: "This saves to 'users' table which triggers webhook"
- **Constraints**: "Must work on mobile, UK users only, free tier limits"

### Good Context Example
```
Need to add email validation to signup form.

Context:
- Form in public/index.html (lines 45-78)
- Uses src/controllers/auth.controller.js signUp()
- Saves to 'user_signup' table
- Need UK-specific validation
- Development environment
```

### Poor Context Example
```
Add validation
```

### Context Templates

**Bug Report**:
```
Bug: [What's broken]
File: [Where it happens]
Expected: [Should happen]
Actual: [What happens]
Error: [Exact message]
```

**Feature Request**:
```
Feature: [What to build]
Why: [Business reason]
Existing: [Related code/files]
Constraints: [Limitations]
Success: [How to verify]
```

### Session Continuity

Start new sessions with context:
```
Picking up from yesterday:
- Completed: PDF upload (src/services/adobePdfService.js)
- Issue: Large files timeout after 30s
- Now doing: Add chunked upload for files >10MB
- Files: src/services/uploadService.js, src/config/storage.js
```

### Context Habits

**Do**:
- Share file names and line numbers
- Mention table/column names
- Include exact error messages
- Note what NOT to change

**Don't**:
- Assume I remember previous sessions
- Use vague terms ("the form", "that function")
- Skip constraints or requirements

### Context Files (Optional)

For complex projects, create `.context/` folder:

**`.context/current-work.md`** - What you're working on now:
```markdown
## Current Focus
Building PDF upload with validation

## Related Files
- src/services/uploadService.js
- src/controllers/pdf.controller.js

## Known Issues
- Large files timeout (need chunked upload)

## Next
- Add file type validation
- Error messages
```

**`.context/project-state.md`** - Overall status:
```markdown
## Completed
- User authentication
- Database schema with RLS
- Basic PDF upload

## In Progress
- File validation

## Blocked
- None

## Tech Debt
- Refactor error handling into utility
```

**`.context/decisions.md`** - Why things are this way:
```markdown
## Architecture Decisions

### Client-side PDF processing
Date: 2025-01-16
Why: Adobe integration handles it, keeps backend simple
Trade-off: Larger client bundle
Review: If bundle >2MB
```

### When to Ask for More Context

Ask clarifying questions when:
- Request is vague or ambiguous
- Multiple valid approaches exist
- Security implications unclear
- Impact on other features unknown
- Not sure which files/tables involved
- Constraints missing

### Progressive Context Loading

For complex tasks, build context in stages:

**Stage 1 - Overview**: "Build PDF approval workflow: Upload → Review → Approve/Reject"

**Stage 2 - Technical**: "Using 'documents' table, add 'status' field, admin role check, email notifications"

**Stage 3 - Constraints**: "Must work with existing auth, use Supabase Edge Function for emails, UK timezone"

## Standard Operating Procedure

1. **Gather Context** - Understand requirements, constraints, existing code
2. **Clarify** - Ask if anything unclear or multiple approaches exist
3. **Build** - Create working implementation (if auto-approved)
4. **Validate** - Create test script to verify it works
5. **Document** - Explain what was done and any assumptions
6. **Update Context** - Note what's complete and what's next
7. **Rollback** - Provide undo steps for significant changes
8. **Confirm** - Check ready before moving to next stage

## Code Delivery Standards

**Always Provide**:
- Complete files, not snippets
- All necessary imports and dependencies
- Copy-paste ready code (no placeholders like `YOUR_API_KEY`)
- Comments explaining complex logic (not obvious code)
- Example inputs/outputs for new functions
- Validation script to test the implementation

**Document Key Decisions**:
```javascript
// ASSUMPTION: User authenticated before reaching this endpoint
// ASSUMPTION: PDF files under 10MB (Supabase free tier)
// DEPENDENCIES: Requires 'user_signup' table in Supabase
```

## Anti-Patterns to Avoid

**Don't Use These Phrases**:
- "Production-ready code" (over-engineering trigger)
- "Enterprise-grade solution" (unnecessary complexity)
- "Future-proof implementation" (solving imaginary problems)
- "Scalable architecture" (unless specifically requested)

**Use These Instead**:
- "Working code that does X"
- "Implementation handling cases: A, B, C"
- "Here's a validation script to test it"
- "Assumption: X, Y, Z (documented in code)"

## Code Standards

- **JavaScript**: ES6+, 2 spaces, single quotes, semicolons, camelCase
- **Supabase**: Always handle errors, check for null, use RLS policies
- **Error handling**: Specific error messages with logger, never silent failures
- **Functions**: Keep focused, under 50 lines, one responsibility

## Project-Specific Patterns

### Critical Tables
- `user_signup` - Personal info, vehicle, insurance (primary: create_user_id)
- `incident_reports` - Accident details (131+ columns)
- `user_documents` - Image processing status (status, retry_count, storage_path)
- `ai_transcription` - OpenAI Whisper transcripts
- `completed_incident_forms` - Final PDF records

### Webhook Processing Pattern
```javascript
// 1. Verify signature immediately
const isValid = verifySignature(req.rawBody, signature);
if (!isValid) return res.status(401).json({ error: 'Invalid' });

// 2. Send 200 OK quickly (Typeform timeout = 5s)
res.status(200).json({ received: true });

// 3. Process async (don't block response)
processAsync(data).catch(logger.error);
```

### PDF Generation Pattern
```javascript
// 1. Fetch data from 6 tables
const data = await fetchAllData(userId);

// 2. Fill PDF form (150+ fields)
const filledPdf = await pdfService.fillForm(data);

// 3. Compress and store
const compressed = await pdfService.compress(filledPdf);
await supabase.storage.from('bucket').upload(path, compressed);
```

### Error Handling Pattern
```javascript
try {
  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Not found');

  return data;
} catch (error) {
  logger.error('Database error:', error);
  throw new Error('User-friendly message'); // Never expose internals
}
```

## Git Workflow

**Commit format**: `type: description`
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Never commit: `.env`, `credentials/`, `node_modules/`

**Branches**:
- `main` - Production
- `develop` - Development
- `feat/name` - Features
- `fix/name` - Bug fixes

## Environment Variables

```bash
# Required
SUPABASE_URL=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx  # For webhooks (bypasses RLS)
SUPABASE_ANON_KEY=xxx          # For client auth
OPENAI_API_KEY=xxx
TYPEFORM_WEBHOOK_SECRET=xxx

# Optional (falls back gracefully)
PDF_SERVICES_CLIENT_ID=xxx
PDF_SERVICES_CLIENT_SECRET=xxx
```

## UK-Specific Defaults

Automatically apply:
- Date format: DD/MM/YYYY
- Currency: £ and GBP
- Timezone: Europe/London (GMT/BST)
- Phone: +44 country code
- British English spelling in UI

## Testing Priorities

**Do Test**:
- Authentication flows
- Database operations with real data
- Webhook signature verification
- PDF generation with actual user data
- Error handling for likely scenarios

**Don't Test** (unless specifically needed):
- Hypothetical edge cases
- Performance at unrealistic scales

## Quick Reference

### Common Commands

```bash
# Development server
npm start

# Run tests
npm test

# Install dependencies
npm install

# Test Adobe PDF integration
node test-adobe-pdf.js

# Test PDF form filling
node test-form-filling.js [user-uuid]

# Check Supabase connection
node scripts/test-supabase-client.js
```

### File Locations

| Type | Location |
|------|----------|
| Services | `/src/services/` |
| Controllers | `/src/controllers/` |
| Utils | `/src/utils/` |
| Public HTML | `/public/` |
| PDF Templates | `/pdf-templates/` |
| Adobe Credentials | `/credentials/` (not in Git) |
| Tests | Root or `/test-` prefix |
| Documentation | Root `.md` files |

### Quick Links

| Resource | URL |
|----------|-----|
| Supabase Dashboard | https://supabase.com/dashboard |
| Adobe Console | https://www.adobe.io/console |
| GitHub Repo | https://github.com/[your-repo] |
| Adobe Docs | https://developer.adobe.com/document-services/docs/ |

---

**Core Rule**: Build working solutions for actual requirements. Keep it simple, secure, and maintainable.

**Last Updated**: 2025-10-19
