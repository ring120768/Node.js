# Claude Code Slash Commands Reference

## Available Commands

You now have **9 custom slash commands** to help with your Car Crash Lawyer AI project!

### Quick Command List

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/start` | Load full project context | **Start of new session** |
| `/context` | Quick context refresh | During session for quick reminder |
| `/status` | Check all services | Verify integrations working |
| `/recent` | Show recent work | Continue from where you left off |
| `/architecture` | Explain project structure | Understand how system works |
| `/docs` | List all documentation | Find specific guides |
| `/db` | Show database schema | Understand data structure |
| `/test-all` | Run all tests | Verify everything works |
| `/help` | List all commands | See all available commands |

---

## Typical Workflow

### Starting a New Session

```
You: /start
Claude: [Loads full context, checks services, shows recent work]

You: What should I work on?
Claude: [Suggests next steps based on recent commits and project status]
```

### Mid-Session Context Refresh

```
You: /context
Claude: [Quick summary of project, current branch, last commit]

You: I need to understand the database
You: /db
Claude: [Shows complete database schema with relationships]
```

### Before Making Changes

```
You: /status
Claude: [Checks Adobe, Supabase, Git, Node modules]

You: /test-all
Claude: [Runs all test scripts]

You: [Make your changes]

You: /test-all
Claude: [Verify changes didn't break anything]
```

### Understanding the System

```
You: /architecture
Claude: [Shows project structure, data flow, integrations]

You: /docs
Claude: [Lists all documentation]

You: Read ADOBE_FORM_FILLING_GUIDE.md
Claude: [Shows complete field mapping guide]
```

---

## Command Details

### 1. `/start` - New Session Starter
**Best for:** First command of the day

**What it does:**
- Loads project overview (tech stack, features)
- Checks Adobe PDF Services status
- Checks Supabase connection
- Shows recent commits (last 10)
- Lists key files to be aware of
- Suggests what to ask before starting work

**Example output:**
```
# New Session - Load Project Context

You are working on Car Crash Lawyer AI...

## Current Status - Check These

Adobe PDF Integration: ✅ Ready
Supabase Connection: ✅ Connected
Recent Work: feat: Add Adobe PDF form filling service

## What to Ask Me

1. What are you working on?
2. Any errors or issues?
3. What's the priority?
```

---

### 2. `/context` - Quick Context
**Best for:** Mid-session reminders

**What it does:**
- Shows last commit
- Shows current branch
- Shows uncommitted changes
- Quick Adobe status check
- Reminds you of key files

**Example output:**
```
# Quick Context Refresh

Project: Car Crash Lawyer AI
Current Branch: feat/audit-prep
Last Commit: feat: Add Adobe PDF form filling service

Adobe PDF: ✅ Ready
Uncommitted: 3 modified files
```

---

### 3. `/status` - Service Health Check
**Best for:** Verifying everything is configured

**What it does:**
- Checks Git status
- Verifies Adobe credentials exist
- Verifies PDF template exists
- Tests Adobe service readiness
- Checks Supabase environment variables
- Verifies Node modules installed
- Checks project directory structure

**Example output:**
```
| Service | Status | Notes |
|---------|--------|-------|
| Git | ✅ | feat/audit-prep, 3 uncommitted files |
| Adobe PDF | ✅ | Credentials + template ready |
| Supabase | ✅ | Environment variables configured |
| Node Modules | ✅ | All packages installed |
| Project Structure | ✅ | All directories exist |

Overall Status: ✅ Ready to work
```

---

### 4. `/recent` - Recent Work Summary
**Best for:** Continuing from where you left off

**What it does:**
- Shows last 10 commits
- Shows uncommitted changes
- Reads recent documentation updates
- Lists recent test files
- Shows current branch status
- Suggests next actions

**Example output:**
```
Last 5 Commits:
feat: Add Adobe PDF form filling service
fix: Resolve CORS issue in webhook handler
docs: Update field mapping guide

Uncommitted Changes:
- Modified: 3 files (pdf.controller.js, adobePdfFormFillerService.js, README.md)

Recent Documentation:
- IMPLEMENTATION_SUMMARY.md (updated today)

Current Branch: feat/audit-prep (2 commits ahead of main)

Summary: Implemented Adobe PDF form filling to replace Zapier/PDFco.
Next: Test with real user data and verify all fields filled correctly.
```

---

### 5. `/architecture` - System Overview
**Best for:** Understanding how everything connects

**What it does:**
- Shows directory structure
- Explains data flow (user → PDF → email)
- Documents integration points (Adobe, Supabase, Typeform)
- Lists all database tables
- Shows API endpoints
- Explains security layers

**Example output:**
```
# Project Architecture Overview

## Data Flow - PDF Generation

User Submits Form
    ↓
Supabase (user_signup, incident_reports)
    ↓
POST /api/pdf/generate
    ↓
Adobe PDF Form Filler (150+ fields)
    ↓
Compress & Store
    ↓
Email to User
```

---

### 6. `/docs` - Documentation Index
**Best for:** Finding specific guides

**What it does:**
- Lists all `.md` files in project
- Categorizes by topic (Setup, Guides, Reference)
- Shows file sizes and last modified dates
- Provides "quick access guide" for common tasks
- Highlights most important documents

**Example output:**
```
### Adobe PDF Services Documentation

| File | Purpose | Size | Last Modified |
|------|---------|------|---------------|
| ADOBE_SETUP_COMPLETE.md | Credentials setup | 15kB | 2025-10-18 |
| ADOBE_FORM_FILLING_GUIDE.md | Field mappings | 45kB | 2025-10-18 |

### Quick Access Guide

New to the project?
1. Start with README.md
2. Read QUICK_START_FORM_FILLING.md
3. Review .claude/claude.md for coding standards
```

---

### 7. `/db` - Database Schema
**Best for:** Understanding data structure

**What it does:**
- Lists all tables with descriptions
- Shows key fields for each table
- Explains relationships between tables
- Provides common query examples
- Shows RLS policy summary
- Documents storage buckets

**Example output:**
```
# Database Schema Reference

## Core Tables Overview

user_signup - Primary user information
- Key Fields: create_user_id, driver_name, email, license_plate
- Relationships: 1:many with incidents, images, dvla

incident_reports - Accident details
- Key Fields: accident_date, location, weather conditions
- Relationships: Belongs to user_signup

[Complete schema with all 7 tables...]

## Database Relationships Diagram

user_signup (create_user_id)
    ├──→ incident_reports (1:many)
    ├──→ incident_images (1:many)
    └──→ completed_incident_forms (1:many)
```

---

### 8. `/test-all` - Run All Tests
**Best for:** Verifying everything works

**What it does:**
- Lists all test files
- Runs Adobe PDF Services test
- Runs Supabase connection test
- Runs NPM test suite (if configured)
- Shows results for each test
- Provides summary and recommendations

**Example output:**
```
# Run All Tests

Test: Adobe PDF Services
File: test-adobe-pdf.js
Status: ✅ PASSED
Output: PDF created (245KB), compressed (145KB), 40% saved
Time: 4 seconds

Test: Supabase Connection
File: scripts/test-supabase-client.js
Status: ✅ PASSED
Output: Connected successfully
Time: 1 second

Test Results:
- ✅ Passed: 2/2
- ⚠️ Warnings: 0
- ❌ Failed: 0

Overall: ✅ All systems operational
```

---

### 9. `/help` - Command Reference
**Best for:** Seeing all available commands

**What it does:**
- Lists all commands with descriptions
- Shows when to use each command
- Provides usage examples
- Explains how to create custom commands
- References global rules

**Example output:**
```
# Available Slash Commands

## 🚀 Session Management

### /start
Usage: /start
Purpose: Load full project context
When to use: First command when starting work

[Lists all 9 commands with details...]
```

---

## Creating Custom Commands

You can add your own commands! Just create a file in `.claude/commands/`:

**Example:** `.claude/commands/deploy.md`

```markdown
---
description: Deploy to production
---

# Deploy to Production

1. Run all tests
2. Check git status
3. Verify on main branch
4. Build project
5. Deploy via [your deployment method]
6. Verify deployment successful
```

Then use it with: `/deploy`

---

## Tips for Using Commands

**Start of day:**
```
/start → /status → /recent → [begin work]
```

**Need context:**
```
/context (quick) or /architecture (detailed)
```

**Before committing:**
```
/test-all → [verify all pass] → git commit
```

**Learning the system:**
```
/architecture → /db → /docs
```

**Stuck on something:**
```
/help → [find relevant command] → run it
```

---

## Command Files Location

All commands are stored in:
```
.claude/commands/
├── start.md
├── context.md
├── status.md
├── recent.md
├── architecture.md
├── docs.md
├── db.md
├── test-all.md
└── help.md
```

You can edit any of these files to customize their behavior!

---

## How Commands Work

When you type `/start`, Claude Code:
1. Reads `.claude/commands/start.md`
2. Follows the instructions in that file
3. Returns the results to you

**The markdown file contains instructions for Claude, not for you!**

---

## Global Rules Integration

Commands work alongside `.claude/claude.md` global rules:

**Global Rules:** How I should code, communicate, and work
**Commands:** What specific tasks to do when you ask

Both work together to make sessions more efficient!

---

## Next Steps

1. **Try them out!** Start your next session with `/start`
2. **Customize them:** Edit command files to fit your workflow
3. **Create new ones:** Add commands for tasks you do frequently
4. **Share feedback:** Let me know which commands are most useful

---

**Questions about commands?** Just ask or run `/help`!
