# Dashboard Cards Component Library

**Production-Ready React-Style Card Components for Car Crash Lawyer AI**

## Overview

A complete set of responsive, accessible dashboard card components for displaying user documents, transcriptions, and other data sections. Built with mobile-first design, WCAG 2.1 AA compliance, and optimized for the Car Crash Lawyer AI dashboard.

## Features

✅ **Responsive Grid System**
- Desktop (1024px+): 3 columns
- Tablet (768px-1023px): 2 columns
- Mobile (<768px): 1 column
- Automatic reflow and aspect ratio preservation

✅ **Accessibility**
- WCAG 2.1 AA compliant
- Semantic HTML (article, time, role attributes)
- ARIA labels for status badges
- Keyboard navigation support (Tab, Enter, Space)
- Screen reader friendly
- High contrast mode support
- Reduced motion support

✅ **Performance**
- Event delegation for dynamic content
- Lazy loading support
- Touch-friendly (44px minimum tap targets)
- Optimized animations with CSS transforms

✅ **Component Variants**
1. Base Card - Standard card with header and body
2. Image Card - Interactive cards for user documents
3. Transcription Card - Audio processing with progress bar
4. Empty State Card - Placeholder when no data available
5. Skeleton Loader - Loading state animation

## Files

```
/public/components/
├── dashboard-cards.css           # Component styles (12KB)
├── dashboard-cards.js            # JavaScript utility (8KB)
├── dashboard-cards.html          # Component library demo
└── dashboard-cards-example.html  # Live API integration example
```

## Installation

### 1. Add to HTML

```html
<!-- Add to <head> -->
<link rel="stylesheet" href="/components/dashboard-cards.css">

<!-- Add before </body> -->
<script src="/components/dashboard-cards.js"></script>
```

### 2. Basic HTML Container

```html
<div id="imagesContainer"></div>
```

### 3. Initialize with JavaScript

```javascript
// Fetch data from API
fetch('/api/user-documents?user_id=xxx&document_type=image')
  .then(res => res.json())
  .then(data => {
    const documents = data.data?.documents || [];

    // Render cards with click handler
    DashboardCards.renderCards(
      'imagesContainer',
      documents,
      'image',
      (document) => {
        console.log('Card clicked:', document);
        // Show modal, navigate, etc.
      }
    );
  });
```

## API Reference

### DashboardCards.renderCards()

**Primary method for rendering cards from API data.**

```javascript
DashboardCards.renderCards(
  containerId,   // string: ID of container element
  data,          // array: Data objects from API
  cardType,      // string: 'image' | 'transcription' | 'pdf'
  onClickCallback // function: Optional click handler
)
```

**Example:**

```javascript
DashboardCards.renderCards(
  'imagesContainer',
  imagesArray,
  'image',
  (document) => {
    showImageModal(document);
  }
);
```

### DashboardCards.showSkeletonLoader()

**Show loading skeleton while fetching data.**

```javascript
DashboardCards.showSkeletonLoader(
  containerId,  // string: ID of container element
  count         // number: Number of skeleton cards (default: 6)
)
```

**Example:**

```javascript
// Show 6 skeleton cards while loading
DashboardCards.showSkeletonLoader('imagesContainer', 6);
```

### DashboardCards.createImageCard()

**Generate single image card HTML.**

```javascript
const cardHTML = DashboardCards.createImageCard(
  document,          // object: Document data from API
  onClickCallback    // function: Optional click handler
);
```

**Example:**

```javascript
const cardHTML = DashboardCards.createImageCard({
  id: 'uuid',
  document_type: 'driving_license_picture',
  status: 'completed',
  signed_url: 'https://...',
  created_at: '2025-10-28T10:45:00Z'
});
```

### DashboardCards.createTranscriptionCard()

**Generate transcription card with progress bar.**

```javascript
const cardHTML = DashboardCards.createTranscriptionCard(transcription);
```

**Example:**

```javascript
const cardHTML = DashboardCards.createTranscriptionCard({
  id: 'uuid',
  title: 'Incident Description',
  status: 'processing',
  created_at: '2025-10-28T10:45:00Z'
});
```

### DashboardCards.createEmptyStateCard()

**Generate empty state placeholder.**

```javascript
const cardHTML = DashboardCards.createEmptyStateCard({
  icon: '📁',
  title: 'No Images Yet',
  message: 'Upload images to get started',
  buttonText: 'Upload Now',
  buttonLink: '/incident.html'
});
```

## Data Format

