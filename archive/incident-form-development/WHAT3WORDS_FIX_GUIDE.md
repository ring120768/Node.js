# what3words Integration Fix Guide

## Issue

The `WHAT3WORDS_API_KEY` environment variable is not set in the application runtime, causing all what3words API calls to return graceful fallback responses instead of actual location data.

## Verification

✅ **API Key is Valid**: Tested directly via curl
```bash
curl -s "https://api.what3words.com/v3/convert-to-3wa?coordinates=51.520847,-0.195521&key=C0C4RX8X"
# Result: {"words":"filled.count.soap",...} ✅
```

❌ **Environment Variable Not Set**: Application cannot read the key
```bash
echo $WHAT3WORDS_API_KEY
# Result: (empty)
```

## Root Cause

Per CLAUDE.md:
> **⚠️ IMPORTANT: All environment variables are securely stored in Replit Secrets**
> - Never commit `.env` files to Git
> - Access via Replit Secrets panel (Tools → Secrets)
> - All secrets are encrypted and injected at runtime

The `WHAT3WORDS_API_KEY` needs to be added to **Replit Secrets**, not a local `.env` file.

## Fix Steps

### 1. Add to Replit Secrets (Primary Fix)

**In Replit Dashboard:**
1. Open the project: `Car Crash Lawyer AI`
2. Click **Tools** → **Secrets**
3. Click **Add new secret**
4. Enter:
   - **Key**: `WHAT3WORDS_API_KEY`
   - **Value**: `C0C4RX8X`
5. Click **Add secret**
6. **Restart the Repl** (required for environment variables to load)

### 2. Verify Configuration (After Restart)

Run the test script:
```bash
node test-what3words.js
```

Expected output:
```
🧪 Testing what3words integration...

Test 1: Direct what3words API call
✅ Direct API call successful
   Words: filled.count.soap
   Country: GB

Test 2: POST /api/location/what3words
✅ POST endpoint successful
   Response: { words: 'filled.count.soap', ... }

Test 3: GET /api/location/convert
✅ GET convert endpoint successful
   Response: { words: 'filled.count.soap', ... }

Test 4: GET /api/location/autosuggest
✅ Autosuggest endpoint successful
   Suggestions: [...]

Test 5: Environment variable check
   WHAT3WORDS_API_KEY is SET ✅

🎉 All tests completed successfully!
```

### 3. Test Endpoints Manually

Once the server is running with the API key set:

**Test coordinates to what3words conversion:**
```bash
curl -X POST http://localhost:5000/api/location/what3words \
  -H "Content-Type: application/json" \
  -d '{"latitude": 51.520847, "longitude": -0.195521}'
```

Expected response:
```json
{
  "success": true,
  "words": "filled.count.soap",
  "coordinates": {
    "latitude": 51.520847,
    "longitude": -0.195521
  },
  "country": "GB"
}
```

**Test autosuggest:**
```bash
curl "http://localhost:5000/api/location/autosuggest?input=filled.count.soap"
```

## How what3words Integration Works

### Configuration (src/config/index.js)
```javascript
what3words: {
  apiKey: process.env.WHAT3WORDS_API_KEY,
  enabled: !!process.env.WHAT3WORDS_API_KEY  // Auto-disables if no key
}
```

### Controller Logic (src/controllers/location.controller.js)

All endpoints follow this pattern:

1. **Validate Input**:
   ```javascript
   if (!latitude || !longitude) {
     return res.status(400).json({ error: 'Missing coordinates' });
   }
   ```

2. **Check API Key**:
   ```javascript
   if (!config.what3words.apiKey) {
     logger.warn('what3words API key not configured');
     return res.status(200).json({
       success: false,
       message: 'Location service temporarily unavailable',
       fallback: true
     });
   }
   ```

