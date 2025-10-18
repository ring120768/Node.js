# Claude Code Global Rules

## Project Overview
Web application built with HTML, JavaScript, Node.js, Supabase (backend/database), and GitHub version control.

**Environment**: Claude Code + Local Development
**Direct Integrations**: Adobe Acrobat Pro (PDF Services), Supabase, GitHub
**Location**: UK (DD/MM/YYYY, £ GBP, GMT/BST timezone, +44 phone codes, British English)

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
- Use Supabase RLS policies (never trust client-side checks alone)
- Sanitize data before displaying (prevent XSS)
- Never commit credentials or API keys to Git
- Use environment variables for all secrets

## Permissions & Execution

### ✅ Auto-Execute (No Confirmation)

**File Operations**
- Create, edit, delete, rename files
- Set up project structure and folders
- Create/update documentation files (.md)

**Development**
- Write/modify JavaScript, HTML, CSS, Node.js
- Fix bugs, implement features, refactor code
- Install packages (`npm install`), create configs
- Add validation and error handling
- Create validation/test scripts after implementing
- Update .gitignore for new file types

**Supabase Direct Access** (Development Only)
- Query development database (read operations)
- Create/modify tables and schemas (dev environment)
- Set up RLS policies (dev environment)
- Upload files to Storage (test buckets)
- Create Edge Functions
- View logs and monitor usage

**GitHub Direct Access**
- Commit to development/feature branches
- Create branches and pull requests
- Update documentation (README, guides, issues)
- Manage project board
- Create/update .github workflows for CI/CD

**Adobe PDF Services**
- Read and analyze PDFs
- Extract text/data from PDFs
- Generate test/development PDFs
- Fill PDF forms, compress, merge, convert formats
- OCR scanned documents

### ⚠️ Ask First

**Destructive Operations**
- Production database changes (INSERT, UPDATE, DELETE)
- Pushing to main/master branch
- Deleting multiple files or tables (>3 items)
- Bulk operations affecting >10 records
- Dropping tables or columns
- Changing database schema in production

**Security & Access**
- RLS policy changes in production
- Adding new admin users or roles
- Changing authentication flows
- Exposing new API endpoints
- Processing PDFs containing sensitive/legal data

**Cost-Impacting Changes**
- Upgrading paid services or tiers
- Adding new third-party services
- Changes that significantly increase API usage
- Large file uploads to Supabase Storage

**Major Architectural Changes**
- Switching libraries or frameworks
- Changing database structure significantly
- Refactoring >5 files at once
- Changing build/deployment processes

## Standard Operating Procedure

When implementing a feature or fix:

1. **Understand Requirements**
   - Clarify specific requirements (not vague goals)
   - Identify constraints (performance, cost, security)
   - Note any assumptions being made

2. **Plan Approach**
   - Choose simplest solution that works
   - Identify files that need changes
   - Consider security implications
   - Estimate API usage impact (if applicable)

3. **Build Implementation**
   - Write complete, working code
   - Add error handling and validation
   - Include necessary imports and dependencies
   - Use existing patterns from the codebase
   - Add comments for complex logic only

4. **Create Validation**
   - Write test script or manual test steps
   - Test edge cases and error conditions
   - Verify security measures work
   - Check database changes are correct

5. **Document Changes**
   - Explain what was implemented and why
   - List any assumptions made
   - Note any new dependencies
   - **Update Existing Documentation** (mandatory):
     - Search for .md files mentioning changed features/services
     - Update outdated information in existing guides
     - Remove obsolete references (e.g., old workflows, deprecated services)
     - Update "Last Updated" dates in modified docs
     - Check README.md for affected sections
   - Create new documentation if needed
   - Run `/update-docs` command to verify all docs are current

6. **Provide Rollback**
   - For database changes: provide revert SQL
   - For code changes: note what files were modified
   - For Supabase Storage: note what was uploaded

7. **Suggest Next Steps**
   - What comes next in the workflow
   - Optional enhancements for future
   - Related items that might need updating

8. **Confirm Before Proceeding**
   - Check user is ready before moving to next major task
   - Ensure current implementation meets expectations

## Post-Implementation Checklist

After completing any task, verify:

