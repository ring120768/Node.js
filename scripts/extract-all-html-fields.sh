#!/bin/bash

# Extract All HTML Form Fields
# Analyzes all incident form HTML files and extracts field names, types, and attributes

echo "═══════════════════════════════════════════════════════════"
echo "EXTRACTING ALL FORM FIELDS FROM HTML PAGES"
echo "═══════════════════════════════════════════════════════════"
echo ""

OUTPUT_FILE="/tmp/html-fields-extraction.txt"
> "$OUTPUT_FILE"  # Clear file

# Array of HTML files to analyze
HTML_FILES=(
  "public/incident-form-page1.html"
  "public/incident-form-page2.html"
  "public/incident-form-page3.html"
  "public/incident-form-page4.html"
  "public/incident-form-page4a-location-photos.html"
  "public/incident-form-page5-vehicle.html"
  "public/incident-form-page6-vehicle-images.html"
  "public/incident-form-page7-other-vehicle.html"
  "public/incident-form-page8-other-damage-images.html"
  "public/incident-form-page9-witnesses.html"
  "public/incident-form-page10-police-details.html"
  "public/incident-form-page12-final-medical-check.html"
  "public/declaration.html"
  "public/transcription-status.html"
)

for file in "${HTML_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "─────────────────────────────────────────────────────────"
    echo "FILE: $file"
    echo "─────────────────────────────────────────────────────────"
    echo "FILE: $file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    # Extract input fields
    echo "📝 INPUT FIELDS:"
    grep -oE 'name="[^"]*"' "$file" | sort -u | sed 's/name="//g' | sed 's/"//g' | while read -r name; do
      # Get type for this field
      type=$(grep -oE "name=\"$name\"[^>]*type=\"[^\"]*\"" "$file" | grep -oE 'type="[^"]*"' | head -1 | sed 's/type="//g' | sed 's/"//g')
      if [ -z "$type" ]; then
        type="text"  # default
      fi

      # Check if required
      required=$(grep -oE "name=\"$name\"[^>]*required" "$file" | head -1)
      req_flag=""
      if [ -n "$required" ]; then
        req_flag=" [REQUIRED]"
      fi

      echo "  - $name (type: $type)$req_flag"
      echo "  - $name (type: $type)$req_flag" >> "$OUTPUT_FILE"
    done

    # Extract select dropdowns
    echo ""
    echo "📋 SELECT DROPDOWNS:"
    grep -oE 'id="[^"]*"[^>]*<select' "$file" -B 1 | grep 'id=' | grep -oE 'id="[^"]*"' | sed 's/id="//g' | sed 's/"//g' | while read -r id; do
      name=$(grep -A 2 "id=\"$id\"" "$file" | grep -oE 'name="[^"]*"' | sed 's/name="//g' | sed 's/"//g')
      if [ -n "$name" ]; then
        echo "  - $name (id: $id)"
        echo "  - $name (id: $id) [SELECT]" >> "$OUTPUT_FILE"
      fi
    done

    # Extract textareas
    echo ""
    echo "📝 TEXTAREAS:"
    grep -oE '<textarea[^>]*name="[^"]*"' "$file" | grep -oE 'name="[^"]*"' | sed 's/name="//g' | sed 's/"//g' | sort -u | while read -r name; do
      echo "  - $name"
      echo "  - $name [TEXTAREA]" >> "$OUTPUT_FILE"
    done

    echo "" >> "$OUTPUT_FILE"
    echo ""
    echo ""
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "═══════════════════════════════════════════════════════════"
echo "✅ EXTRACTION COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📄 Full output saved to: $OUTPUT_FILE"
echo ""
echo "To view the full report:"
echo "  cat $OUTPUT_FILE"