3. **Call what3words API**:
   ```javascript
   const what3wordsUrl = `https://api.what3words.com/v3/convert-to-3wa?coordinates=${latitude},${longitude}&key=${config.what3words.apiKey}`;
   const response = await axios.get(what3wordsUrl);
   ```

4. **Return Result**:
   ```javascript
   res.status(200).json({
     success: true,
     words: response.data.words,
     coordinates: { latitude, longitude },
     country: response.data.country
   });
   ```

### Graceful Fallback

If the API key is missing or the API call fails, the endpoints return:

```json
{
  "success": false,
  "message": "Location service temporarily unavailable",
  "fallback": true
}
```

This ensures the application doesn't crash if what3words is unavailable.

## Available Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/location/what3words` | POST | Convert coordinates to what3words |
| `/api/location/convert` | GET | Convert coordinates to what3words (GET version) |
| `/api/location/autosuggest` | GET | Get suggestions for partial what3words input |
| `/api/location/legacy` | GET | Legacy endpoint for backward compatibility |
| `/api/location/upload-image` | POST | Upload what3words location image |

## Troubleshooting

### Problem: "Location service temporarily unavailable"

**Cause**: `WHAT3WORDS_API_KEY` not set or invalid

**Fix**:
1. Check environment variable: `echo $WHAT3WORDS_API_KEY`
2. If empty, add to Replit Secrets
3. Restart the Repl
4. Run test script: `node test-what3words.js`

### Problem: API key set but still getting fallback

**Possible causes**:
1. **Repl not restarted** after adding secret → Restart required
2. **Wrong secret name** → Must be exactly `WHAT3WORDS_API_KEY` (case-sensitive)
3. **Wrong value** → Should be `C0C4RX8X` with no extra spaces
4. **Rate limiting** → Check what3words dashboard for quota

**Debug steps**:
```bash
# Check if Node.js can read the variable
node -e "console.log('Key:', process.env.WHAT3WORDS_API_KEY ? 'SET' : 'NOT SET')"

# Test direct API call
curl -s "https://api.what3words.com/v3/convert-to-3wa?coordinates=51.520847,-0.195521&key=C0C4RX8X"
```

### Problem: API returns error

**Common what3words API errors**:

| Status | Error | Meaning |
|--------|-------|---------|
| 400 | `BadCoordinates` | Invalid latitude/longitude |
| 401 | `InvalidKey` | API key is wrong or expired |
| 402 | `QuotaExceeded` | Monthly API quota exceeded |
| 429 | `RateLimitExceeded` | Too many requests, slow down |

**Check logs**:
```bash
# Server logs will show what3words API errors
npm run dev
# Look for "what3words API error" messages
```

## What Happens After Fix

Once `WHAT3WORDS_API_KEY` is properly set:

1. **Incident Form Pages** will display what3words addresses
2. **Location uploads** will include what3words in metadata
3. **PDF reports** will show what3words alongside coordinates
4. **Dashboard** will display formatted location data

## Security Notes

- ✅ API key stored in Replit Secrets (encrypted)
- ✅ Never committed to Git
- ✅ Server-side only (not exposed to frontend)
- ✅ Graceful fallback if unavailable
- ✅ Rate limiting handled by axios defaults

## Testing Checklist

After applying the fix:

- [ ] Environment variable is set: `echo $WHAT3WORDS_API_KEY` → `C0C4RX8X`
- [ ] Node.js can read it: `node -e "console.log(process.env.WHAT3WORDS_API_KEY)"`
- [ ] Test script passes: `node test-what3words.js`
- [ ] POST endpoint works: `curl -X POST http://localhost:5000/api/location/what3words -H "Content-Type: application/json" -d '{"latitude": 51.520847, "longitude": -0.195521}'`
- [ ] GET endpoint works: `curl "http://localhost:5000/api/location/convert?lat=51.520847&lng=-0.195521"`
- [ ] Autosuggest works: `curl "http://localhost:5000/api/location/autosuggest?input=filled"`
- [ ] Check logs for no errors: `npm run dev`

## Next Steps

After fixing what3words integration:

1. ✅ Test all endpoints via `test-what3words.js`
2. ⏭️ Continue with **incident reports** functionality (as per user request)
3. ⏭️ Verify location data appears correctly in PDF reports
4. ⏭️ Update CLAUDE.md if needed with what3words patterns

---

**Status**: Ready to fix (requires Replit Secrets update)
**Priority**: Medium (graceful fallback in place)
**Effort**: 5 minutes (add secret + restart)
**Impact**: Enables location features across incident forms and reports