- [ ] **Code complete** - No placeholders, all imports included
- [ ] **Tests created** - Validation script or test steps provided
- [ ] **Documentation updated** - Existing .md files checked and updated
- [ ] **New docs created** - If needed (guides, references, summaries)
- [ ] **Rollback documented** - How to undo changes if needed
- [ ] **Security checked** - No credentials exposed, inputs validated
- [ ] **Git ready** - Changes ready to commit with proper message format

## Code Delivery Standards

### Always Provide

**Complete Code**:
- Full files, never snippets (unless specifically requested)
- All necessary imports and dependencies at the top
- Copy-paste ready code (no placeholders like `YOUR_API_KEY` or `TODO: implement this`)
- Proper error handling (try-catch where appropriate)
- Input validation before processing

**Clear Documentation**:
- Comments explaining **why**, not what (code shows what)
- Example inputs/outputs for new functions
- Document assumptions and dependencies at top of file
- Validation script to test the implementation

**Working Examples**:
```javascript
// ❌ DON'T: Placeholders
const supabase = createClient(YOUR_URL, YOUR_KEY);

// ✅ DO: Real implementation with clear instructions
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
// NOTE: Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
```

### Document Key Decisions

At the top of files, document critical assumptions:

```javascript
/**
 * PDF Form Filler Service
 *
 * ASSUMPTIONS:
 * - User authenticated before reaching this endpoint
 * - PDF files under 10MB (Supabase free tier limit)
 * - Adobe credentials configured in /credentials/
 *
 * DEPENDENCIES:
 * - Requires @adobe/pdfservices-node-sdk
 * - Requires 'user_signup' and 'incident_reports' tables in Supabase
 * - Requires PDF template at /pdf-templates/
 *
 * ENVIRONMENT VARS:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_KEY
 */
```

## Coding Standards

### File Organization

**Naming Conventions**:
- Files: `camelCase.js` (e.g., `pdfGenerator.js`)
- Services: `serviceName.js` in `/src/services/`
- Controllers: `controllerName.controller.js` in `/src/controllers/`
- Utils: `utilityName.js` in `/src/utils/`
- Tests: `fileName.test.js` or `/test-fileName.js`

**File Structure**:
```javascript
// 1. Imports (external first, then internal)
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const logger = require('./utils/logger');

// 2. Constants and configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 3. Helper functions (private)
function validateInput(data) { /* ... */ }

// 4. Main functions (exported)
async function processData(input) { /* ... */ }

// 5. Exports
module.exports = { processData };
```

### Code Style

**Formatting**:
- Indentation: 2 spaces (no tabs)
- Quotes: Single quotes for strings `'like this'`
- Semicolons: Always use them
- Line length: Aim for <100 characters
- Trailing commas: Use in multi-line objects/arrays

**Error Handling**:
```javascript
// ✅ DO: Specific error messages and logging
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Failed to process PDF:', error);
  throw new Error('PDF processing failed - check file format and size');
}

// ❌ DON'T: Silent failures or generic messages
try {
  await riskyOperation();
} catch (error) {
  console.log('error');
}
```

**Async/Await**:
- Prefer `async/await` over `.then()` chains
- Always use `try-catch` with async functions
- Handle Promise rejections

**Function Complexity**:
- Keep functions focused (one responsibility)
- If function is >50 lines, consider breaking it up
- Extract complex conditionals into named functions

### Database Operations

**Supabase Queries**:
```javascript
// ✅ DO: Handle errors, check for null, use select filters
const { data, error } = await supabase
  .from('users')
  .select('id, email, name')
  .eq('id', userId)
  .single();

if (error) {
  logger.error('Database query failed:', error);
  throw new Error('Failed to fetch user');
}

if (!data) {
  throw new Error('User not found');
}

// ❌ DON'T: Assume query succeeds or returns data
const { data } = await supabase.from('users').select('*');
const userName = data.name; // Could crash if data is null
```

**RLS Policies**:
- Always create RLS policies for new tables
- Test policies with different user roles
- Document policy purpose in SQL comments

## Testing & Validation

### Validation Scripts

After implementing a feature, create a test script:

