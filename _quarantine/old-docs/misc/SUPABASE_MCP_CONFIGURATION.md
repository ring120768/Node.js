# Supabase MCP Configuration Guide

**Project:** Car Crash Lawyer AI
**Date:** 2025-10-28
**Status:** ✅ MCP Actively Used - Selected for its benefits to this project

---

## Current Status

The Supabase MCP server is **already installed and configured** globally in your Claude Desktop configuration and is **actively used** for this project. All MCPs have been selected for their specific benefits to streamline development and operations.

## Primary Use: Supabase MCP

**Why we use Supabase MCP:**
1. ✅ **Fast queries** - Quick ad-hoc data exploration during development
2. ✅ **Direct access** - No need to write scripts for simple operations
3. ✅ **Flexible** - Natural language interface for database operations
4. ✅ **Development efficiency** - Faster iteration during development

**When to use Supabase MCP:**
- 🔍 **Quick queries** - Ad-hoc data exploration during debugging
- 📊 **Data inspection** - Check data structure and relationships
- 🚀 **Rapid development** - Fast prototyping and testing
- 🧪 **Development operations** - Create, read, update, delete operations in dev environment

---

## Alternative: Node.js Scripts (For Production/Auditable Operations)

**Node.js scripts are available as an alternative when:**
1. ✅ **Version controlled operations** - Need Git history of database changes
2. ✅ **Auditable workflows** - Can review what operations were performed
3. ✅ **Testable procedures** - Can run `--dry-run` mode before execution
4. ✅ **Documented processes** - Clear comments explaining complex operations
5. ✅ **Safer for production** - Explicit confirmation before destructive operations
6. ✅ **Project-specific logic** - Tailored to our schema and workflow

**Available Scripts:**
- `scripts/clear-test-data.js` - Clear all test data safely (with dry-run)
- `scripts/test-supabase-client.js` - Verify connection
- `scripts/backfill-signed-urls.js` - Backfill signed URLs (with dry-run)
- `scripts/monitor-image-processing.js` - Monitor uploads
- `scripts/retry-failed-images.js` - Retry failed uploads

---

## Best Practice: Use Both Tools

**Supabase MCP** → Development, exploration, quick operations
**Node.js Scripts** → Production changes, bulk operations, auditable workflows

---

## Current MCP Configuration

The Supabase MCP server is configured in your Claude Desktop settings with:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-supabase"
      ],
      "env": {
        "SUPABASE_URL": "your-project-url.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
```

**Environment variables are loaded from:**
- Global Claude Desktop configuration
- Your project's `.env` file is NOT used by MCP

---

## Using Supabase MCP

Supabase MCP is already enabled and working. You can use natural language commands:

**Query data:**
```
"Show me the last 5 users from user_signup table"
"Count all records in incident_reports"
"Find users with email containing 'test'"
```

**Insert data:**
```
"Insert a test user into user_signup with email test@example.com"
```

**Update data:**
```
"Update user with id X to set status = 'active'"
```

**Delete data:**
```
"Delete all records from user_documents where status = 'failed'"
```

---

## Safety Guidelines When Using MCP

**✅ DO:**
- Use for read-only queries
- Use for development/testing environments
- Verify results with scripts afterward
- Ask for confirmation before destructive operations

**❌ DON'T:**
- Delete production data without backups
- Modify RLS policies without understanding impact
- Bypass GDPR consent checks
- Execute raw SQL without validation

---

## Alternative: Keep Using Scripts (Recommended)

The current approach with Node.js scripts is **production-grade** and follows best practices:

**Example workflow:**
```bash
# 1. Preview what will be deleted
node scripts/clear-test-data.js --dry-run

# 2. Review output carefully
# 3. Execute if satisfied
node scripts/clear-test-data.js

# 4. Verify results
node scripts/test-supabase-client.js
```

**Benefits:**
- 🔒 **Safe** - Dry-run mode prevents accidents
- 📝 **Documented** - Each script has detailed comments
- 🔄 **Repeatable** - Same operations every time
- 🧪 **Testable** - Can add unit tests
- 📚 **Educational** - Team can learn from code

---

## MCP vs Scripts Comparison

| Feature | Supabase MCP | Node.js Scripts |
|---------|--------------|----------------|
| **Speed** | ⚡ Instant | 🚀 Fast (seconds) |
| **Safety** | ⚠️ Manual | ✅ Dry-run mode |
| **Audit Trail** | ❌ No | ✅ Git history |
| **Documentation** | ❌ Minimal | ✅ Comprehensive |
| **Team Learning** | ❌ No | ✅ Yes |
| **Version Control** | ❌ No | ✅ Yes |
| **Production Ready** | ⚠️ Risky | ✅ Safe |

---

## Recommendation

**Use Supabase MCP as primary tool for:**
- Quick database queries and exploration
- Ad-hoc data inspection during development
- Fast prototyping and testing
- Creating, reading, updating, and deleting test data

**Use Node.js scripts when you need:**
- Auditable operations with Git history (`clear-test-data.js`)
- Complex migrations with dry-run preview (`run-signed-url-migration.js`)
- Bulk operations with rollback safety (`backfill-signed-urls.js`)
- Ongoing monitoring and automation (`monitor-image-processing.js`)

This approach gives you the best of both worlds: **fast MCP operations for development, safe scripts for production**.

---

## Current Project Tools

**Available MCP Servers:**
1. ✅ **perplexity** - Web search and research
2. ✅ **firecrawl** - Web scraping
3. ✅ **ref** - Documentation search
4. ✅ **supabase** - Database operations (primary method for development)
5. ✅ **sentry** - Error tracking
6. ✅ **everything** - Testing MCP features
7. ✅ **memory** - Knowledge graph
8. ✅ **playwright** - Browser automation

**All MCPs are actively used and selected for their benefits to this project.**

**Two Approaches for Supabase:**
- 🚀 **Supabase MCP** - Primary for development, quick operations, exploration
- 📜 **Node.js scripts** - Alternative for production changes, bulk operations, audit trails

---

## Questions?

If you want to enable direct Supabase MCP access, just ask and I can:
1. Update project guidelines
2. Create quick reference commands
3. Set up safety guardrails
4. Train you on best practices

Otherwise, the current script-based approach is **production-ready and safe**! ✅

---

**Last Updated:** 2025-10-28
**Author:** Claude Code
**Review Date:** 2025-11-28 (recommended quarterly review)
