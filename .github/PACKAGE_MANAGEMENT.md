# Package Management Guidelines

## 🚨 Critical: Railway Deployment Requirements

Railway uses **npm** for dependency installation, not bun. To avoid deployment failures, **always** keep `package-lock.json` in sync with `package.json`.

---

## ✅ Adding New Packages (Correct Way)

### Use npm (Recommended for Railway compatibility)

```bash
# Add a production dependency
npm install <package-name>

# Add a dev dependency
npm install --save-dev <package-name>

# This automatically updates both package.json AND package-lock.json
```

### If using bun locally (Advanced)

If you must use bun for local development:

```bash
# Add package with bun
bun add <package-name>

# Then IMMEDIATELY update package-lock.json
npm install --package-lock-only

# Commit BOTH files
git add package.json package-lock.json
git commit -m "feat: Add <package-name>"
```

---

## 🛡️ Safeguards in Place

### 1. Pre-Push Git Hook

Automatically checks `package-lock.json` sync before every push:

```bash
# Located at: .git/hooks/pre-push
# Runs automatically when you: git push
```

**What it does:**
- Detects if `package.json` was modified
- Regenerates `package-lock.json` if needed
- Blocks push if lock file is out of sync
- Provides clear instructions to fix the issue

### 2. Validation Script

Manual check before deploying:

```bash
npm run validate:lockfile
```

**Returns:**
- ✅ Success: Lock file is in sync
- ❌ Error: Lock file needs update

---

## 🔧 Fixing Out-of-Sync Issues

If Railway deployment fails with "Missing: package-name from lock file":

```bash
# Step 1: Regenerate package-lock.json
npm install --package-lock-only

# Step 2: Commit and push
git add package-lock.json
git commit -m "fix: Update package-lock.json for Railway deployment"
git push origin main
```

---

## 📋 Common Commands

| Command | Purpose | Updates package-lock.json? |
|---------|---------|----------------------------|
| `npm install <pkg>` | Add package | ✅ Yes |
| `bun add <pkg>` | Add package (bun) | ❌ No (uses bun.lockb) |
| `npm install --package-lock-only` | Regenerate lock file | ✅ Yes |
| `npm ci` | Clean install (Railway uses this) | ❌ No (reads from lock) |
| `npm run validate:lockfile` | Check sync status | ✅ Yes (if needed) |

---

## 🎯 Best Practices

1. **Always use npm for package management** (simplest approach)
2. **Run pre-push hook validation** before deploying
3. **Never edit package.json manually** without updating lock file
4. **Check Railway build logs** if deployment fails
5. **Keep Node.js version consistent** (currently: >=18.18)

---

## 🚀 Railway Deployment Process

```
Local Development
       ↓
  git push
       ↓
Pre-push Hook (validates lock file)
       ↓
   GitHub
       ↓
Railway Auto-Deploy
       ↓
npm ci (must have valid package-lock.json)
       ↓
npm start
```

**Critical:** Railway's `npm ci` command **requires** an exact match between `package.json` and `package-lock.json`. Any mismatch = deployment failure.

---

## 📞 Questions?

- Check Railway build logs: https://railway.app/dashboard
- Review this guide: `.github/PACKAGE_MANAGEMENT.md`
- Run validation: `npm run validate:lockfile`

Last Updated: 2025-11-24
