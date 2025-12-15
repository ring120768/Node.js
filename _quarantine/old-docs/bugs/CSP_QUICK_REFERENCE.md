# CSP Event Handling Quick Reference

## Quick Conversion Table

| Action | Old (Inline) | New (CSP-Compliant) |
|--------|--------------|---------------------|
| **Navigation** | `onclick="showSection('images')"` | `data-action="show-section" data-section="images"` |
| **Logout** | `onclick="handleLogout()"` | `data-action="logout"` |
| **Close Modal** | `onclick="closeModal()"` | `data-action="close-image-modal"` |
| **View Image** | `onclick="viewImage(img)"` | `data-action="view-image" data-index="0"` |
| **Download** | `onclick="downloadImage(url, name)"` | `data-action="download-image" data-url="..." data-filename="..."` |
| **Delete** | `onclick="deleteImage(id)"` | `data-action="delete-image" data-id="..."` |

## Common Patterns

### Navigation Buttons
```html
<!-- Back to Dashboard -->
<button data-action="show-section" data-section="landing">← Back</button>

<!-- Section Cards -->
<div class="dashboard-card" data-action="show-section" data-section="images">
  <h3>Images</h3>
</div>

<!-- Breadcrumb Links -->
<a href="#" data-action="show-section" data-section="landing">Dashboard</a>
```

### Modal Controls
```html
<!-- Close Button -->
<button data-action="close-image-modal">&times;</button>

<!-- Save Button -->
<button data-action="save-document-edit">Save</button>

<!-- Cancel Button -->
<button data-action="close-edit-modal">Cancel</button>
```

### Image Actions
```html
<!-- View (uses index to access DashboardState.data.images[index]) -->
<button data-action="view-image" data-index="${index}">View</button>

<!-- Edit -->
<button data-action="edit-image" data-index="${index}">Edit</button>

<!-- Download -->
<button data-action="download-image"
        data-url="${image.signed_url}"
        data-filename="${image.document_type}">
  Download
</button>

<!-- Delete -->
<button data-action="delete-image" data-id="${image.id}">Delete</button>
```

### Dynamic Content (Rendered via JavaScript)
```javascript
// ✅ CORRECT: Use data attributes in template strings
const html = `
  <button data-action="view-image" data-index="${index}">View</button>
  <button data-action="delete-image" data-id="${image.id}">Delete</button>
`;

// ❌ WRONG: Don't use inline handlers
const html = `
  <button onclick="viewImage(${JSON.stringify(image)})">View</button>
`;
```

## State Management

### Accessing State
```javascript
// Current section
const section = DashboardState.currentSection;

// User data
const user = DashboardState.currentUser;

// Images array
const images = DashboardState.data.images;

// Current modal image
const image = DashboardState.modals.currentImageData;
```

### Updating State
```javascript
// Update simple value
DashboardState.updateState('currentSection', 'images');

// Update nested value
DashboardState.updateState('data.images', newImagesArray);

// Update dark mode (persists to localStorage)
DashboardState.updateState('darkMode', true);
```

## Utility Functions

### Toast Notifications
```javascript
// Success
UIUtilities.showToast('Operation successful!', 'success');

// Error
UIUtilities.showToast('Something went wrong', 'error');

// Info
UIUtilities.showToast('Here is some information', 'info');

// Warning
UIUtilities.showToast('Be careful!', 'warning');

// Custom duration (default 3000ms)
UIUtilities.showToast('Quick message', 'success', 1000);
```

### Confirmation Dialogs
```javascript
// Simple confirm
UIUtilities.confirm('Are you sure?',
  () => console.log('Confirmed'),
  () => console.log('Cancelled')
);

// With delete action
UIUtilities.confirm('Delete this image?',
  async () => {
    await fetch(`/api/images/${id}`, { method: 'DELETE' });
    UIUtilities.showToast('Deleted!', 'success');
  }
);
```

### Update Counts
```javascript
// Update all section count badges
UIUtilities.updateCounts();

// Or update individual count
UIUtilities.updateCountElement('imagesCount', 42);
```

### Loading Skeleton
```javascript
// Show skeleton while loading
UIUtilities.showLoadingSkeleton('imagesContainer', 6);
```

## Navigation Functions

### Show Section
```javascript
// Programmatically navigate
NavigationActions.showSection('images');
NavigationActions.showSection('landing');
NavigationActions.showSection('profile');
```

### Modal Control
```javascript
// Open modal
NavigationActions.openModal('imageModal');

// Close modal
NavigationActions.closeModal('imageModal');

// Close all modals
NavigationActions.closeAllModals();
```

### Logout
```javascript
// Logout with confirmation
NavigationActions.logout();
```

## Image Actions

### View Image
```javascript
// From element
ImageActions.viewImage(element); // element.dataset.index = "0"

// Or manually
const image = DashboardState.data.images[0];
DashboardState.modals.currentImageData = image;
NavigationActions.openModal('imageModal');
```