### Expected API Response (Images)

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "uuid",
        "document_type": "driving_license_picture",
        "status": "completed",
        "signed_url": "https://supabase.co/storage/...",
        "public_url": "https://supabase.co/storage/...",
        "created_at": "2025-10-28T10:45:00Z",
        "error_message": null
      }
    ]
  }
}
```

### Expected API Response (Transcriptions)

```json
{
  "transcriptions": [
    {
      "id": "uuid",
      "title": "Incident Description",
      "status": "completed",
      "transcript_text": "...",
      "audio_duration": 120,
      "created_at": "2025-10-28T10:45:00Z"
    }
  ]
}
```

## CSS Classes

### Card Structure

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Title</h3>
    <span class="card-badge badge-success">Badge</span>
  </div>
  <div class="card-body">
    Content
  </div>
</div>
```

### Card Variants

```css
.card                  /* Base card */
.card-interactive      /* Clickable card with hover effects */
.card-empty            /* Empty state card */
.card-skeleton         /* Loading skeleton */
```

### Badge Classes

```css
.badge-success         /* Green - success state */
.badge-completed       /* Green - completed state */
.badge-processing      /* Blue - processing/in progress */
.badge-pending         /* Yellow - pending/waiting */
.badge-failed          /* Red - failed/error */
.badge-warning         /* Orange - warning */
.badge-info            /* Blue - informational */
```

### Grid Layout

```css
.cards-grid            /* Responsive 3/2/1 column grid */
```

## Usage Examples

### Example 1: Load Images from API

```javascript
async function loadImages() {
  const userId = getCurrentUserId();

  try {
    // Show skeleton loader
    DashboardCards.showSkeletonLoader('imagesContainer', 6);

    // Fetch from API
    const response = await fetch(
      `/api/user-documents?user_id=${userId}&document_type=image`
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const documents = data.data?.documents || [];

    // Render cards
    DashboardCards.renderCards(
      'imagesContainer',
      documents,
      'image',
      (doc) => {
        showImageModal(doc);
      }
    );

  } catch (error) {
    console.error('Failed to load images:', error);
    showErrorState('imagesContainer', error.message);
  }
}
```

### Example 2: Load Transcriptions

```javascript
async function loadTranscriptions() {
  const userId = getCurrentUserId();

  try {
    DashboardCards.showSkeletonLoader('transcriptionsContainer', 4);

    const response = await fetch(
      `/api/transcription/history?user_id=${userId}`
    );

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    const transcriptions = data.transcriptions || [];

    DashboardCards.renderCards(
      'transcriptionsContainer',
      transcriptions,
      'transcription'
    );

  } catch (error) {
    console.error('Failed to load transcriptions:', error);
    showErrorState('transcriptionsContainer', error.message);
  }
}
```

### Example 3: Manual Card Generation

```javascript
// Generate cards manually (without API)
const documents = [
  {
    id: '1',
    document_type: 'driving_license_picture',
    status: 'completed',
    signed_url: 'https://...',
    created_at: '2025-10-28T10:45:00Z'
  },
  {
    id: '2',
    document_type: 'vehicle_front',
    status: 'pending',
    signed_url: 'https://...',
    created_at: '2025-10-28T11:30:00Z'
  }
];

let html = '<div class="cards-grid">';
documents.forEach(doc => {
  html += DashboardCards.createImageCard(doc);
});
html += '</div>';

document.getElementById('container').innerHTML = html;
```

### Example 4: Empty State

```javascript
function showEmptyState() {
  const container = document.getElementById('imagesContainer');
  container.innerHTML = DashboardCards.createEmptyStateCard({
    icon: '🖼️',
    title: 'No Images Yet',
    message: 'Upload images via the signup form',
    buttonText: 'Upload Now',
    buttonLink: '/incident.html'
  });
}
```

### Example 5: Error State

```javascript
function showErrorState(containerId, errorMessage) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="card card-empty">
      <div class="empty-icon">⚠️</div>
      <h3>Failed to Load Data</h3>
      <p>${errorMessage}</p>
      <button class="btn btn-primary" onclick="retryLoad()">
        Try Again
      </button>
    </div>
  `;
}
```

## Responsive Behavior

### Desktop (1024px+)
- 3 columns
- Hover effects enabled
- Full-size images (200px height)
- Horizontal badge layout

### Tablet (768px-1023px)
- 2 columns
- Touch-friendly tap targets
- Medium-size images (200px height)
- Horizontal badge layout

### Mobile (<768px)
- 1 column
- Touch-optimized (44px minimum)
- Smaller images (180px height)
- Vertical badge layout
- Full-width buttons

## Accessibility Features

### Keyboard Navigation
- **Tab**: Navigate between cards
- **Enter/Space**: Activate focused card
- **Escape**: Close modals

### ARIA Attributes
```html
<div class="card card-interactive"
     role="button"
     tabindex="0"
     aria-label="View driving license image">
  ...
