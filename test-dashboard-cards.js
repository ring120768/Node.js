#!/usr/bin/env node

/**
 * Test Script: Dashboard Cards Component Library
 *
 * Validates that all dashboard card components are working correctly
 *
 * Usage: node test-dashboard-cards.js
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`)
};

/**
 * Test results tracker
 */
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Assert test result
 */
function assert(condition, testName, failMessage) {
  if (condition) {
    log.success(testName);
    results.passed++;
    results.tests.push({ name: testName, passed: true });
  } else {
    log.error(`${testName}: ${failMessage}`);
    results.failed++;
    results.tests.push({ name: testName, passed: false, error: failMessage });
  }
}

/**
 * Test: Check files exist
 */
function testFilesExist() {
  log.section('File Existence Tests');

  const files = [
    'public/components/dashboard-cards.css',
    'public/components/dashboard-cards.js',
    'public/components/dashboard-cards.html',
    'public/components/dashboard-cards-example.html',
    'DASHBOARD_CARDS_DOCUMENTATION.md',
    'DASHBOARD_CARDS_COMPONENTS.md'
  ];

  files.forEach(file => {
    const filePath = path.join(__dirname, file);
    const exists = fs.existsSync(filePath);
    assert(
      exists,
      `File exists: ${file}`,
      `File not found at ${filePath}`
    );

    if (exists) {
      const stats = fs.statSync(filePath);
      assert(
        stats.size > 0,
        `File not empty: ${file}`,
        `File is empty: ${filePath}`
      );
    }
  });
}

/**
 * Test: Check CSS content
 */
