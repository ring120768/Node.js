#!/bin/bash

# Dropbox Conflict Cleanup Script
# SAFELY removes empty "view-only conflicts" folders from Dropbox

DROPBOX_DIR="/Users/ianring/Ian.ring Dropbox/Ian Ring"

echo "🔍 Scanning for empty conflict folders in:"
echo "   $DROPBOX_DIR"
echo ""

# Count total conflicts
TOTAL=$(find "$DROPBOX_DIR" -name "*view-only conflicts*" -type d | wc -l | tr -d ' ')
echo "📊 Found $TOTAL conflict folders"
echo ""

# Preview what will be deleted (dry run)
echo "📋 DRY RUN - These folders would be deleted:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

EMPTY_COUNT=0
while IFS= read -r folder; do
  # Check if folder is empty or only contains .gallery
  CONTENT_SIZE=$(du -sk "$folder" 2>/dev/null | cut -f1)

  if [ "$CONTENT_SIZE" -le 4 ]; then
    echo "✓ $(basename "$folder") (${CONTENT_SIZE}KB)"
    ((EMPTY_COUNT++))
  fi
done < <(find "$DROPBOX_DIR" -name "*view-only conflicts*" -type d)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "   Total conflict folders: $TOTAL"
echo "   Empty/Safe to delete: $EMPTY_COUNT"
echo ""

# Ask for confirmation
read -p "⚠️  DELETE these $EMPTY_COUNT empty folders? (yes/no): " CONFIRM

if [ "$CONFIRM" = "yes" ]; then
  echo ""
  echo "🗑️  Deleting empty conflict folders..."

  DELETED=0
  while IFS= read -r folder; do
    CONTENT_SIZE=$(du -sk "$folder" 2>/dev/null | cut -f1)

    if [ "$CONTENT_SIZE" -le 4 ]; then
      rm -rf "$folder"
      ((DELETED++))
      echo "  ✓ Deleted: $(basename "$folder")"
    fi
  done < <(find "$DROPBOX_DIR" -name "*view-only conflicts*" -type d)

  echo ""
  echo "✅ Cleanup complete! Deleted $DELETED folders"
  echo ""
  echo "💡 Tip: Restart Dropbox to prevent new conflicts:"
  echo "   1. Quit Dropbox (menu bar icon > Quit)"
  echo "   2. Relaunch Dropbox"
  echo "   3. Let it fully sync"
else
  echo ""
  echo "❌ Cleanup cancelled. No changes made."
fi
