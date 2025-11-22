# CSP-Compliant Event Handling Migration Guide

**Date:** 2025-10-28
**Version:** 1.0.0
**Purpose:** Migrate dashboard from inline event handlers to CSP-compliant data attributes

## Overview

This guide documents the migration from inline event handlers (`onclick="..."`) to CSP-compliant event delegation using data attributes. This change is required to comply with Content Security Policy (CSP) directive `script-src-attr 'none'`.

## Problem

Current dashboard uses 50+ inline event handlers that violate CSP:

```html
<!-- ❌ VIOLATES CSP -->
<button onclick="showSection('images')">View Images</button>
<button onclick="handleLogout()">Logout</button>
<div class="dashboard-card" onclick="showSection('reports')">...</div>
```

**Error:**
```
Refused to execute inline event handler because it violates the following
Content Security Policy directive: "script-src-attr 'none'"
```

## Solution

Use event delegation with data attributes:

```html
<!-- ✅ CSP COMPLIANT -->
<button data-action="show-section" data-section="images">View Images</button>
<button data-action="logout">Logout</button>
<div class="dashboard-card" data-action="show-section" data-section="reports">...</div>
```

## Implementation

### 1. Include Event System

Add the event delegation script to `dashboard.html`:

```html
<!-- Before closing </body> tag -->
<script src="/js/dashboard-events.js"></script>
<script src="existing-dashboard-script.js"></script>
```

**Order matters:** Load `dashboard-events.js` first to set up delegation, then load page-specific logic.

### 2. Migration Patterns

#### Navigation Actions

**Before (inline):**
```html
<button onclick="showSection('landing')">Back to Dashboard</button>
<a href="#" onclick="showSection('landing')">Dashboard</a>
<div class="dashboard-card" onclick="showSection('images')">...</div>
```

**After (data attributes):**
```html
<button data-action="show-section" data-section="landing">Back to Dashboard</button>
<a href="#" data-action="show-section" data-section="landing">Dashboard</a>
<div class="dashboard-card" data-action="show-section" data-section="images">...</div>
```

#### Modal Actions

**Before:**
```html
<button class="modal-close" onclick="closeModal()">&times;</button>
<button onclick="closeEditModal()">Cancel</button>
<button onclick="saveDocumentEdit()">Save Changes</button>
```

**After:**
```html
<button class="modal-close" data-action="close-image-modal">&times;</button>
<button data-action="close-edit-modal">Cancel</button>
<button data-action="save-document-edit">Save Changes</button>
```

#### Image Actions

**Before:**
```html
<button onclick='viewImage(${JSON.stringify(image)})'>View</button>
<button onclick="downloadImage('${url}', '${filename}')">Download</button>
<button onclick="deleteImage('${id}')">Delete</button>
```

**After:**
```html
<button data-action="view-image" data-index="${index}">View</button>
<button data-action="download-image" data-url="${url}" data-filename="${filename}">Download</button>
<button data-action="delete-image" data-id="${id}">Delete</button>
```

**Key changes:**
- Pass image **index** instead of entire object (safer, avoids JSON.stringify issues)
- Image data retrieved from `DashboardState.data.images[index]`
- All data passed via `data-*` attributes

#### File Actions

**Before:**
```html
<button onclick='downloadFile("${url}", "${filename}")'>Download</button>
<button onclick='confirmDeleteFile("${id}", "video")'>Delete</button>
```

**After:**
```html
<button data-action="download-file" data-url="${url}" data-filename="${filename}">Download</button>
<button data-action="delete-file" data-id="${id}" data-type="video">Delete</button>
```

#### Logout

**Before:**
```html
<button onclick="handleLogout()">Logout</button>
```

**After:**
```html
<button data-action="logout">Logout</button>
```

### 3. Complete Replacement List

