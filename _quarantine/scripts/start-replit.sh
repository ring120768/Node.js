#!/bin/bash

# Replit-specific startup script for Car Crash Lawyer AI
# This ensures CORS is properly configured for Replit domains

echo "🚀 Starting Car Crash Lawyer AI on Replit..."
echo ""
echo "📋 Environment Configuration:"
echo "================================"

# Set CORS environment variables
export CORS_ALLOW_REPLIT_SUBDOMAINS=true
export CORS_ALLOW_LOCALHOST=true
export NODE_ENV=${NODE_ENV:-development}

# Display configuration
echo "✅ CORS_ALLOW_REPLIT_SUBDOMAINS = $CORS_ALLOW_REPLIT_SUBDOMAINS"
echo "✅ CORS_ALLOW_LOCALHOST = $CORS_ALLOW_LOCALHOST"
echo "✅ NODE_ENV = $NODE_ENV"

# Check if running on Replit
if [ -n "$REPL_ID" ]; then
  echo "✅ Running on Replit (ID: $REPL_ID)"
  echo "✅ Replit URL: https://${REPL_SLUG}.${REPL_OWNER}.repl.co"
else
  echo "ℹ️  Not running on Replit (local environment)"
fi

echo ""
echo "📦 Installing dependencies..."
# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  npm install --production
else
  echo "✅ Dependencies already installed"
fi

echo ""
echo "🔍 Checking Supabase configuration..."
# Check for required environment variables
if [ -z "$SUPABASE_URL" ]; then
  echo "⚠️  Warning: SUPABASE_URL not set"
else
  echo "✅ SUPABASE_URL configured"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY not set"
else
  echo "✅ SUPABASE_SERVICE_ROLE_KEY configured"
fi

if [ -z "$TYPEFORM_WEBHOOK_SECRET" ]; then
  echo "⚠️  Warning: TYPEFORM_WEBHOOK_SECRET not set"
else
  echo "✅ TYPEFORM_WEBHOOK_SECRET configured"
fi

echo ""
echo "🖼️  Image Display Configuration:"
echo "================================"
echo "✅ CORS enabled for Replit subdomains"
echo "✅ Backend proxy endpoint available at /api/images/:id"
echo "✅ Direct API endpoint at /api/user-documents"
echo ""
echo "📝 Test Pages Available:"
echo "  • /replit-test.html - Comprehensive Replit test"
echo "  • /dashboard.html - Main dashboard"
echo "  • /dashboard-proxy.html - Dashboard with proxy (most reliable)"
echo "  • /test-image-direct.html - Direct API test"
echo ""
echo "🔧 Troubleshooting Commands:"
echo "  • node test-dashboard-images.js - Test dashboard images"
echo "  • bash diagnose-images.sh - Full diagnostic"
echo "  • node test-cors-pattern.js - Test CORS patterns"
echo ""
echo "================================"
echo ""

# Start the server
echo "🚀 Starting Node.js server on port ${PORT:-5000}..."
npm start