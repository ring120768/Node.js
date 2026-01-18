#!/bin/bash
# Remove APK from git history to shrink repository from 346MB to ~50MB
# This script uses git-filter-repo (more reliable than filter-branch)

set -e

echo "🧹 Git Repository Cleanup - Remove APK from History"
echo "====================================================="
echo ""
echo "Current repo size:"
du -sh .git

echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  You will need to force push after this."
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Aborted"
  exit 1
fi

# Check if git-filter-repo is installed
if ! command -v git-filter-repo &> /dev/null; then
  echo "📦 Installing git-filter-repo..."
  brew install git-filter-repo || {
    echo "❌ Failed to install git-filter-repo"
    echo "   Install manually: brew install git-filter-repo"
    exit 1
  }
fi

# Create backup branch
echo "💾 Creating backup branch..."
git branch backup-before-cleanup 2>/dev/null || echo "   Backup branch already exists"

# Remove APK from all history
echo "🗑️  Removing APK from git history..."
git-filter-repo --path public/CarCrashLawyerAI.apk --invert-paths --force

# Restore .gitignore to ignore APKs
echo "📝 Restoring .gitignore..."
git checkout HEAD -- .gitignore 2>/dev/null || true

# Show new size
echo ""
echo "✅ Cleanup complete!"
echo ""
echo "New repo size:"
du -sh .git

echo ""
echo "📊 Size reduction:"
echo "   Before: 346MB"
echo "   After:  $(du -sh .git | awk '{print $1}')"

echo ""
echo "🔄 Next steps:"
echo "   1. Review changes: git log --oneline"
echo "   2. Force push: git push origin main --force"
echo "   3. Update Railway deployment"
echo ""
echo "⚠️  Note: Collaborators will need to re-clone the repo"