| Old Handler | New Data Attribute | Additional Data |
|-------------|-------------------|-----------------|
| `onclick="showSection('images')"` | `data-action="show-section"` | `data-section="images"` |
| `onclick="handleLogout()"` | `data-action="logout"` | - |
| `onclick="closeModal()"` | `data-action="close-image-modal"` | - |
| `onclick="closeEditModal()"` | `data-action="close-edit-modal"` | - |
| `onclick="viewImage(img)"` | `data-action="view-image"` | `data-index="0"` |
| `onclick="downloadImage(url, name)"` | `data-action="download-image"` | `data-url="..." data-filename="..."` |
| `onclick="deleteImage(id)"` | `data-action="delete-image"` | `data-id="..."` |
| `onclick="downloadCurrentImage()"` | `data-action="download-current-image"` | - |
| `onclick="deleteCurrentImage()"` | `data-action="delete-current-image"` | - |
| `onclick="saveDocumentEdit()"` | `data-action="save-document-edit"` | - |
| `onclick="downloadFile(url, name)"` | `data-action="download-file"` | `data-url="..." data-filename="..."` |
| `onclick="confirmDeleteFile(id, type)"` | `data-action="delete-file"` | `data-id="..." data-type="..."` |
| `onclick="viewTranscription(trans)"` | `data-action="view-transcription"` | `data-index="0"` |
| `onclick="confirmDeleteTranscription(id)"` | `data-action="delete-transcription"` | `data-id="..."` |
| `onclick="viewReport(id)"` | `data-action="view-report"` | `data-id="..."` |

### 4. State Management

All shared state is centralized in `DashboardState`:

```javascript
DashboardState = {
  currentSection: 'landing',
  currentUser: null,
  data: {
    images: [],
    videos: [],
    transcriptions: [],
    reports: [],
    pdfs: []
  },
  modals: {
    currentImageData: null,
    currentEditDocument: null
  },
  darkMode: false
}
```

**Access state:**
```javascript
// Get current section
const section = DashboardState.currentSection;

// Get images
const images = DashboardState.data.images;

// Update dark mode
DashboardState.updateState('darkMode', true);
```

### 5. Utility Functions

**Toast Notifications:**
```javascript
// Before: alert('Success!')
UIUtilities.showToast('Success!', 'success');
UIUtilities.showToast('Error occurred', 'error');
UIUtilities.showToast('Information', 'info');
UIUtilities.showToast('Warning!', 'warning');
```

**Update Counts:**
```javascript
// Before: Manually updating each count element
document.getElementById('imagesCount').textContent = images.length;

// After: Centralized update
UIUtilities.updateCounts();
```

**Confirm Actions:**
```javascript
// Before: if (confirm('Are you sure?')) { ... }
UIUtilities.confirm('Are you sure?',
  () => { /* on confirm */ },
  () => { /* on cancel (optional) */ }
);
```

## Testing Procedure

### 1. Visual Regression Testing

Test each section to ensure functionality works:

1. **Landing Page**
   - Click each dashboard card → Should navigate to correct section
   - Check all badge counts display correctly

2. **Images Section**
   - Click "View" → Should open image modal
   - Click "Edit" → Should open edit modal
   - Click "Download" → Should trigger download
   - Click "Delete" → Should show confirmation, then delete
   - Modal "Download" button → Should work
   - Modal "Delete" button → Should work
   - Modal "X" button → Should close modal
   - Click outside modal → Should close modal
   - Press Escape key → Should close modal

3. **Videos Section**
   - Click "Download" → Should trigger download
   - Click "Delete" → Should show confirmation, then delete

4. **Transcriptions Section**
   - Click "View" → Should show transcript
   - Click "Delete" → Should show confirmation

5. **PDFs Section**
   - Click "Download" → Should trigger download

6. **Reports Section**
   - Click "View Details" → Should show info toast

7. **Profile Section**
   - Form submission → Should save changes

8. **Navigation**
   - Breadcrumb links → Should navigate
   - "Back to Dashboard" buttons → Should navigate
   - Logout button → Should confirm and log out

### 2. Console Testing

Open browser console and verify:

```javascript
// 1. Check event system loaded
console.log(DashboardState); // Should show state object

// 2. Check handlers registered
console.log(NavigationActions); // Should show navigation functions

// 3. Test manual navigation
NavigationActions.showSection('images');

// 4. Test toast
UIUtilities.showToast('Test message', 'success');

// 5. Check no CSP errors
// Console should be free of "Refused to execute inline event handler" errors
```

### 3. CSP Validation

**Check headers:**
```bash
curl -I https://your-app.com/dashboard.html | grep -i content-security
```