</div>

<div class="progress-bar"
     role="progressbar"
     aria-valuenow="65"
     aria-valuemin="0"
     aria-valuemax="100"
     aria-label="Processing progress">
  ...
</div>
```

### Semantic HTML
```html
<article class="card">
  <header class="card-header">
    <h3 class="card-title">Section Title</h3>
  </header>
  <time datetime="2025-10-28">28 Oct 2025</time>
</article>
```

## Browser Compatibility

✅ **Supported Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Chrome Android 90+

✅ **Features:**
- CSS Grid
- CSS Custom Properties
- Flexbox
- ES6 JavaScript

## Performance Optimization

### Event Delegation
```javascript
// ✅ GOOD: Single listener for all cards
container.addEventListener('click', (e) => {
  const card = e.target.closest('[data-card-id]');
  if (card) handleCardClick(card);
});

// ❌ BAD: Individual listeners for each card
cards.forEach(card => {
  card.addEventListener('click', handleCardClick);
});
```

### Image Loading
```html
<!-- Lazy loading support -->
<img src="url"
     alt="Description"
     loading="lazy"
     onerror="handleImageError(this)">
```

### CSS Animations
```css
/* Use transform instead of top/left for better performance */
.card:hover {
  transform: translateY(-4px); /* ✅ GPU accelerated */
}

/* Avoid */
.card:hover {
  top: -4px; /* ❌ Forces layout recalculation */
}
```

## Testing

### Unit Test Checklist
- [ ] Cards render from API data
- [ ] Empty state shows when data is empty
- [ ] Skeleton loader displays correctly
- [ ] Click handlers fire correctly
- [ ] Keyboard navigation works
- [ ] ARIA attributes present
- [ ] Responsive breakpoints work

### Manual Test Procedure

**Test dashboard cards:**
```bash
# 1. Start development server
npm start

# 2. Open demo page
http://localhost:5000/components/dashboard-cards.html

# 3. Open example page (live API)
http://localhost:5000/components/dashboard-cards-example.html

# 4. Test interactions
- Click cards
- Test keyboard navigation (Tab, Enter)
- Resize browser (responsive)
- Test on mobile device
- Test with screen reader
```

## Deployment Checklist

Before deploying to production:

- [ ] CSS minified and compressed
- [ ] JavaScript minified and compressed
- [ ] Images optimized (WebP with fallback)
- [ ] All ARIA labels present
- [ ] Keyboard navigation tested
- [ ] Mobile responsiveness verified
- [ ] Browser compatibility checked
- [ ] Performance benchmarked (Lighthouse)
- [ ] Accessibility audit passed (aXe, WAVE)

## Troubleshooting

### Cards not rendering

**Problem:** `renderCards()` called but no cards appear

**Solution:**
```javascript
// Check API response format
console.log('API Response:', data);
console.log('Documents:', data.data?.documents);

// Verify container exists
const container = document.getElementById('imagesContainer');
console.log('Container:', container);

// Check data format
const documents = data.data?.documents || data.documents || [];
console.log('Extracted documents:', documents.length);
```

### Images not displaying

**Problem:** Cards render but images are broken

**Solution:**
```javascript
// Check URL format
console.log('Image URL:', document.signed_url || document.public_url);

// Verify URL is not expired (Supabase signed URLs expire)
// Regenerate signed URLs if needed

// Add error handler
<img onerror="this.style.display='none'; showPlaceholder(this)">
```

### Click handlers not working

**Problem:** Cards not responding to clicks

**Solution:**
```javascript
// Ensure callback is passed to renderCards()
DashboardCards.renderCards(
  'container',
  data,
  'image',
  (doc) => console.log('Clicked:', doc) // ✅ Callback provided
);

// Check data-card-id attribute is present
console.log('Card IDs:', document.querySelectorAll('[data-card-id]').length);
```

## Support

**Issues or Questions?**
- Check demo page: `/components/dashboard-cards.html`
- Check example page: `/components/dashboard-cards-example.html`
- Review API documentation: `/api/user-documents`
- Check browser console for errors

**Common Issues:**
1. **Cards not responsive** - Check viewport meta tag
2. **Images not loading** - Verify API returns signed_url or public_url
3. **Click handlers silent** - Check callback function provided
4. **Skeleton stuck** - Ensure renderCards() called after fetch

## License

Car Crash Lawyer AI - Internal Component Library
