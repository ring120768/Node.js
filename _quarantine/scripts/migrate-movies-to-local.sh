#!/bin/bash

# DaVinci Resolve Migration Script
# Safely moves Movies folder from Dropbox to local storage

DROPBOX_MOVIES="/Users/ianring/Ian.ring Dropbox/Ian Ring/Movies"
LOCAL_MOVIES="/Users/ianring/Movies"
BACKUP_DIR="/Users/ianring/Movies-Dropbox-Backup-$(date +%Y%m%d-%H%M%S)"

echo "🎬 DaVinci Resolve Migration to Local Storage"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if source exists
if [ ! -d "$DROPBOX_MOVIES" ]; then
  echo "❌ Error: Dropbox Movies folder not found"
  echo "   Looking for: $DROPBOX_MOVIES"
  exit 1
fi

# Step 1: Analyze what we're moving
echo "📊 Step 1: Analyzing folders to migrate..."
echo ""

TOTAL_SIZE=$(du -sh "$DROPBOX_MOVIES"* 2>/dev/null | awk '{sum+=$1} END {print sum}')
CONFLICT_COUNT=$(ls -d "$DROPBOX_MOVIES"* 2>/dev/null | wc -l | tr -d ' ')

echo "   Dropbox location: Ian.ring Dropbox/Ian Ring/"
echo "   Folders to migrate: $CONFLICT_COUNT"
echo "   Total size: Calculating..."

# Calculate total size properly
TOTAL_KB=0
while IFS= read -r folder; do
  SIZE=$(du -sk "$folder" 2>/dev/null | cut -f1)
  TOTAL_KB=$((TOTAL_KB + SIZE))
done < <(ls -d "$DROPBOX_MOVIES"* 2>/dev/null)

TOTAL_MB=$((TOTAL_KB / 1024))
echo "   Total size: ${TOTAL_MB}MB"
echo ""

# Step 2: List what will be moved
echo "📋 Step 2: Folders to migrate:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

COUNTER=1
while IFS= read -r folder; do
  BASENAME=$(basename "$folder")
  SIZE=$(du -sh "$folder" 2>/dev/null | cut -f1)
  echo "   $COUNTER. $BASENAME ($SIZE)"
  ((COUNTER++))
done < <(ls -d "$DROPBOX_MOVIES"* 2>/dev/null | sort)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 3: Show migration plan
echo "📦 Step 3: Migration Plan"
echo ""
echo "   FROM: $DROPBOX_MOVIES"
echo "   TO:   $LOCAL_MOVIES/DaVinci Resolve/"
echo "   BACKUP: $BACKUP_DIR"
echo ""
echo "   Strategy:"
echo "   1. Create backup of Dropbox Movies folder"
echo "   2. Merge conflict folders into local DaVinci Resolve"
echo "   3. Preserve all project files and cache"
echo "   4. Original Dropbox folders remain until confirmed"
echo ""

# Ask for confirmation
read -p "⚠️  Proceed with migration? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo ""
  echo "❌ Migration cancelled. No changes made."
  exit 0
fi

echo ""
echo "🚀 Starting migration..."
echo ""

# Step 4: Create backup
echo "💾 Step 4: Creating backup..."
mkdir -p "$BACKUP_DIR"
cp -R "$DROPBOX_MOVIES"* "$BACKUP_DIR/" 2>/dev/null
echo "   ✓ Backup created: $(basename "$BACKUP_DIR")"
echo ""

# Step 5: Create DaVinci Resolve Archive folder in local
ARCHIVE_DIR="$LOCAL_MOVIES/DaVinci Resolve/Dropbox Archive $(date +%Y-%m-%d)"
mkdir -p "$ARCHIVE_DIR"
echo "📂 Step 5: Created archive folder"
echo "   Location: Movies/DaVinci Resolve/Dropbox Archive $(date +%Y-%m-%d)/"
echo ""

# Step 6: Migrate each conflict folder
echo "🔄 Step 6: Migrating conflict folders..."
echo ""

MIGRATED=0
FAILED=0

while IFS= read -r folder; do
  BASENAME=$(basename "$folder")

  # Extract conflict number for better naming
  if [[ "$BASENAME" =~ "conflicts 2025-12-04 "([0-9]+) ]]; then
    CONFLICT_NUM="${BASH_REMATCH[1]}"
    NEW_NAME="Conflict-$CONFLICT_NUM-$(date +%Y%m%d)"
  else
    NEW_NAME="Conflict-$(date +%Y%m%d-%H%M%S)"
  fi

  # Copy to archive
  if cp -R "$folder" "$ARCHIVE_DIR/$NEW_NAME" 2>/dev/null; then
    SIZE=$(du -sh "$folder" 2>/dev/null | cut -f1)
    echo "   ✓ Migrated: $BASENAME → $NEW_NAME ($SIZE)"
    ((MIGRATED++))
  else
    echo "   ✗ Failed: $BASENAME"
    ((FAILED++))
  fi
done < <(ls -d "$DROPBOX_MOVIES"* 2>/dev/null)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 7: Summary
echo "✅ Migration Complete!"
echo ""
echo "📊 Summary:"
echo "   Migrated: $MIGRATED folders"
echo "   Failed: $FAILED folders"
echo "   Backup: $(basename "$BACKUP_DIR")"
echo ""
echo "📂 New Location:"
echo "   ~/Movies/DaVinci Resolve/Dropbox Archive $(date +%Y-%m-%d)/"
echo ""
echo "🗑️  Next Steps:"
echo "   1. ✓ Your files are now in local storage (faster access!)"
echo "   2. ✓ Backup created in: $(basename "$BACKUP_DIR")"
echo "   3. ⚠️  Original Dropbox folders still exist"
echo ""
echo "   To remove from Dropbox after verifying:"
echo "   rm -rf \"$DROPBOX_MOVIES\"*"
echo ""
echo "   To restore from backup if needed:"
echo "   cp -R \"$BACKUP_DIR\"/* \"$DROPBOX_MOVIES\""
echo ""
echo "💡 Tip: Restart Dropbox to stop syncing the old folder:"
echo "   - Quit Dropbox"
echo "   - Relaunch Dropbox"
echo "   - Verify sync is clean"
echo ""