**Should see:**
```
Content-Security-Policy: script-src 'self' 'unsafe-eval'; script-src-attr 'none'
```

**No CSP errors in console** when interacting with page.

## Backwards Compatibility

The event system maintains compatibility with existing code by:

1. **Exposing globals:** All utilities available as `window.DashboardState`, `window.NavigationActions`, etc.
2. **Preserving function signatures:** Existing functions still work (e.g., `showSection()`)
3. **Gradual migration:** Can mix inline handlers with data attributes during transition

**Migration strategy:**
1. Add `dashboard-events.js` to page
2. Convert high-traffic elements first (navigation, modals)
3. Convert remaining elements section by section
4. Test after each section conversion
5. Remove old inline handler code once all converted

## Performance Considerations

**Event delegation benefits:**
- **Fewer event listeners:** One listener on document vs. 50+ individual listeners
- **Dynamic content:** Works with dynamically added elements (no need to re-attach handlers)
- **Memory efficient:** Reduces memory usage, especially on mobile devices

**Potential issues:**
- **Event bubbling:** Ensure events bubble up correctly (don't use `e.stopPropagation()` carelessly)
- **Handler lookup:** Minimal overhead (Map lookup is O(1))

## Security Improvements

1. **XSS Prevention:** All toast messages HTML-escaped via `UIUtilities.escapeHtml()`
2. **No eval():** No dynamic JavaScript execution
3. **Data validation:** All data attributes validated before use
4. **CSP compliance:** Eliminates inline event handlers completely

## Troubleshooting

### Issue: Button doesn't respond to clicks

**Check:**
1. Button has `data-action` attribute
2. Action is registered in `initializeEventSystem()`
3. Event bubbling not stopped by parent element
4. Console shows no errors

**Debug:**
```javascript
// Add to event handler
console.log('Click detected:', e.target);
console.log('Action element:', e.target.closest('[data-action]'));
console.log('Action:', e.target.closest('[data-action]')?.dataset.action);
```

### Issue: Data not passed correctly

**Check:**
1. All required `data-*` attributes present
2. Data attribute names match handler expectations
3. Data types correct (e.g., `data-index` should be numeric)

**Debug:**
```javascript
// In handler function
console.log('Element dataset:', element.dataset);
```

### Issue: Modal doesn't close

**Check:**
1. Modal ID matches `data-modal-id` attribute
2. Modal has `active` class when open
3. Close button has correct `data-action`

**Debug:**
```javascript
NavigationActions.closeAllModals(); // Force close all modals
```

## Migration Checklist

- [ ] Add `dashboard-events.js` to page
- [ ] Convert navigation buttons (dashboard cards, breadcrumbs)
- [ ] Convert modal buttons (close, save, cancel)
- [ ] Convert image action buttons
- [ ] Convert file action buttons
- [ ] Convert transcription buttons
- [ ] Convert report buttons
- [ ] Convert logout button
- [ ] Test all sections visually
- [ ] Check console for CSP errors
- [ ] Test keyboard shortcuts (Escape to close modals)
- [ ] Test mobile responsiveness
- [ ] Verify toast notifications work
- [ ] Validate dark mode toggle (if implemented)
- [ ] Remove old inline handler code
- [ ] Update documentation

## Future Enhancements

1. **Dark Mode:** Already implemented in `toggleDarkMode()`, just needs UI button
2. **Keyboard Shortcuts:** Framework supports Ctrl+K, add more as needed
3. **Search:** Add `data-role="search"` to search input for Ctrl+K focus
4. **Accessibility:** Add ARIA labels to data-action elements
5. **Loading States:** Add loading indicators to async actions
6. **Optimistic UI:** Update UI before API call, rollback on error

## Related Files

- `/public/js/dashboard-events.js` - Event delegation system
- `/public/dashboard.html` - Main dashboard file to update
- `/CLAUDE.md` - Project-wide CSP compliance documentation

## References

- [Content Security Policy (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Event Delegation (JavaScript.info)](https://javascript.info/event-delegation)
- [Data Attributes (MDN)](https://developer.mozilla.org/en-US/docs/Learn/HTML/Howto/Use_data_attributes)

---

**Last Updated:** 2025-10-28
**Status:** Ready for implementation
**Next Steps:** Update dashboard.html with data attributes and test
