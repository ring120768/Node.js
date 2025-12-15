# Supabase MCP Setup Guide

## Option 1: Use Supabase MCP (Automated)

To use the Supabase MCP to create tables automatically, you need to configure it first.

### Step 1: Get Your Supabase Access Token

1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Name it: "Claude Code MCP"
4. Copy the token (you'll only see it once!)

### Step 2: Configure Supabase MCP for Claude Code

Create or edit your MCP configuration file:

**Location:** `~/.claude/mcp-config.json` or Claude Code settings

Add this configuration:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server",
        "--access-token",
        "YOUR_ACCESS_TOKEN_HERE"
      ]
    }
  }
}
```

Replace `YOUR_ACCESS_TOKEN_HERE` with the token you copied.

### Step 3: Restart Claude Code

After saving the configuration, restart Claude Code to load the MCP server.

### Step 4: Let Claude Create the Tables

Once configured, you can ask me:
> "Use the Supabase MCP to create the witness and vehicle tables"

And I'll be able to execute the SQL directly!

---

## Option 2: Manual Setup (Simpler, Recommended)

If you don't want to configure MCP, just use the Supabase Dashboard:

### Quick Steps:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select "Car Crash Supabase" project
   - Click "SQL Editor" → "New query"

2. **Copy This File**
   ```
   scripts/COMBINED-create-witness-vehicle-tables.sql
   ```

3. **Paste and Run**
   - Paste the entire file
   - Click "Run" button
   - Wait for "Success" message

4. **Verify**
   - Go to "Table Editor"
   - Check for `incident_witnesses` and `incident_other_vehicles`

That's it! Takes 30 seconds.

---

## Option 3: Alternative Node.js Script (Not Recommended)

The JavaScript Supabase client doesn't support DDL operations directly, so the automated script won't work reliably.

**Why:** Supabase JS client is designed for data operations (INSERT, SELECT, UPDATE, DELETE), not schema changes (CREATE TABLE, ALTER TABLE).

**Alternative:** Use Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Execute SQL
supabase db execute -f scripts/COMBINED-create-witness-vehicle-tables.sql --project-ref kctlcmbjmhcfoobmkfrs
```

---

## Comparison of Options

| Option | Pros | Cons | Time |
|--------|------|------|------|
| **MCP** | Automated, reusable | Requires token setup | 5 min setup |
| **Dashboard** | Simple, visual feedback | Manual copy/paste | 30 seconds |
| **Supabase CLI** | Command-line, scriptable | Requires CLI install | 2 min |

---

## Recommended Approach

**For first-time setup:** Use **Option 2 (Dashboard)** - it's fastest and most reliable.

**For future automation:** Set up **Option 1 (MCP)** - then you can create/modify tables just by asking me.

---

## After Tables Are Created

Verify they work:

```bash
# Test API endpoints
npm start

# Test witness creation
curl -X POST http://localhost:5000/api/witnesses \
  -H "Content-Type: application/json" \
  -d '{"incident_id":"test","create_user_id":"test","witness_name":"Test"}'

# Test PDF generation
node test-witness-vehicle-pdf.js [user-uuid]
```

---

## Troubleshooting MCP Setup

### "command not found: npx"
**Solution:** Install Node.js first, or use local Supabase MCP

### "unauthorized" error
**Solution:** Check your access token is correct

### MCP not loading
**Solution:**
1. Verify config file location
2. Check JSON syntax is valid
3. Restart Claude Code
4. Check logs for errors

---

**Need Help?**
- Supabase MCP docs: https://supabase.com/docs/guides/mcp
- My recommendation: Use the dashboard (Option 2) - it's reliable and fast!
