# Dashboard Investigation Findings

**Date:** 21 October 2025
**Branch:** feat/audit-prep
**Investigated by:** Claude Code

## Summary

Investigation of dashboard.html based on Cursor testing feedback. Identified several areas for improvement regarding API endpoints, authentication, and video playback functionality.

---

## 1. API Endpoints Status

### ✅ Working Endpoints

| Endpoint | Status | Auth Required | Notes |
|----------|--------|---------------|-------|
| `/api/user-documents` | ✅ EXISTS | Yes | Returns 401 without auth |
| `/api/user-documents/:imageId` | ✅ EXISTS | Yes | Download/delete files |
| `/api/transcription/history` | ✅ EXISTS | Yes | Fetches transcription history |
| `/api/pdf/status/:userId` | ✅ EXISTS | Yes | Check PDF generation status |
| `/api/auth/logout` | ✅ EXISTS | No | Logout endpoint |

### ❌ Missing Endpoints

| Endpoint | Status | Used In | Recommendation |
|----------|--------|---------|----------------|
| `/api/auth/status` | ❌ NOT FOUND | dashboard.html:731 | **NEEDS CREATION** - Auth check endpoint |

### Dashboard API Usage Pattern

```javascript
// Line 731 - Auth status check (MISSING)
const response = await fetch('/api/auth/status');

// Line 786 - Load images (EXISTS)
const response = await fetch(`/api/user-documents?user_id=${currentUser.uid}`);

// Line 825 - Load transcriptions (EXISTS)
const response = await fetch(`/api/transcription/history?user_id=${currentUser.uid}`);

// Line 840 - Check PDF status (EXISTS)
const response = await fetch(`/api/pdf/status/${currentUser.uid}`);
```

---

## 2. Dashboard Features Analysis

### Current State
Dashboard displays **5 sections** with full management capabilities:
- 📸 Images (view, download, delete)
- 📹 Videos (view, download, delete)
- 🎙️ Transcriptions (view, download, delete - deletion shows "coming soon")
- 📄 PDFs (view, download, delete)
- 📊 Reports (view, download)

### Issue: Over-Engineering

**User Context:** Each user should only have **ONE** incident report.

**Current Problem:** Dashboard is built for multi-report scenario with:
- Grid layouts for multiple items
- Delete functionality for all file types
- Complex state management
- Separate sections for each file type

### Recommendation: Simplify

**Proposed Simplified Design:**

```
┌─────────────────────────────────────────┐
│     YOUR INCIDENT REPORT                │
│                                         │
│  Status: [Complete/Pending]             │
│  Created: 15/10/2025                    │
│                                         │
│  📸 Photos: 4 files                     │
│  📹 Video: dashcam.mp4                  │
│  🎙️ Audio: statement.mp3 (transcribed) │
│  📄 PDF Report: Ready                   │
│                                         │
│  [View Full Report] [Download PDF]      │
└─────────────────────────────────────────┘
```

**Benefits:**
- ✅ Single card view instead of 5 separate sections
- ✅ Remove unnecessary delete buttons
- ✅ Simplified UX - just view and download
- ✅ Faster loading (single API call instead of 4)
- ✅ More appropriate for UK legal use case

---

## 3. Authentication Implementation

### Current Implementation (Line 743)

```javascript
const storedUser = sessionStorage.getItem('currentUser');
if (!storedUser) {
    // Fallback to /api/auth/status (which doesn't exist!)
    const response = await fetch('/api/auth/status');
}
```

### Issues

1. **❌ Primary auth uses `sessionStorage`**
   - Not secure for sensitive data
   - Lost on browser/tab close
   - No server-side validation

2. **❌ Fallback endpoint doesn't exist**
   - `/api/auth/status` returns 404
   - Creates error in console
   - Auth fails silently

3. **❌ No proper session management**
   - No CSRF protection
   - No token refresh
   - No expiry handling

### Recommendation

**Option 1: Cookie-Based Auth (Recommended for UK/GDPR)**

```javascript
// Backend: Set HTTP-only cookie on login
res.cookie('session_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
});

// Frontend: Auto-included in all requests
const response = await fetch('/api/user-documents', {
    credentials: 'include' // Include cookies
});
```

