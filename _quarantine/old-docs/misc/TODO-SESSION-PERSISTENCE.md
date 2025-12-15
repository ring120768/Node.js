# TODO: Session Persistence Issue

**Priority:** Medium (UX improvement, not critical)
**Status:** In Progress - Partially Fixed
**Created:** 2025-10-21

## Problem Description

Users experience session loss when navigating between pages, requiring them to log in again. This creates a poor UX but doesn't prevent app usage.

**User Journey Where Issue Occurs:**
```
index.html → login → incident.html → index.html → dashboard.html → incident.html
                                                    ↑
                                              Redirects to login
```

## What's Been Fixed

✅ **Cookie Settings Consistency** (Committed: be96b80)
- Fixed authMiddleware.js to use consistent cookie settings
- All cookies now use: `sameSite: 'none'`, `secure: true`
- Test script created: `test-session-persistence.js` (all tests pass)

✅ **Frontend Credentials** (Committed: a8da7d2)
- Added `credentials: 'include'` to all dashboard.html fetch calls
- Ensures cookies are sent with API requests

## What's Still Not Working

The session still loops - user gets redirected to login when navigating between pages.

## Potential Remaining Issues

1. **CORS Configuration**
   - May need to explicitly allow credentials in CORS middleware
   - Check `Access-Control-Allow-Credentials: true` header

2. **Cookie Domain/Path**
   - May need explicit domain/path settings for Replit subdomains
   - Current: default domain/path (implicit)
   - Try: explicit `domain` and `path: '/'` in cookie options

3. **Session Refresh Timing**
   - Refresh token might not be working correctly
   - Check if `refreshSession()` is actually being called

4. **Browser Cookie Restrictions**
   - Some browsers (Safari) have strict third-party cookie blocking
   - May need to test in different browsers

## Next Steps (When Prioritized)

1. **Add debug logging** to see exactly when/why session is lost
   ```javascript
   // Add to authMiddleware.js
   logger.info('Cookie check:', {
     hasAccessToken: !!accessToken,
     hasRefreshToken: !!refreshToken,
     cookies: req.cookies
   });
   ```

2. **Check CORS middleware** in app.js
   ```javascript
   // Ensure this is set:
   credentials: true
   ```

3. **Test in different browsers**
   - Chrome (should work)
   - Safari (may have issues)
   - Firefox (should work)

4. **Add explicit cookie settings**
   ```javascript
   res.cookie('access_token', token, {
     httpOnly: true,
     secure: true,
     sameSite: 'none',
     domain: '.replit.app', // Try explicit domain
     path: '/',
     maxAge: cookieMaxAge
   });
   ```

## Files Modified

- `src/middleware/authMiddleware.js` - Cookie settings fixed
- `public/dashboard.html` - Added credentials to fetch calls
- `test-session-persistence.js` - Verification test (passes)

## Impact

**User Impact:** Moderate annoyance, requires re-login when navigating
**Business Impact:** Low - doesn't prevent core functionality
**Technical Debt:** Medium - should be fixed for better UX

## Workaround

Users can still use the app, they just need to log in again when navigating between certain pages.

---

**Last Updated:** 2025-10-21
**Assigned To:** Future sprint
**Estimated Effort:** 2-3 hours debugging + testing
