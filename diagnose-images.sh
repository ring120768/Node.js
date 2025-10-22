#!/bin/bash

echo "🔍 COMPREHENSIVE IMAGE DISPLAY DIAGNOSTIC"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "1. Checking server status..."
if curl -s http://localhost:5001/healthz > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running on port 5001${NC}"
else
    echo -e "${RED}❌ Server is NOT running${NC}"
    echo "   Run: npm start"
    exit 1
fi

echo ""
echo "2. Testing API endpoint..."
RESPONSE=$(curl -s "http://localhost:5001/api/user-documents?user_id=199d9251-b2e0-40a5-80bf-fc1529d9bf6c&document_type=image")

if [ $? -eq 0 ]; then
    IMAGE_COUNT=$(echo "$RESPONSE" | grep -o '"document_type"' | wc -l | tr -d ' ')
    echo -e "${GREEN}✅ API returned ${IMAGE_COUNT} images${NC}"

    # Extract first public_url
    FIRST_URL=$(echo "$RESPONSE" | grep -o '"public_url":"[^"]*' | head -1 | cut -d'"' -f4)

    if [ ! -z "$FIRST_URL" ]; then
        echo ""
        echo "3. Testing first image URL..."

        # Test if URL is accessible
        HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$FIRST_URL")

        if [ "$HTTP_STATUS" = "200" ]; then
            echo -e "${GREEN}✅ Image URL is accessible (HTTP $HTTP_STATUS)${NC}"
        else
            echo -e "${RED}❌ Image URL returned HTTP $HTTP_STATUS${NC}"
        fi
    else
        echo -e "${RED}❌ No public_url found in response${NC}"
    fi
else
    echo -e "${RED}❌ API request failed${NC}"
fi

echo ""
echo "4. Testing proxy endpoint..."
PROXY_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "http://localhost:5001/api/images/0d6a2736-0413-4e03-aee7-6c685bf66956")

if [ "$PROXY_STATUS" = "200" ]; then
    echo -e "${GREEN}✅ Proxy endpoint works (HTTP $PROXY_STATUS)${NC}"
else
    echo -e "${YELLOW}⚠️ Proxy endpoint returned HTTP $PROXY_STATUS${NC}"
fi

echo ""
echo "========================================"
echo "📌 TEST PAGES AVAILABLE:"
echo ""
echo "Please open these URLs in your browser:"
echo ""
echo "1. ${GREEN}Simple Image Test:${NC}"
echo "   http://localhost:5001/test-single-image.html"
echo "   - Tests a hardcoded signed URL directly"
echo ""
echo "2. ${GREEN}Comprehensive Test:${NC}"
echo "   http://localhost:5001/test-image-direct.html"
echo "   - Tests API integration and displays all images"
echo ""
echo "3. ${GREEN}Original Dashboard:${NC}"
echo "   http://localhost:5001/dashboard.html"
echo "   - Your original dashboard with fixes applied"
echo ""
echo "4. ${GREEN}Proxy Dashboard:${NC}"
echo "   http://localhost:5001/dashboard-proxy.html"
echo "   - Uses backend proxy (most reliable)"
echo ""
echo "========================================"
echo "🔧 TROUBLESHOOTING:"
echo ""
echo "If images don't display in browser but tests pass:"
echo "1. Check browser console (F12) for errors"
echo "2. Check for CORS errors"
echo "3. Try disabling browser extensions"
echo "4. Try incognito/private mode"
echo "5. Try a different browser"
echo ""
echo "If proxy dashboard works but others don't:"
echo "- This indicates a CORS or authentication issue"
echo "- Use the proxy dashboard as the solution"
echo ""
echo "========================================"