```javascript
// test-feature-name.js
const { functionToTest } = require('./src/services/myService');

async function testFeature() {
  console.log('Testing feature...');

  // Test 1: Normal case
  const result1 = await functionToTest({ valid: 'input' });
  console.assert(result1.success === true, 'Normal case failed');

  // Test 2: Edge case
  const result2 = await functionToTest({ edge: 'case' });
  console.assert(result2.handled === true, 'Edge case failed');

  // Test 3: Error case
  try {
    await functionToTest({ invalid: 'input' });
    console.assert(false, 'Should have thrown error');
  } catch (error) {
    console.assert(error.message.includes('expected'), 'Wrong error message');
  }

  console.log('✅ All tests passed!');
}

testFeature().catch(console.error);
```

### Manual Testing Steps

For UI features, provide manual test steps:

```markdown
## Manual Testing Steps

1. **Test User Flow**
   - Navigate to /transcription-status.html
   - Click "Start Recording"
   - Speak for 10 seconds
   - Click "Stop Recording"
   - Expected: See transcription appear within 5 seconds

2. **Test Error Handling**
   - Deny microphone permission
   - Expected: See error message "Microphone access denied"

3. **Test Edge Cases**
   - Record 0 seconds (immediately stop)
   - Expected: Show "Recording too short" error
```

## Git Workflow

### Commit Messages

Format: `type: brief description (50 chars max)`

**Types**:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code restructuring (no functionality change)
- `test:` Adding/updating tests
- `chore:` Maintenance (dependencies, configs)

**Examples**:
```bash
feat: Add Adobe PDF form filling service
fix: Resolve CORS issue in webhook handler
docs: Update ADOBE_FORM_FILLING_GUIDE with field mappings
refactor: Extract PDF compression into separate function
test: Add validation script for form filling
chore: Update @adobe/pdfservices-node-sdk to v3.4.0
```

### Branching

- `main` - Production-ready code
- `develop` - Development branch (default for new features)
- `feat/feature-name` - Feature branches
- `fix/bug-description` - Bug fix branches
- `docs/update-description` - Documentation updates

**Workflow**:
1. Create feature branch from `develop`
2. Commit changes with clear messages
3. Create PR to `develop`
4. After testing, merge `develop` to `main`

## Environment & Configuration

### Environment Variables

**Required for Development**:
```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key

# Adobe PDF Services (optional - uses fallback if missing)
ADOBE_CLIENT_ID=your-client-id
ADOBE_CLIENT_SECRET=your-client-secret

# Application
NODE_ENV=development
PORT=3000
```

**File Location**: `.env` (never commit this file!)

**Loading**: Use `dotenv` package:
```javascript
require('dotenv').config();
const supabaseUrl = process.env.SUPABASE_URL;
```

### Configuration Files

**package.json**:
- Keep dependencies organized (production vs dev)
- Document any special scripts
- Specify Node version if critical

**.gitignore**:
- Always ignore: `.env`, `node_modules/`, `*.log`
- Ignore: `credentials/`, `test-output/`, `*.pdf`
- Ignore: OS files (`.DS_Store`, `Thumbs.db`)

## Performance & Optimization

### When to Optimize

**Don't optimize unless**:
- Measured performance issue (use profiling)
- User-visible slowness (>3 seconds for common operations)
- Approaching service limits (database queries, API rate limits)
- Explicitly requested by user

**Do optimize for**:
- Database queries in loops (batch instead)
- Large file processing (stream instead of loading into memory)
- Repeated API calls (cache results)
- N+1 query problems (use joins or batch fetching)

### API Rate Limits

**Adobe PDF Services**:
- Free tier: 500 transactions/month
- Log usage to avoid surprises
- Implement retry logic for rate limit errors

**Supabase**:
- Free tier: 500MB database, 1GB storage
- Monitor usage in Supabase dashboard
- Implement pagination for large queries

## Security Checklist

Before deploying any feature:

- [ ] All user inputs validated
- [ ] SQL injection prevented (using Supabase parameterized queries)
- [ ] XSS prevented (sanitize before displaying user content)
- [ ] Authentication required for protected endpoints
- [ ] RLS policies enabled on all tables
- [ ] No credentials in code (use environment variables)
- [ ] Error messages don't leak sensitive information
- [ ] File uploads validated (type, size, content)
- [ ] CORS configured correctly (not `*` in production)

## Task Management

### Using TodoWrite Tool

**Use TodoWrite for**:
- Multi-step features (>3 steps)
- Complex implementations requiring planning
- User explicitly requests task tracking
- Long-running work spanning multiple interactions

