#!/bin/bash

# Enable CORS for Replit subdomains
export CORS_ALLOW_REPLIT_SUBDOMAINS=true
export CORS_ALLOW_LOCALHOST=true
export NODE_ENV=development

echo "🚀 Starting server with Replit CORS support enabled"
echo "   CORS_ALLOW_REPLIT_SUBDOMAINS = true"
echo "   CORS_ALLOW_LOCALHOST = true"
echo ""

# Start the server
npm start