# UI/UX Improvements Made Since Jan 13, 2026

**Rollback Target:** `cc9c687` (Jan 13, 2026 - "feat: add Employer Safeguarding section to landing page")

This document captures UI/UX improvements made between Jan 13-20, 2026 that should be considered for future versions.

## ✅ KEEP - Already in Separate Files (Won't Be Lost)

### 1. APK Download Page (`public/download-apk.html`)
- Professional download page with gradient styling
- App icon with legal scales emoji (⚖️)
- File info box showing size, build date, version, platform
- Prominent download button with hover effects
- Installation instructions panel
- SHA256 checksum for verification
- **File did NOT exist at `cc9c687` - it's a new addition**

### 2. APK Download Endpoint (`src/routes/index.js`)
- Added `/download/app-release.apk` static route
- Force-download headers for proper APK delivery

---

## ❌ DISCARD - Broken Features (Caused Issues)

### 1. PermissionsService Integration
- `b1377d4` - Changed AI Eavesdropper to use PermissionsService
- `984fb19` - Added microphone permission system (v2.0.5)
- `74e310e` - Sequential permission requests with modal fallback
- **Result:** Broke what3words, dashcam, and eavesdropper functionality
- **Action:** Rolling back to simpler approach without PermissionsService

### 2. Capacitor Camera Plugin Integration
- `b383ce2`, `d4c27f2` - Capacitor Camera plugin on photo pages
- `1eeeee7` - Camera source PROMPT for user choice
- **Status:** May have caused complexity; HTML file inputs work fine

### 3. Permission Modal & Android WebView Fixes
- `2abf078` - Permission modal with "Open App Settings" button
- `efb77ff` - WebChromeClient for getUserMedia bridging
- `3be3051` - Capacitor native permission plugin
- **Status:** Over-engineered; standard Web APIs work better

---

## 🔄 CONSIDER RE-IMPLEMENTING (Good Ideas, Bad Execution)

### 1. Auto-Navigate to AI Analysis Tab
**Commit:** `44d0d63` - "feat: auto-navigate to AI analysis tab after completion"
- After AI analysis completes, automatically switch to the results tab
- Good UX improvement, could be re-added simply

### 2. Microphone Status Feedback
**Commits:** `f5951e5`, `51c9aef`
- Clear error message when microphone fails
- Show success when microphone connects
- Reuse microphone stream to avoid double permission request
- **Re-implement:** Simple status indicators without PermissionsService

### 3. Mobile Download Troubleshooting
**Commit:** `c18cc66`
- Resume capability for interrupted downloads
- Mobile-specific troubleshooting tips
- **Could be useful** for APK download page

---

## 📋 Summary Table

| Feature | Commit | Status | Action |
|---------|--------|--------|--------|
| APK Download Page | `6c296f7`, `eb130d9` | ✅ Working | Keep (separate file) |
| PermissionsService | `984fb19`+ | ❌ Broken | Discard |
| Capacitor Camera | `b383ce2`, `d4c27f2` | ⚠️ Complex | Discard |
| Permission Modal | `2abf078` | ❌ Over-engineered | Discard |
| Auto-navigate AI tab | `44d0d63` | ✅ Good idea | Re-implement later |
| Microphone feedback | `f5951e5` | ✅ Good idea | Re-implement simply |

---

## 🎯 Rollback Strategy

1. **Keep these files as-is (won't rollback):**
   - `public/download-apk.html`
   - `public/download/app-release.apk`
   - `android/` directory (signed APK build config)
   - `capacitor.config.ts`

2. **Rollback these files to `cc9c687`:**
   - `public/incident.html` - Main incident report page
   - Any other files with PermissionsService integration

3. **Verify after rollback:**
   - ✅ what3words location lookup works
   - ✅ Dashcam recording works
   - ✅ AI Eavesdropper works
   - ✅ Voice recording works
   - ✅ Map with "Find Me" works

---

**Document Created:** 2026-01-20
**Purpose:** Preserve good ideas before rollback to stable version