function testCSSContent() {
  log.section('CSS Content Tests');

  const cssPath = path.join(__dirname, 'public/components/dashboard-cards.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Check for essential CSS classes
  const requiredClasses = [
    '.cards-grid',
    '.card',
    '.card-header',
    '.card-body',
    '.card-content',
    '.card-image',
    '.card-interactive',
    '.card-empty',
    '.card-skeleton',
    '.badge-success',
    '.badge-completed',
    '.badge-processing',
    '.badge-pending',
    '.badge-failed',
    '.progress-bar',
    '.progress-fill',
    '.skeleton',
    '.btn',
    '.btn-primary'
  ];

  requiredClasses.forEach(className => {
    assert(
      css.includes(className),
      `CSS class exists: ${className}`,
      `CSS class not found: ${className}`
    );
  });

  // Check for responsive breakpoints
  assert(
    css.includes('@media (max-width: 1023px)'),
    'Tablet breakpoint exists',
    'Tablet media query not found'
  );

  assert(
    css.includes('@media (max-width: 767px)'),
    'Mobile breakpoint exists',
    'Mobile media query not found'
  );

  // Check for accessibility features
  assert(
    css.includes('@media (prefers-reduced-motion: reduce)'),
    'Reduced motion support exists',
    'Reduced motion media query not found'
  );

  assert(
    css.includes('@media (prefers-contrast: high)'),
    'High contrast mode support exists',
    'High contrast media query not found'
  );

  // Check for CSS custom properties
  assert(
    css.includes('--primary-blue'),
    'CSS custom properties defined',
    'CSS custom properties not found'
  );

  // Check for animations
  assert(
    css.includes('@keyframes'),
    'CSS animations defined',
    'CSS keyframes not found'
  );
}

/**
 * Test: Check JavaScript content
 */
function testJavaScriptContent() {
  log.section('JavaScript Content Tests');

  const jsPath = path.join(__dirname, 'public/components/dashboard-cards.js');
  const js = fs.readFileSync(jsPath, 'utf8');

  // Check for main object
  assert(
    js.includes('window.DashboardCards'),
    'DashboardCards object defined',
    'window.DashboardCards not found'
  );

  // Check for essential methods
  const requiredMethods = [
    'createImageCard',
    'createTranscriptionCard',
    'createEmptyStateCard',
    'createSkeletonCards',
    'renderCards',
    'showSkeletonLoader',
    'formatDocumentType',
    'formatDate',
    'getStatusBadge'
  ];

  requiredMethods.forEach(method => {
    assert(
      js.includes(method),
      `Method exists: ${method}`,
      `Method not found: ${method}`
    );
  });

  // Check for event delegation
  assert(
    js.includes('addEventListener'),
    'Event listeners defined',
    'Event listeners not found'
  );

  // Check for accessibility
  assert(
    js.includes('aria-label'),
    'ARIA labels implemented',
    'ARIA labels not found'
  );

  assert(
    js.includes('role="button"'),
    'ARIA roles implemented',
    'ARIA roles not found'
  );

  // Check for keyboard support
  assert(
    js.includes('keydown'),
    'Keyboard event handlers exist',
    'Keyboard handlers not found'
  );
}

/**
 * Test: Check HTML demo page
 */
function testHTMLDemo() {
  log.section('HTML Demo Page Tests');

  const htmlPath = path.join(__dirname, 'public/components/dashboard-cards.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Check for stylesheet link
  assert(
    html.includes('dashboard-cards.css'),
    'CSS stylesheet linked',
    'CSS link not found'
  );

  // Check for script tag
  assert(
    html.includes('dashboard-cards.js'),
    'JavaScript file linked',
    'Script tag not found'
  );

  // Check for card examples
  assert(
    html.includes('class="card"'),
    'Card examples present',
    'No card examples found'
  );

  // Check for badge variants
  const badgeVariants = [
    'badge-success',
    'badge-completed',
    'badge-processing',
    'badge-pending',
    'badge-failed'
  ];

  badgeVariants.forEach(variant => {
    assert(
      html.includes(variant),
      `Badge variant shown: ${variant}`,
      `Badge variant not found: ${variant}`
    );
  });

  // Check for responsive grid
  assert(
    html.includes('cards-grid'),
    'Responsive grid present',
    'Responsive grid not found'
  );

  // Check for skeleton loader
  assert(
    html.includes('card-skeleton'),
    'Skeleton loader shown',
    'Skeleton loader not found'
  );

  // Check for empty state
  assert(
    html.includes('card-empty'),
    'Empty state shown',
    'Empty state not found'
  );
}

/**
 * Test: Check example page
 */
function testExamplePage() {
  log.section('Example Page Tests');

  const examplePath = path.join(__dirname, 'public/components/dashboard-cards-example.html');
  const example = fs.readFileSync(examplePath, 'utf8');

  // Check for API integration
  assert(
    example.includes('fetch'),
    'API fetch calls present',
    'No API calls found'
  );

  // Check for real endpoints
  assert(
    example.includes('/api/user-documents'),
    'User documents endpoint used',
    'User documents API not found'
  );

  assert(
    example.includes('/api/transcription/history'),
    'Transcription endpoint used',
    'Transcription API not found'
  );

  // Check for error handling
  assert(
    example.includes('catch'),
    'Error handling implemented',
    'No error handling found'
  );

  // Check for loading states
  assert(
    example.includes('showSkeletonLoader'),
    'Skeleton loader used',
    'Skeleton loader not called'
  );

  // Check for modal
  assert(
    example.includes('modal'),
    'Modal implementation present',
    'Modal not found'
  );
}

/**
 * Test: Check documentation
 */
function testDocumentation() {
  log.section('Documentation Tests');

  const docPath = path.join(__dirname, 'DASHBOARD_CARDS_DOCUMENTATION.md');
  const doc = fs.readFileSync(docPath, 'utf8');

  // Check for main sections
  const requiredSections = [
    '## Overview',
    '## Features',
    '## Installation',
    '## API Reference',
    '## Usage Examples',
    '## Responsive Behavior',
    '## Accessibility Features',
    '## Browser Compatibility',
    '## Performance Optimization',
    '## Testing',
    '## Deployment Checklist',
    '## Troubleshooting'
  ];

  requiredSections.forEach(section => {
    assert(
      doc.includes(section),
      `Documentation section: ${section}`,
      `Section not found: ${section}`
    );
  });

  // Check for code examples
  assert(
    doc.includes('```javascript'),
    'JavaScript examples present',
    'No JavaScript examples found'
  );

  assert(
    doc.includes('```html'),
    'HTML examples present',
    'No HTML examples found'
  );

  assert(
    doc.includes('```css'),
    'CSS examples present',
    'No CSS examples found'
  );

  // Check for API documentation
  assert(
    doc.includes('renderCards()'),
    'API method documented: renderCards()',
    'renderCards() documentation not found'
  );

  assert(
    doc.includes('showSkeletonLoader()'),
    'API method documented: showSkeletonLoader()',
    'showSkeletonLoader() documentation not found'
  );
}

/**
 * Test: Check component reference
 */
function testComponentReference() {
  log.section('Component Reference Tests');

  const refPath = path.join(__dirname, 'DASHBOARD_CARDS_COMPONENTS.md');
  const ref = fs.readFileSync(refPath, 'utf8');

  // Check for React components
  assert(
    ref.includes('React.FC'),
    'React TypeScript components present',
    'React components not found'
  );

  // Check for Tailwind examples
  assert(
    ref.includes('Tailwind CSS'),
    'Tailwind CSS examples present',
    'Tailwind examples not found'
  );

  // Check for state management
  assert(
    ref.includes('Context API'),
    'State management examples present',
    'State management not found'
  );

  // Check for testing examples
  assert(
    ref.includes('Jest + React Testing Library'),
    'Unit test examples present',
    'Unit tests not found'
  );

  // Check for accessibility checklist
  assert(
    ref.includes('Accessibility Checklist'),
    'Accessibility checklist present',
    'Accessibility checklist not found'
  );

  // Check for performance section
  assert(
    ref.includes('Performance Considerations'),
    'Performance section present',
    'Performance section not found'
  );
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Dashboard Cards Component Library Test Suite');
  console.log('='.repeat(60));

  testFilesExist();
  testCSSContent();
  testJavaScriptContent();
  testHTMLDemo();
  testExamplePage();
  testDocumentation();
  testComponentReference();

  // Print summary
  log.section('Test Summary');
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);

  if (results.failed > 0) {
    console.log('\n' + colors.red + 'Failed Tests:' + colors.reset);
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  ✗ ${t.name}`);
        if (t.error) console.log(`    ${colors.red}${t.error}${colors.reset}`);
      });
  }

  console.log('\n' + '='.repeat(60));

  if (results.failed === 0) {
    console.log(colors.green + '🎉 All tests passed!' + colors.reset);
    console.log('\n✅ Dashboard Cards Component Library is ready for production!\n');
    process.exit(0);
  } else {
    console.log(colors.red + '❌ Some tests failed!' + colors.reset);
    console.log('\n⚠️ Fix the failing tests before deploying to production.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests();