**Don't use TodoWrite for**:
- Single, straightforward tasks
- Quick fixes or simple edits
- Purely informational questions

**Todo Item Format**:
```javascript
{
  content: "Create PDF form filler service",      // Imperative form
  activeForm: "Creating PDF form filler service", // Present continuous
  status: "in_progress"                           // pending | in_progress | completed
}
```

**Rules**:
- ONLY ONE task should be `in_progress` at a time
- Mark tasks `completed` IMMEDIATELY after finishing
- Remove tasks that are no longer relevant
- Break large tasks into smaller, specific subtasks

## Context Engineering

### Goal

Give Claude the right information at the right time to make smart decisions without creating bureaucracy.

### How to Provide Good Context

**Always include:**
- What already exists and works (file names, line numbers)
- What's broken or needs fixing (exact error messages)
- How things connect together (dependencies, relationships)
- Constraints or limits (don't change X, must work with Y)
- Why you need it (helps make better architectural decisions)

**Example - Good Context:**
```
Need to add email validation to signup form.

What exists:
- Form in public/index.html (lines 45-78)
- src/services/authService.js handles signup via Supabase
- Saves to 'user_signup' table

What I need:
- UK email format validation
- Client-side validation (fast user feedback)
- Show error inline below input field

Constraint: Don't change existing authService.js logic
```

**Example - Poor Context (forces guessing):**
```
Add validation
```

### Context Habits

**Do:**
- Mention specific file names and line numbers
- Include table/column names for database work
- Reference existing functions or variables
- Paste exact error messages from console/logs
- Note what NOT to change
- Explain why you need something (context for decisions)

**Don't:**
- Assume I remember previous chat sessions
- Use vague terms ("the form", "that function", "the bug")
- Skip mentioning constraints or requirements
- Leave out recent related changes

### Session Handoffs

When starting a new session, provide continuity:

**Starting session (reference yesterday's work):**
```
Continuing from yesterday:

Completed: PDF upload with validation
Found: Timeout issue on files >8MB
Doing today: Add progress indicator
Files: src/services/uploadService.js, src/config/storage.js
```

**Ending session (notes for tomorrow):**
```
Today's work:
- Added progress bar to uploadService.js (lines 89-124)
- Works for files up to 10MB
- Still need: Error handling for failed uploads

Tomorrow:
- Add retry logic
- Test with poor network conditions
```

### When I Should Ask for More Context

I will ask clarifying questions when:
- Request is vague or ambiguous
- Multiple valid approaches exist and choice depends on preferences
- Security implications are unclear
- Impact on other features is unknown
- Not sure which files/tables are involved
- Constraints or requirements are missing

## Communication Style

### Response Format

1. **Acknowledge the request** (1 line)
2. **Show progress** (if using tools)
3. **Explain what was done** (brief summary)
4. **Show results** (code, file paths, test output)
5. **Next steps** (what comes next or what user should do)

### Writing Style

- **Concise** - No unnecessary verbosity
- **Clear** - Use headers, lists, code blocks
- **Actionable** - Tell user exactly what to do next
- **No emojis** unless user explicitly requests them
- **British English** spelling and grammar

### Anti-Patterns (What NOT to Say)

These phrases trigger over-engineering:

❌ **Avoid:**
- "Production-ready code"
- "Enterprise-grade solution"
- "Future-proof architecture"
- "Scalable architecture" (unless explicitly requested)
- "Backward compatible" (unless specifically needed)

✅ **Instead say:**
- "Working code that does X"
- "Handles cases: A, B, C"
- "Here's a test script to verify"
- "Assumptions documented in code"
- "Keeps it simple, solves today's problem"

### Examples

**❌ Too vague**:
```
I've updated the file. It should work now.
```

**✅ Clear and specific**:
```
Updated `/src/services/pdfService.js` to add error handling for missing files.

Changes made:
- Added try-catch around file reading (line 45)
- Return null instead of throwing error
- Log warning for debugging

Test it:
node test-pdf-service.js

Next: Update the controller to handle null responses.
```

### Communication Templates

Use these templates when requesting work to provide clear context:

**Bug Report Template:**
```
Bug: [What's broken]
File: [Where it happens]
Steps to reproduce:
1. [Step 1]
2. [Step 2]
3. [Error occurs]

Expected: [Should do this]
Actual: [Does this instead]
Error message: [Exact console/log error]
```

**Feature Request Template:**
```
Feature: [What to build]
Why: [The reason/benefit]
Files to change: [List files]
Existing code: [Related functions/components]
Success criteria: [How to know it works]
Constraints: [What NOT to change]
```

**Refactor Request Template:**
```
Refactor: [What code needs refactoring]
Problem: [Why it needs fixing - performance, readability, etc]
Keep working: [What functionality must be preserved]
Impact: [What might be affected by changes]
Test: [How to verify it still works]
```

**Quick Question Template:**
```
Question: [Your question]
Context: [Relevant file/function/table]
Tried: [What you've already attempted]
Need: [What you need to know/understand]
```

## Common Patterns

### Loading External Data

```javascript
// Fetch from Supabase
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

if (error) throw new Error(`Database error: ${error.message}`);
if (!data) throw new Error('User not found');

return data;
```

### Processing Files

```javascript
// Always validate before processing
if (!file) throw new Error('No file provided');
if (file.size > MAX_FILE_SIZE) throw new Error('File too large');
if (!ALLOWED_TYPES.includes(file.type)) throw new Error('Invalid file type');

// Process file
const buffer = await file.arrayBuffer();
const result = await processBuffer(buffer);

return result;
```

### Error Responses (API)

```javascript
// Consistent error format
app.use((error, req, res, next) => {
  logger.error('Request error:', error);

  res.status(error.statusCode || 500).json({
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      requestId: req.requestId
    }
  });
});
```

## Emergency Procedures

### Rollback Procedures

**Database Changes**:
```sql
-- Keep rollback SQL ready before applying changes
-- Example: Adding a column
ALTER TABLE users ADD COLUMN new_field TEXT;
-- Rollback: ALTER TABLE users DROP COLUMN new_field;
```

**Code Deployments**:
```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard [commit-hash]
git push origin main --force  # Ask first for main branch!
```

**Supabase Storage**:
```javascript
// Delete uploaded files if operation fails
try {
  const { data, error } = await supabase.storage
    .from('bucket-name')
    .upload(filePath, fileBuffer);

  if (error) throw error;

  // Do other operations...

} catch (error) {
  // Rollback: Delete the uploaded file
  await supabase.storage
    .from('bucket-name')
    .remove([filePath]);

  throw error;
}
```

## Continuous Improvement

### Learning from Issues

When a bug is fixed:
- Document what caused it
- Note how to prevent similar issues
- Update validation scripts if applicable
- Consider if coding standards need updating

### Refactoring Guidelines

Refactor when:
- Code is duplicated in 3+ places
- Function is >100 lines and does multiple things
- Code is confusing to read (even with comments)
- Performance issue identified through profiling

Don't refactor when:
- Code is working and won't be changed often
- Refactoring adds complexity without clear benefit
- Not enough time to thoroughly test changes

## Project-Specific Notes

### Car Crash Lawyer AI - Key Points

**User Journey**:
1. User signs up (Typeform or web form)
2. Data stored in Supabase (`user_signup` table)
3. User records personal statement (audio transcription)
4. AI analyzes transcription and form data
5. PDF report auto-generated and emailed
6. User can download completed report

**Critical Tables**:
- `user_signup` - Personal info, vehicle, insurance
- `incident_reports` - Accident details, collected via multi-step form
- `incident_images` - Uploaded photos (driving license, vehicle, scene)
- `dvla_vehicle_info_new` - DVLA vehicle check results
- `ai_transcription` - Transcribed personal statements
- `ai_summary` - AI-generated accident summaries
- `completed_incident_forms` - Final PDF reports

**PDF Generation Flow**:
1. Fetch all data from Supabase (via `fetchAllData()`)
2. Fill PDF template using Adobe PDF Services (preferred) or fallback to pdf-lib
3. Compress PDF to save storage
4. Store in Supabase Storage and database
5. Email to user and accounts team

**Legal Requirements**:
- PDF must preserve exact legal structure (17 pages, 150+ fields)
- UK legal proceedings compliance
- GDPR and Data Protection Act 2018 compliance
- DVLA reporting notices included

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

**Last Updated**: 2025-10-18
**Version**: 1.1 (Added Context Engineering principles)