**Option 2: JWT in HTTP-only Cookie**

```javascript
// More flexible, supports API access
const token = jwt.sign(
    { userId, email },
    SECRET,
    { expiresIn: '30d' }
);

res.cookie('auth_token', token, { httpOnly: true, secure: true });
```

**Required Changes:**
1. ✅ Create `/api/auth/status` endpoint
2. ✅ Replace `sessionStorage` with cookies
3. ✅ Add CSRF protection
4. ✅ Add token refresh logic
5. ✅ Add proper expiry handling

---

## 4. Video Player Implementation

### Current Implementation (Lines 1027-1062)

```javascript
<div class="item-card">
  <div class="item-preview">
    <span>📹</span>  <!-- Just an emoji icon! -->
  </div>
  <div class="item-actions">
    <button onclick='downloadFile("${video.public_url}", "video.mp4")'>
      Download
    </button>
  </div>
</div>
```

### Issue

**No actual video player!** Users must:
1. Click download button
2. Wait for file to download
3. Open in separate app
4. Navigate back to dashboard

**This is poor UX** - especially on mobile devices.

### Recommendation: Native HTML5 Video

```html
<div class="item-card video-card">
  <div class="video-container">
    <video controls playsinline preload="metadata">
      <source src="${video.public_url}" type="video/mp4">
      Your browser doesn't support video playback.
    </video>
  </div>
  <div class="video-info">
    <div class="video-title">${formatDocumentType(video.document_type)}</div>
    <div class="video-meta">
      <span>📅 ${formatDate(video.created_at)}</span>
      <span>📊 ${video.status}</span>
    </div>
    <div class="video-actions">
      <button class="btn-download" onclick='downloadFile("${video.public_url}", "${video.document_type}.mp4")'>
        <span>⬇️</span> Download
      </button>
    </div>
  </div>
</div>
```

**Benefits:**
- ✅ **Mobile-friendly:** Uses device's native video player
- ✅ **Instant playback:** No download required
- ✅ **Better UX:** Play/pause/scrub timeline
- ✅ **Bandwidth efficient:** `preload="metadata"` loads poster only
- ✅ **iOS compatible:** `playsinline` prevents fullscreen takeover

**CSS Additions:**

```css
.video-container {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.video-container video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
```

---

## Priority Recommendations

### 🔴 Critical (Blocking Auth)
1. **Create `/api/auth/status` endpoint**
   - Returns user session state
   - Used by dashboard for auth check

### 🟠 High Priority (Security)
2. **Replace sessionStorage with HTTP-only cookies**
   - More secure
   - GDPR compliant
   - Proper session management

### 🟡 Medium Priority (UX)
3. **Add HTML5 video player**
   - Better mobile experience
   - Instant playback
   - Native controls

4. **Simplify dashboard for single-report use case**
   - Remove unnecessary features
   - Faster loading
   - Clearer UX

---

## Implementation Order

### Phase 1: Fix Auth (Week 1)
- [ ] Create `/api/auth/status` endpoint
- [ ] Implement cookie-based auth
- [ ] Add CSRF protection
- [ ] Test auth flow

### Phase 2: Improve Video (Week 2)
- [ ] Add HTML5 `<video>` elements
- [ ] Test on iOS/Android
- [ ] Add loading states
- [ ] Test bandwidth usage

### Phase 3: Simplify Dashboard (Week 3)
- [ ] Design single-report card layout
- [ ] Combine API calls
- [ ] Remove delete buttons
- [ ] Update documentation

---

## Testing Checklist

- [ ] `/api/auth/status` returns correct session state
- [ ] Dashboard loads with cookie auth (no sessionStorage)
- [ ] Video plays in-browser on mobile devices
- [ ] Simplified dashboard shows all file types
- [ ] PDF download works
- [ ] Logout clears cookies
- [ ] CSRF protection working

---

## Notes

- All API endpoints except `/api/auth/status` are working correctly
- Dashboard is over-engineered for single-report use case
- Video playback should use HTML5 native player
- Authentication needs proper cookie implementation

**Last Updated:** 21 October 2025 14:15 GMT
**Status:** Investigation Complete ✅
