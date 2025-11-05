/**
 * Tour Mode - Hands-Free Demo System
 * Auto-playing spotlight tour with moving cursor and timed captions
 * Version: 1.0.0
 *
 * USAGE:
 * 1. Include tour-mode.css in your <head>
 * 2. Optionally define window.TOUR_STEPS before loading this script
 * 3. Include this script with defer
 * 4. Add ?demo=1 to URL to activate
 */

(function() {
  'use strict';

  // ============================================
  // CONFIG - Default tour steps
  // ============================================
  const DEFAULT_STEPS = [
    { sel: '#startButton',     text: 'Tap "Start Report" to begin an incident.', dwell: 1400, radius: 150 },
    { sel: '#w3wField',        text: 'Location is auto-captured with what3words.', dwell: 1600, radius: 160 },
    { sel: '#uploadPhotosBtn', text: 'Add scene photos—clear shots help insurers.', dwell: 1600, radius: 150 },
    { sel: '#summaryPanel',    text: 'AI drafts a plain-English legal summary.', dwell: 1800, radius: 170 },
    { sel: '#exportPdfBtn',    text: 'Export a compliant PDF for your insurer.', dwell: 1800, radius: 150 }
  ];

  // ============================================
  // STATE
  // ============================================
  let overlay = null;
  let caption = null;
  let cursor = null;
  let currentStepIndex = 0;
  let tourSteps = [];
  let timeouts = [];
  let isRunning = false;
  let prefersReducedMotion = false;

  // ============================================
  // INITIALIZATION
  // ============================================
  function init() {
    // Only run if ?demo=1 is in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('demo') !== '1') {
      return;
    }

    // Check for reduced motion preference
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion = mediaQuery.matches;
    }

    // Get tour steps from global config or use defaults
    tourSteps = window.TOUR_STEPS || DEFAULT_STEPS;

    if (!tourSteps || tourSteps.length === 0) {
      console.warn('[Tour Mode] No tour steps defined');
      return;
    }

    console.log('[Tour Mode] Starting demo mode with', tourSteps.length, 'steps');
    createUIElements();

    // Start tour after a brief delay to let page settle
    setTimeout(() => {
      startTour();
    }, 500);
  }

  // ============================================
  // UI CREATION
  // ============================================
  function createUIElements() {
    // Create overlay
    overlay = document.createElement('div');
    overlay.className = 'tour-overlay';
    document.body.appendChild(overlay);

    // Create caption with accessibility attributes
    caption = document.createElement('div');
    caption.className = 'tour-caption';
    caption.setAttribute('role', 'dialog');
    caption.setAttribute('aria-live', 'polite');
    caption.setAttribute('aria-atomic', 'true');
    document.body.appendChild(caption);

    // Create fake cursor
    cursor = document.createElement('div');
    cursor.className = 'tour-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);

    console.log('[Tour Mode] UI elements created');
  }

  // ============================================
  // TOUR EXECUTION
  // ============================================
  function startTour() {
    if (isRunning) return;
    isRunning = true;
    currentStepIndex = 0;
    executeStep();
  }

  function executeStep() {
    if (currentStepIndex >= tourSteps.length) {
      showEndMessage();
      return;
    }

    const step = tourSteps[currentStepIndex];
    const element = document.querySelector(step.sel);

    // Skip missing elements gracefully
    if (!element) {
      console.warn(`[Tour Mode] Element not found: ${step.sel} - skipping step ${currentStepIndex + 1}`);
      currentStepIndex++;
      executeStep();
      return;
    }

    console.log(`[Tour Mode] Step ${currentStepIndex + 1}/${tourSteps.length}: ${step.sel}`);

    // Get element position
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = step.radius || 150;

    // Move spotlight to element
    updateSpotlight(centerX, centerY, radius);

    // Move cursor to element
    moveCursor(centerX, centerY, () => {
      // Pulse cursor on arrival
      pulseCursor();

      // Show caption
      showCaption(step.text, rect, radius);

      // Auto-advance after dwell time
      const timeout = setTimeout(() => {
        hideCaption();
        currentStepIndex++;
        executeStep();
      }, step.dwell || 1500);

      timeouts.push(timeout);
    });
  }

  // ============================================
  // SPOTLIGHT CONTROL
  // ============================================
  function updateSpotlight(x, y, radius) {
    if (!overlay) return;

    // Update clip-path to create spotlight effect
    overlay.style.clipPath = `circle(${radius}px at ${x}px ${y}px)`;
  }

  // ============================================
  // CURSOR ANIMATION
  // ============================================
  function moveCursor(targetX, targetY, onComplete) {
    if (!cursor) return;

    // Show cursor if hidden
    if (!cursor.classList.contains('visible')) {
      cursor.classList.add('visible');
    }

    // Remove pulse animation if present
    cursor.classList.remove('pulse');

    // Move cursor to target position
    cursor.style.left = `${targetX - 10}px`; // Center the 20px cursor
    cursor.style.top = `${targetY - 10}px`;

    // Wait for transition to complete
    const duration = prefersReducedMotion ? 200 : 800;
    const timeout = setTimeout(() => {
      if (onComplete) onComplete();
    }, duration);

    timeouts.push(timeout);
  }

  function pulseCursor() {
    if (!cursor) return;
    cursor.classList.add('pulse');

    // Remove pulse class after animation
    const timeout = setTimeout(() => {
      cursor.classList.remove('pulse');
    }, 600);

    timeouts.push(timeout);
  }

  // ============================================
  // CAPTION CONTROL
  // ============================================
  function showCaption(text, targetRect, radius) {
    if (!caption) return;

    caption.textContent = text;
    caption.classList.remove('end-message');

    // Position caption near target without covering it
    positionCaption(targetRect, radius);

    // Show caption with fade-in
    requestAnimationFrame(() => {
      caption.classList.add('visible');
    });
  }

  function positionCaption(targetRect, radius) {
    if (!caption) return;

    const captionRect = caption.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 20;

    let left, top;

    // Try to position below target first
    top = targetRect.bottom + radius + padding;

    // If caption would go off bottom, position above
    if (top + captionRect.height > viewportHeight - padding) {
      top = targetRect.top - radius - captionRect.height - padding;
    }

    // If still off-screen, position in middle vertically
    if (top < padding || top + captionRect.height > viewportHeight - padding) {
      top = Math.max(padding, (viewportHeight - captionRect.height) / 2);
    }

    // Center horizontally relative to target
    left = targetRect.left + targetRect.width / 2 - captionRect.width / 2;

    // Keep within viewport bounds
    left = Math.max(padding, Math.min(left, viewportWidth - captionRect.width - padding));
    top = Math.max(padding, top);

    caption.style.left = `${left}px`;
    caption.style.top = `${top}px`;
  }

  function hideCaption() {
    if (!caption) return;
    caption.classList.remove('visible');
  }

  // ============================================
  // END MESSAGE
  // ============================================
  function showEndMessage() {
    console.log('[Tour Mode] Tour complete - showing end message');

    if (!caption || !overlay) return;

    // Expand spotlight to full screen
    overlay.style.clipPath = 'circle(100% at 50% 50%)';

    // Hide cursor
    if (cursor) {
      cursor.classList.remove('visible');
    }

    // Show centered end message
    caption.textContent = "That's the flow — ready to try it for real?";
    caption.classList.add('end-message');
    caption.style.left = '50%';
    caption.style.top = '50%';
    caption.style.transform = 'translate(-50%, -50%)';

    requestAnimationFrame(() => {
      caption.classList.add('visible');
    });

    // Teardown after 1.5 seconds
    const timeout = setTimeout(() => {
      teardown();
    }, 1500);

    timeouts.push(timeout);
  }

  // ============================================
  // CLEANUP
  // ============================================
  function teardown() {
    console.log('[Tour Mode] Tearing down demo mode');

    // Clear all pending timeouts
    timeouts.forEach(timeout => clearTimeout(timeout));
    timeouts = [];

    // Remove UI elements
    if (overlay) {
      overlay.remove();
      overlay = null;
    }

    if (caption) {
      caption.remove();
      caption = null;
    }

    if (cursor) {
      cursor.remove();
      cursor = null;
    }

    isRunning = false;
    currentStepIndex = 0;

    console.log('[Tour Mode] Teardown complete');
  }

  // ============================================
  // START ON LOAD
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose teardown globally for manual control if needed
  window.tourModeStop = teardown;

})();
