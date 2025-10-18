---
description: Show all available slash commands and their usage
---

# Available Slash Commands

Here are all the slash commands available for this project:

## 🚀 Session Management

### `/start`
**Usage:** `/start`
**Purpose:** Load full project context at the beginning of a new session
**When to use:** First command when starting work after a break

Loads:
- Project overview and tech stack
- Current status of Adobe PDF and Supabase
- Recent commits and changes
- Key files and documentation
- What to ask before starting work

---

### `/status`
**Usage:** `/status`
**Purpose:** Check status of all services and integrations
**When to use:** When you want to verify everything is configured correctly

Checks:
- Git status and recent commits
- Adobe PDF Services (credentials + template)
- Supabase connection
- Node modules installation
- Project structure integrity

---

### `/recent`
**Usage:** `/recent`
**Purpose:** Show recent work and changes
**When to use:** When you need context about what was worked on last

Shows:
- Last 10 commits
- Uncommitted changes
- Recent documentation updates
- Current branch status
- Suggested next actions

---

## 📚 Documentation & Learning

### `/architecture`
**Usage:** `/architecture`
**Purpose:** Explain project structure and how components interact
**When to use:** When you need to understand how the system works

Explains:
- Directory structure
- Data flow (user → PDF generation → email)
- Integration points (Adobe, Supabase, Typeform)
- Database tables and their relationships
- API endpoints
- Security layers

---

### `/docs`
**Usage:** `/docs`
**Purpose:** List all documentation files and their purposes
**When to use:** When you need to find specific documentation

Lists:
- Implementation guides
- API references
- Setup instructions
- Field mapping documents
- Quick reference cards

---

### `/db`
**Usage:** `/db`
**Purpose:** Show database schema and table relationships
**When to use:** When you need to understand the database structure

Shows:
- All tables with descriptions
- Key fields in each table
- Relationships between tables
- RLS policies summary
- Sample queries for common operations

---

## 🧪 Testing & Validation

### `/test-all`
**Usage:** `/test-all`
**Purpose:** Run all test scripts
**When to use:** After making changes, or to verify everything works

Runs:
- Adobe PDF Services test
- Supabase connection test
- NPM test suite (if configured)
- Lists tests that need manual parameters

---

## 💡 Quick Tips

**Starting a new session?**
1. Run `/start` to load context
2. Run `/status` to check services
3. Run `/recent` to see what was worked on last

**Need to understand something?**
1. Run `/architecture` for overall structure
2. Run `/docs` to find specific documentation
3. Run `/db` to understand database

**After making changes?**
1. Run `/test-all` to verify everything works
2. Check `/status` to ensure services still configured

---

## 🔧 Custom Commands

You can create your own slash commands by adding `.md` files to:
`.claude/commands/your-command-name.md`

**Template:**
```markdown
---
description: Brief description of what the command does
---

# Command Name

Instructions for Claude on what to do when this command is run.

You can include:
- Tasks to complete
- Files to check
- Commands to run
- Format for presenting results
```

---

## 📖 Global Rules

The project has global rules defined in `.claude/claude.md` that I follow automatically:

- **Code style**: 2 spaces, single quotes, semicolons
- **Security**: Validate inputs, use RLS, no secrets in code
- **Testing**: Create validation scripts after features
- **Git**: Commit messages like `feat:` or `fix:`
- **Documentation**: Complete files, no placeholders
- **Context engineering**: How to provide good context (file names, constraints, why you need it)
- **Communication templates**: Bug reports, feature requests, refactors
- **British English**: DD/MM/YYYY, £ GBP, +44 codes

See `.claude/claude.md` for full details.

---

Need help with something specific? Just ask!
