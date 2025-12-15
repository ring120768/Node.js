# Design System Guide - Car Crash Lawyer AI

**Version:** 1.0.0
**Last Updated:** 28 October 2025
**Status:** Production Ready

## Overview

This design system provides a comprehensive, accessible, and professional UI framework for the Car Crash Lawyer AI dashboard. Built with modern CSS custom properties, it ensures consistency, maintainability, and excellent user experience across all devices.

## Features

✅ **8px Grid Spacing System** - Consistent spacing throughout the application
✅ **Typography Scale** - Professional text hierarchy from 12px to 36px
✅ **Semantic Color Tokens** - Dark mode support with accessible contrast ratios
✅ **Component Library** - Cards, badges, buttons, navigation, skeletons
✅ **Responsive Design** - Mobile-first approach with breakpoints
✅ **WCAG 2.2 AA Compliant** - Accessible to all users
✅ **UK-Specific** - British English, date formats, legal context

## Quick Start

### 1. Include the CSS

```html
<link rel="stylesheet" href="/css/design-system.css">
```

### 2. View the Demo

Open `/design-system-demo.html` in your browser to see all components in action with interactive examples.

### 3. Enable Dark Mode (Optional)

```html
<!-- Add data-theme attribute to html element -->
<html data-theme="dark">
```

Or toggle programmatically:

```javascript
document.documentElement.setAttribute('data-theme', 'dark');
```

---

## Design Tokens

### Color Palette

#### Primary Colors (Brand Blue)
```css
--color-primary: #0B7AB0;        /* Main brand color */
--color-primary-dark: #095A85;   /* Hover states */
--color-primary-light: #0D8DC7;  /* Light accents */
--color-primary-50: #E6F4F9;     /* Backgrounds */
```

#### Semantic Colors
```css
--color-success: #10B981;   /* Completed states, positive actions */
--color-danger: #EF4444;    /* Errors, destructive actions */
--color-warning: #F59E0B;   /* Warnings, pending attention */
--color-info: #3B82F6;      /* Information, processing states */
```

#### Neutral Colors (Surfaces & Text)
```css
/* Light mode */
--color-bg-primary: #FFFFFF;      /* Main background */
--color-bg-secondary: #F9FAFB;    /* Secondary surfaces */
--color-surface: #FFFFFF;         /* Card backgrounds */
--color-text-primary: #111827;    /* Headings, important text */
--color-text-secondary: #4B5563;  /* Body text, labels */
--color-border: #E5E7EB;          /* Borders, dividers */
```

Dark mode automatically adjusts these values when `data-theme="dark"` is set.

### Spacing Scale (8px Grid)

```css
--spacing-1: 8px;     /* Tight spacing */
--spacing-2: 16px;    /* Standard spacing */
--spacing-3: 24px;    /* Medium spacing */
--spacing-4: 32px;    /* Large spacing */
--spacing-6: 48px;    /* XL spacing */
--spacing-8: 64px;    /* XXL spacing */
```

**Usage:**
```css
.my-component {
  padding: var(--spacing-3);
  margin-bottom: var(--spacing-4);
  gap: var(--spacing-2);
}
```

### Typography Scale

#### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px - Captions, metadata */
--text-sm: 0.875rem;   /* 14px - Body text, labels */
--text-base: 1rem;     /* 16px - Default body text */
--text-lg: 1.125rem;   /* 18px - Emphasis */
--text-xl: 1.25rem;    /* 20px - Subheadings */
--text-2xl: 1.5rem;    /* 24px - Section titles */
--text-3xl: 1.875rem;  /* 30px - Page titles */
--text-4xl: 2.25rem;   /* 36px - Hero headings */
```

#### Font Weights
```css
--font-normal: 400;    /* Body text */
--font-medium: 500;    /* Labels, nav items */
--font-semibold: 600;  /* Headings, buttons */
--font-bold: 700;      /* Important headings */
```

#### Utility Classes
```html
<p class="text-sm text-secondary">Small secondary text</p>
<h1 class="text-3xl font-bold text-primary">Page Title</h1>
```

### Border Radius

```css
--radius-sm: 4px;      /* Small elements */
--radius-md: 8px;      /* Buttons, inputs */
--radius-lg: 12px;     /* Cards */
--radius-xl: 16px;     /* Large containers */
--radius-full: 9999px; /* Badges, avatars */
```

### Shadows (Depth System)

```css
--shadow-sm: ...;   /* Subtle depth (cards) */
--shadow-md: ...;   /* Standard elevation (hover states) */
--shadow-lg: ...;   /* High elevation (modals) */
--shadow-xl: ...;   /* Maximum elevation (dropdowns) */
```

---

## Components

### 1. Sidebar Navigation

**Features:**
- Collapsible: 280px expanded, 64px collapsed
- Active state indicators with blue accent
- Notification badges
- Responsive: Converts to bottom nav on mobile

**Basic Structure:**
```html
<aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
  <!-- Header with logo and toggle -->
  <div class="sidebar__header">
    <div class="sidebar__logo">
      <svg class="sidebar__nav-icon">...</svg>
      <span class="sidebar__logo-text">Car Crash AI</span>
    </div>
    <button class="sidebar__toggle" aria-label="Toggle sidebar">
      <!-- Hamburger icon -->
    </button>
  </div>

  <!-- Navigation links -->
  <nav class="sidebar__nav">
    <ul class="sidebar__nav-list">
      <li class="sidebar__nav-item">
        <a href="#dashboard" class="sidebar__nav-link sidebar__nav-link--active" aria-current="page">
          <svg class="sidebar__nav-icon">...</svg>
          <span class="sidebar__nav-label">Dashboard</span>
          <span class="sidebar__badge">3</span> <!-- Optional notification -->
        </a>
      </li>
      <!-- More items... -->
    </ul>
  </nav>
</aside>
```

**Collapse Functionality:**
```javascript
const sidebar = document.getElementById('sidebar');
sidebar.classList.toggle('sidebar--collapsed');
```

**Active State:**
Use `aria-current="page"` or add class `sidebar__nav-link--active` to the current page link.

---

### 2. Mobile Bottom Navigation

**Displays on screens under 768px:**

```html
<nav class="mobile-nav" aria-label="Mobile navigation">
  <ul class="mobile-nav__list">
    <li class="mobile-nav__item">
      <a href="#dashboard" class="mobile-nav__link mobile-nav__link--active" aria-current="page">
        <svg class="mobile-nav__icon">...</svg>
        <span>Home</span>
      </a>
    </li>
    <!-- More items (max 5 recommended) -->
  </ul>
</nav>
```

**Best Practices:**
- Limit to 5 navigation items for readability
- Use short labels (1 word preferred)
- Icons should be 24x24px
- Bottom nav automatically hides sidebar on mobile

---

### 3. Card Components

**Basic Card:**
```html
<div class="card">
  <div class="card__header">
    <h3 class="card__title">Card Title</h3>
    <p class="card__subtitle">Optional subtitle</p>
  </div>
  <div class="card__body">
    <p>Card content goes here.</p>
  </div>
  <div class="card__footer">
    <span class="text-sm text-secondary">Metadata</span>
    <button class="btn btn--primary">Action</button>
  </div>
</div>
```

**Interactive Card (Clickable):**
```html
<div class="card card--interactive" tabindex="0" role="button" aria-label="View report details">
  <!-- Same structure as basic card -->
</div>
```

**Features:**
- Hover effects on interactive cards
- Focus indicators for keyboard navigation
- Consistent padding (32px) and border-radius (12px)
- Shadow system for depth

---

### 4. Status Badges

**Used to indicate status throughout the dashboard:**

```html
<!-- Pending -->
<span class="badge badge--pending">
  <svg class="badge__icon">...</svg>
  Pending
</span>

<!-- Processing -->
<span class="badge badge--processing">
  <svg class="badge__icon">...</svg>
  Processing
</span>

<!-- Completed -->
<span class="badge badge--completed">
  <svg class="badge__icon">...</svg>
  Completed
</span>

<!-- Failed -->
<span class="badge badge--failed">
  <svg class="badge__icon">...</svg>
  Failed
</span>

<!-- Warning -->
<span class="badge badge--warning">
  <svg class="badge__icon">...</svg>
  Warning
</span>
```

**Colors:**
- Pending: Gray (`--color-gray-100`)
- Processing: Blue (`--color-info`)
- Completed: Green (`--color-success`)
- Failed: Red (`--color-danger`)
- Warning: Orange (`--color-warning`)

**Accessibility:**
Icons + text ensure information is conveyed through multiple channels (not color alone).

---

### 5. Button Components

**Button Variants:**

```html
<!-- Primary (blue, main actions) -->
<button class="btn btn--primary">Primary Button</button>