### Download Image
```javascript
// From element
ImageActions.downloadImage(element);
// element.dataset.url = "https://..."
// element.dataset.filename = "image.jpg"

// Or manually
ImageActions.downloadImage({
  dataset: {
    url: 'https://example.com/image.jpg',
    filename: 'my-image.jpg'
  }
});
```

### Delete Image
```javascript
// From element (shows confirmation)
ImageActions.deleteImage(element); // element.dataset.id = "uuid"
```

## Available Actions (data-action values)

### Navigation
- `show-section` - Navigate to section (requires `data-section`)
- `toggle-dark-mode` - Toggle dark/light mode
- `logout` - Logout user

### Modals
- `close-modal` - Close any modal (requires `data-modal-id`)
- `close-image-modal` - Close image viewer
- `close-edit-modal` - Close edit form

### Images
- `view-image` - Open image viewer (requires `data-index`)
- `edit-image` - Open edit form (requires `data-index`)
- `download-image` - Download image (requires `data-url`, `data-filename`)
- `download-current-image` - Download from modal
- `delete-image` - Delete image (requires `data-id`)
- `delete-current-image` - Delete from modal
- `save-document-edit` - Save edit form

### Files
- `download-file` - Download any file (requires `data-url`, `data-filename`)
- `delete-file` - Delete file (requires `data-id`, `data-type`)

### Transcriptions
- `view-transcription` - View transcript (requires `data-index`)
- `delete-transcription` - Delete transcript (requires `data-id`)

### Reports
- `view-report` - View report details (requires `data-id`)

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Escape` | Close all open modals |
| `Ctrl+K` or `Cmd+K` | Focus search (if search input has `data-role="search"`) |

## Rendering Best Practices

### Use Array Index for Complex Objects
```javascript
// ✅ GOOD: Pass index, retrieve object from state
${images.map((image, index) => `
  <button data-action="view-image" data-index="${index}">View</button>
`).join('')}

// ❌ BAD: Pass entire object (unsafe, breaks with quotes/special chars)
${images.map(image => `
  <button onclick='viewImage(${JSON.stringify(image)})'>View</button>
`).join('')}
```

### Escape User Input
```javascript
// ✅ GOOD: Escape HTML
UIUtilities.showToast(UIUtilities.escapeHtml(userInput), 'info');

// ❌ BAD: Raw user input (XSS vulnerability)
container.innerHTML = `<div>${userInput}</div>`;
```

### Update State Before Re-render
```javascript
// ✅ GOOD: Update state, then render
DashboardState.data.images.push(newImage);
renderImages();

// ❌ BAD: Render with stale state
renderImages();
DashboardState.data.images.push(newImage); // Won't show!
```

## Debugging Tips

### Check if Event System Loaded
```javascript
console.log(DashboardState); // Should show state object
console.log(NavigationActions); // Should show navigation functions
```

### Test Action Manually
```javascript
// Trigger action without clicking
NavigationActions.showSection('images');
ImageActions.viewImage({ dataset: { index: 0 } });
```

### Check Event Delegation
```javascript
// Check if handler registered
const delegator = window.EventDelegator;
console.log(delegator.handlers.has('view-image')); // Should be true
```

### Debug Click Events
```javascript
// Temporary debug handler
document.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]');
  if (action) {
    console.log('Action clicked:', action.dataset.action, action.dataset);
  }
});
```

## Common Mistakes

### ❌ Mistake 1: Using onclick
```html
<!-- CSP VIOLATION -->
<button onclick="doSomething()">Click</button>
```
**Fix:** Use data-action
```html
<button data-action="do-something">Click</button>
```

### ❌ Mistake 2: Passing Objects via JSON.stringify
```javascript
`<button onclick='viewImage(${JSON.stringify(image)})'>View</button>`
```
**Fix:** Pass index, retrieve from state
```javascript
`<button data-action="view-image" data-index="${index}">View</button>`
```

### ❌ Mistake 3: Forgetting to Update State
```javascript
// Delete image but don't update state
await deleteImageAPI(id);
renderImages(); // Still shows deleted image!
```
**Fix:** Update state before re-render
```javascript
await deleteImageAPI(id);
DashboardState.data.images = images.filter(img => img.id !== id);
renderImages(); // Now correct
```

### ❌ Mistake 4: Not Escaping User Input
```javascript
container.innerHTML = `<div>${userMessage}</div>`; // XSS!
```
**Fix:** Use escapeHtml
```javascript
container.innerHTML = `<div>${UIUtilities.escapeHtml(userMessage)}</div>`;
```

## File Locations

- **Event System:** `/public/js/dashboard-events.js`
- **Dashboard HTML:** `/public/dashboard.html`
- **Migration Guide:** `/CSP_EVENT_MIGRATION_GUIDE.md`
- **This Reference:** `/CSP_QUICK_REFERENCE.md`

## Need More Help?

See full migration guide: `CSP_EVENT_MIGRATION_GUIDE.md`

---

**Version:** 1.0.0
**Last Updated:** 2025-10-28
