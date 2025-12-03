#!/bin/bash
# find-chromium.sh
# Finds Chromium binary in Nix store and exports path
# Used by Railway to set PUPPETEER_EXECUTABLE_PATH at runtime

# Try to find Chromium in Nix store
CHROMIUM_PATH=$(find /nix/store -name chromium -type f -executable 2>/dev/null | grep -E '/bin/chromium$' | head -n 1)

if [ -n "$CHROMIUM_PATH" ]; then
  echo "✅ Found Chromium at: $CHROMIUM_PATH"
  export PUPPETEER_EXECUTABLE_PATH="$CHROMIUM_PATH"
  echo "✅ Set PUPPETEER_EXECUTABLE_PATH=$PUPPETEER_EXECUTABLE_PATH"
else
  echo "⚠️  Chromium not found in Nix store, Puppeteer will use default detection"
fi

# Execute the actual start command
exec "$@"