<!-- Secondary (gray, alternative actions) -->
<button class="btn btn--secondary">Secondary Button</button>

<!-- Success (green) -->
<button class="btn btn--success">Success Button</button>

<!-- Danger (red, destructive actions) -->
<button class="btn btn--danger">Delete Report</button>

<!-- Ghost (transparent) -->
<button class="btn btn--ghost">Cancel</button>
```

**Button Sizes:**

```html
<!-- Small -->
<button class="btn btn--primary btn--sm">Small</button>

<!-- Default (no size class needed) -->
<button class="btn btn--primary">Default</button>

<!-- Large -->
<button class="btn btn--primary btn--lg">Large</button>
```

**Button with Icon:**

```html
<button class="btn btn--primary">
  <svg class="btn__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
  </svg>
  Add New Report
</button>
```

**Disabled State:**

```html
<button class="btn btn--primary" disabled>Processing...</button>
```

---

### 6. Skeleton Loaders

**Show while content is loading:**

**Text Skeleton:**
```html
<div class="skeleton skeleton-text skeleton-text--wide"></div>
<div class="skeleton skeleton-text skeleton-text--half"></div>
<div class="skeleton skeleton-text skeleton-text--third"></div>
```

**Image Skeleton:**
```html
<!-- 16:9 aspect ratio -->
<div class="skeleton skeleton-image" aria-busy="true" aria-label="Loading image"></div>

<!-- Square (1:1) -->
<div class="skeleton skeleton-image skeleton-image--square"></div>

<!-- Avatar (circular) -->
<div class="skeleton skeleton-image skeleton-image--avatar"></div>
```

**Card Skeleton:**
```html
<div class="skeleton-card">
  <div class="skeleton-card__header">
    <div class="skeleton skeleton-image--avatar"></div>
    <div style="flex: 1;">
      <div class="skeleton skeleton-text skeleton-text--half"></div>
      <div class="skeleton skeleton-text skeleton-text--third"></div>
    </div>
  </div>
  <div class="skeleton-card__body">
    <div class="skeleton skeleton-text skeleton-text--wide"></div>
    <div class="skeleton skeleton-text skeleton-text--wide"></div>
    <div class="skeleton skeleton-text skeleton-text--half"></div>
  </div>
</div>
```

**Features:**
- Smooth shimmer animation (1.5s loop)
- Automatic dark mode adaptation
- Accessible (aria-busy announcement)

---

## Layout System

### Main Content Area

**Works with sidebar navigation:**

```html
<main class="main-content" id="main-content">
  <!-- Page header -->
  <header class="page-header">
    <h1 class="page-title">Dashboard</h1>
    <p class="page-description">Welcome to your incident reports dashboard</p>
  </header>

  <!-- Content grid for cards -->
  <div class="content-grid">
    <div class="card">...</div>
    <div class="card">...</div>
    <div class="card">...</div>
  </div>
</main>
```

**Content Grid:**
- Responsive: Auto-fills columns (minimum 320px width)
- Gap: 32px between items
- Mobile: Single column on screens under 640px

---

## Accessibility Features

### WCAG 2.2 AA Compliance

✅ **Color Contrast:**
- All text meets minimum 4.5:1 contrast ratio
- Large text (18px+) meets 3:1 ratio
- UI components meet 3:1 ratio

✅ **Keyboard Navigation:**
- All interactive elements focusable with Tab key
- Visible focus indicators (2px blue outline)
- Enter/Space activates buttons and links

✅ **Screen Readers:**
- Semantic HTML (`<nav>`, `<main>`, `<header>`, etc.)
- ARIA labels and roles where appropriate
- Skip link for keyboard users

### Accessibility Utilities

**Screen Reader Only (Visually Hidden):**
```html
<span class="sr-only">Additional context for screen readers</span>
```

**Skip Link (for keyboard users):**
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
```

**Focus Visible:**
```html
<button class="focus-visible">Button with custom focus indicator</button>
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile: < 640px (default styles) */
/* Tablet: 640px - 767px */
/* Desktop: 768px+ */
```

### Mobile Considerations

**Sidebar → Bottom Navigation:**
- Sidebar hidden on mobile (< 768px)
- Bottom navigation appears automatically
- Main content full-width with padding for nav

**Touch Targets:**
- Minimum 44x44px for all interactive elements
- Adequate spacing between tap targets

**Typography:**
- Base font size: 16px (prevents iOS zoom on input focus)
- Fluid typography scales with viewport

---

## Dark Mode Implementation

### Enable Dark Mode

**HTML Attribute:**
```html
<html data-theme="dark">
```

**JavaScript Toggle:**
```javascript
const html = document.documentElement;
const currentTheme = html.getAttribute('data-theme');
const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

html.setAttribute('data-theme', newTheme);
localStorage.setItem('theme', newTheme); // Persist preference
```

### Automatic Color Adaptation

All design tokens automatically adjust for dark mode:
- Backgrounds become darker
- Text becomes lighter
- Borders adjust for proper contrast
- Shadows become more subtle

**Custom dark mode styles (if needed):**
```css
[data-theme="dark"] .my-component {
  /* Dark mode specific styles */
}
```

---

## Best Practices

### 1. Consistent Spacing

Always use spacing tokens instead of arbitrary values:

✅ **Good:**
```css
.my-component {
  padding: var(--spacing-3);
  margin-bottom: var(--spacing-4);
}
```

❌ **Bad:**
```css
.my-component {
  padding: 25px;
  margin-bottom: 35px;
}
```

### 2. Typography Hierarchy

Use the typography scale for consistent text sizing:

✅ **Good:**
```html
<h1 class="text-3xl font-bold">Page Title</h1>
<h2 class="text-2xl font-semibold">Section Title</h2>
<p class="text-base">Body text</p>
<span class="text-sm text-secondary">Metadata</span>
```

### 3. Semantic HTML

Use appropriate HTML elements for better accessibility:

✅ **Good:**
```html
<nav aria-label="Main navigation">
  <ul>
    <li><a href="#dashboard">Dashboard</a></li>
  </ul>
</nav>
```

❌ **Bad:**
```html
<div>
  <div onclick="navigate()">Dashboard</div>
</div>
```

### 4. Color Usage

Use semantic color tokens instead of hardcoded values:

✅ **Good:**
```css
.success-message {
  color: var(--color-success);
  background-color: var(--color-success-light);
}
```

❌ **Bad:**
```css
.success-message {
  color: #10B981;
  background-color: #D1FAE5;
}
```

### 5. Focus Management

Ensure all interactive elements are keyboard accessible:

✅ **Good:**
```html
<div class="card card--interactive" tabindex="0" role="button" aria-label="View report">
  <!-- Content -->
</div>
```

Include focus styles:
```css
.card--interactive:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## UK-Specific Considerations

### Date Formats
Use British date format (DD/MM/YYYY) throughout:
```html
<span class="text-sm text-secondary">Uploaded: 28/10/2025</span>
```

### Time Formats
Display times with GMT/BST timezone:
```html
<span>14:30 GMT</span>
```

### Currency
Use £ symbol and GBP:
```html
<span class="text-lg font-semibold">£1,250.00</span>
```

### British English Spelling
Consistent spelling throughout UI:
- "Licence" (not License)
- "Colour" (not Color)
- "Recognise" (not Recognize)
- "Centre" (not Center)

### Legal Context
Design considers UK legal requirements:
- GDPR compliance messaging
- Clear consent interfaces
- Data retention notices
- Print-friendly layouts (for legal documents)

---

## Print Styles

The design system includes print-optimized styles:

**Automatic Changes When Printing:**
- Navigation elements hidden
- Full-width layout
- Black and white optimization
- No shadows or backgrounds
- Page break avoidance for cards

**No additional markup needed** - print styles automatically apply.

---

## Performance Considerations

### CSS Custom Properties
- Minimal performance impact
- Efficient variable inheritance
- No JavaScript required for theming

### Asset Optimization
- Use SVG icons (scalable, small file size)
- Optimize images before upload
- Lazy load images below the fold

### Animation Performance
- Shimmer animation uses `transform` (GPU-accelerated)
- Transitions use `opacity` and `transform` when possible
- Minimal layout shifts during load

---

## Migration Guide

### Updating Existing Pages

1. **Add Design System CSS:**
```html
<link rel="stylesheet" href="/css/design-system.css">
```

2. **Replace Custom Styles:**
Map existing styles to design tokens:

**Before:**
```css
.my-card {
  background: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
```

**After:**
```html
<div class="card">
  <!-- Content -->
</div>
```

3. **Update Color Values:**
Replace hardcoded colors with tokens:
```css
/* Before */
color: #0B7AB0;

/* After */
color: var(--color-primary);
```

4. **Update Spacing:**
Replace pixel values with spacing tokens:
```css
/* Before */
margin-bottom: 24px;

/* After */
margin-bottom: var(--spacing-3);
```

5. **Test Accessibility:**
- Run keyboard navigation tests
- Verify color contrast
- Test with screen reader

---

## Browser Support

### Fully Supported
✅ Chrome 90+ (including Chrome on Android)
✅ Firefox 88+ (including Firefox on Android)
✅ Safari 14+ (including iOS Safari)
✅ Edge 90+
✅ Samsung Internet 14+

### CSS Features Used
- CSS Custom Properties (CSS Variables)
- CSS Grid
- Flexbox
- CSS Animations
- Media Queries

### Fallbacks
- System fonts for maximum compatibility
- Graceful degradation for older browsers
- No JavaScript required for core styling

---

## Troubleshooting

### Issue: Dark mode not working

**Solution:**
Ensure `data-theme` attribute is on `<html>` element:
```html
<html data-theme="dark">
```

Check JavaScript:
```javascript
document.documentElement.setAttribute('data-theme', 'dark');
```

### Issue: Sidebar overlapping content on mobile

**Solution:**
Ensure main content has proper class:
```html
<main class="main-content">
```

CSS automatically handles responsive layout.

### Issue: Icons not displaying

**Solution:**
Verify SVG markup is complete:
```html
<svg class="sidebar__nav-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="..." />
</svg>
```

### Issue: Focus indicators not visible

**Solution:**
Use `:focus-visible` pseudo-class:
```css
.my-element:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## Examples

### Full Dashboard Page Template

```html
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - Car Crash Lawyer AI</title>
  <link rel="stylesheet" href="/css/design-system.css">
</head>
<body>
  <!-- Skip link -->
  <a href="#main-content" class="skip-link">Skip to main content</a>

  <!-- Sidebar -->
  <aside class="sidebar" id="sidebar">
    <!-- See sidebar component example above -->
  </aside>

  <!-- Mobile nav -->
  <nav class="mobile-nav">
    <!-- See mobile nav example above -->
  </nav>

  <!-- Main content -->
  <main class="main-content" id="main-content">
    <header class="page-header">
      <h1 class="page-title">Dashboard</h1>
      <p class="page-description">Overview of your incident reports</p>
    </header>

    <div class="content-grid">
      <!-- Cards here -->
    </div>
  </main>

  <script>
    // Sidebar toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('sidebar--collapsed');
    });
  </script>
</body>
</html>
```

---

## Resources

**Files:**
- `/css/design-system.css` - Complete design system
- `/design-system-demo.html` - Interactive component demo
- `DESIGN_SYSTEM_GUIDE.md` - This documentation

**Related Documentation:**
- `CLAUDE.md` - Project coding standards
- `MANUAL_TESTING_GUIDE.md` - UI testing procedures
- `DASHBOARD_AUDIT.md` - Dashboard quality checklist

**External Resources:**
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [MDN Web Docs: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [Web Content Accessibility Guidelines (UK)](https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps)

---

## Changelog

### Version 1.0.0 (28 October 2025)
- Initial design system release
- Complete component library
- Dark mode support
- WCAG 2.2 AA compliant
- UK-specific considerations
- Comprehensive documentation

---

## Support

**Questions or Issues?**
- Review the interactive demo: `/design-system-demo.html`
- Check this guide for component examples
- Reference `CLAUDE.md` for project standards

**Need a New Component?**
Follow the existing patterns:
1. Use design tokens (colors, spacing, typography)
2. Include dark mode styles
3. Ensure WCAG 2.2 AA compliance
4. Add focus indicators
5. Test keyboard navigation
6. Document usage in this guide

---

**Last Updated:** 28 October 2025
**Maintained By:** Car Crash Lawyer AI Development Team
**Version:** 1.0.0
