/**
 * CSP-Compliant Event Handling System for Dashboard
 *
 * This module implements a centralized event delegation system that replaces
 * all inline event handlers (onclick="...") with CSP-compliant data attributes.
 *
 * CSP Compliance:
 * - No inline JavaScript (onclick, onload, etc.)
 * - Uses event delegation with data-action attributes
 * - All handlers attached via addEventListener
 *
 * Usage:
 * Instead of: <button onclick="showSection('images')">
 * Use: <button data-action="show-section" data-section="images">
 *
 * @version 1.0.0
 * @date 2025-10-28
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const DashboardState = {
  // Current section being viewed
  currentSection: 'landing',

  // User data cache
  currentUser: null,

  // Data cache for all sections
  data: {
    images: [],
    videos: [],
    transcriptions: [],
    reports: [],
    pdfs: []
  },

  // Modal state
  modals: {
    currentImageData: null,
    currentEditDocument: null
  },

  // Dark mode preference (persisted to localStorage)
  darkMode: localStorage.getItem('darkMode') === 'true',

  // Update state and persist preferences
  updateState(key, value) {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      this[parent][child] = value;
    } else {
      this[key] = value;
    }

    // Persist certain state to localStorage
    if (key === 'darkMode') {
      localStorage.setItem('darkMode', value);
    }
  },

  // Get nested state value
  getState(key) {
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      return this[parent]?.[child];
    }
    return this[key];
  }
};

// ============================================================================
// EVENT DELEGATION SYSTEM
// ============================================================================

/**
 * Central event delegation handler
 * Routes all click events based on data-action attributes
 */
class EventDelegator {
  constructor() {
    this.handlers = new Map();
    this.setupGlobalListeners();
  }

  /**
   * Set up global event listeners on document
   * This captures all events and routes them based on data-action
   */
  setupGlobalListeners() {
    // Click event delegation
    document.addEventListener('click', (e) => this.handleClick(e));

    // Form submission delegation
    document.addEventListener('submit', (e) => this.handleSubmit(e));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Close modals on outside click
    document.addEventListener('click', (e) => this.handleModalClick(e));
  }

  /**
   * Handle click events using event delegation
   */
  handleClick(e) {
    // Find the element with data-action (could be the target or an ancestor)
    const actionElement = e.target.closest('[data-action]');

    if (!actionElement) return;

    const action = actionElement.dataset.action;
    const handler = this.handlers.get(action);

    if (handler) {
      e.preventDefault();
      handler(actionElement, e);
    } else {
      console.warn(`No handler registered for action: ${action}`);
    }
  }

  /**
   * Handle form submissions
   */
  handleSubmit(e) {
    const form = e.target;
    const action = form.dataset.action;

    if (!action) return;

    const handler = this.handlers.get(action);

    if (handler) {
      e.preventDefault();
      handler(form, e);
    }
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeydown(e) {
    // Escape key - close modals
    if (e.key === 'Escape') {
      NavigationActions.closeAllModals();
    }

    // Ctrl+K or Cmd+K - focus search (if implemented)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      // Focus search input if exists
      const searchInput = document.querySelector('[data-role="search"]');
      if (searchInput) searchInput.focus();
    }
  }

  /**
   * Handle modal outside clicks
   */
  handleModalClick(e) {
    // Close modal if clicking outside modal-content
    if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
      NavigationActions.closeModal(e.target.id);
    }
  }

  /**
   * Register an action handler
   */
  register(action, handler) {
    this.handlers.set(action, handler);
  }

  /**
   * Register multiple handlers at once
   */
  registerMany(handlers) {
    Object.entries(handlers).forEach(([action, handler]) => {
      this.register(action, handler);
    });
  }
}

// ============================================================================
// NAVIGATION ACTIONS
// ============================================================================

const NavigationActions = {
  /**
   * Show a specific section and hide all others
   */
  showSection(sectionName) {
    // Update state
    DashboardState.updateState('currentSection', sectionName);

    // Hide all sections
    document.querySelectorAll('.section-view').forEach(view => {
      view.classList.remove('active');
    });

    // Show selected section
    const viewId = `${sectionName}View`;
    const view = document.getElementById(viewId);

    if (view) {
      view.classList.add('active');

      // Trigger section-specific loading
      this.loadSectionData(sectionName);
    } else {
      console.error(`Section view not found: ${viewId}`);
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Load data for specific section (called when section is shown)
   */
  loadSectionData(sectionName) {
    const renderFunctions = {
      'images': () => window.renderImages?.(),
      'videos': () => window.renderVideos?.(),
      'transcriptions': () => window.renderTranscriptions?.(),
      'pdfs': () => window.renderPDFs?.(),
      'reports': () => window.renderReports?.(),
      'profile': () => window.loadProfileData?.()
    };

    const renderFn = renderFunctions[sectionName];
    if (renderFn) {
      renderFn();
    }
  },

  /**
   * Open a modal by ID
   */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }
  },

  /**
   * Close a modal by ID
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = ''; // Restore scroll

      // Clear modal state
      if (modalId === 'imageModal') {
        DashboardState.modals.currentImageData = null;
      } else if (modalId === 'editModal') {
        DashboardState.modals.currentEditDocument = null;
      }
    }
  },

  /**
   * Close all open modals
   */
  closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
      this.closeModal(modal.id);
    });
  },

  /**
   * Toggle dark mode
   */
  toggleDarkMode() {
    const newValue = !DashboardState.darkMode;
    DashboardState.updateState('darkMode', newValue);

    // Apply dark mode class to body
    document.body.classList.toggle('dark-mode', newValue);

    // Show toast notification
    UIUtilities.showToast(
      newValue ? 'Dark mode enabled' : 'Light mode enabled',
      'info'
    );
  },

  /**
   * Logout user
   */
  async logout() {
    const confirmed = confirm('Are you sure you want to log out?');
    if (!confirmed) return;

    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });

      // Clear session storage
      sessionStorage.clear();

      // Redirect to home
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Logout failed:', error);

      // Force logout anyway
      sessionStorage.clear();
      window.location.href = 'index.html';
    }
  }
};

// ============================================================================
// UI UTILITIES
// ============================================================================

const UIUtilities = {
  /**
   * Show toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type: 'success', 'error', 'info', 'warning'
   * @param {number} duration - Duration in ms (default: 3000)
   */
  showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toastContainer') || this.createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span class="toast-message">${this.escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    // Auto-remove after duration
    setTimeout(() => {
      toast.style.animation = 'slideOutDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Create toast container if it doesn't exist
   */
  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  },

  /**
   * Update section counts (badge numbers)
   */
  updateCounts() {
    const data = DashboardState.data;

    // Desktop card counts
    this.updateCountElement('imagesCount', data.images.length);
    this.updateCountElement('videosCount', data.videos.length);
    this.updateCountElement('transcriptionsCount', data.transcriptions.length);
    this.updateCountElement('reportsCount', data.reports.length);
    this.updateCountElement('pdfsCount', data.pdfs.length);

    // Mobile summary card counts
    this.updateCountElement('mobileImagesCount', data.images.length);
    this.updateCountElement('mobileVideosCount', data.videos.length);
    this.updateCountElement('mobileTranscriptionsCount', data.transcriptions.length);
    this.updateCountElement('mobilePdfsCount', data.pdfs.length);
  },

  /**
   * Update a count element by ID
   */
  updateCountElement(elementId, count) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = count;
    }
  },

  /**
   * Show loading skeleton
   */
  showLoadingSkeleton(containerId, count = 6) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const skeletonHTML = `
      <div class="skeleton-grid">
        ${Array(count).fill().map(() => `
          <div class="skeleton-card">
            <div class="skeleton-image"></div>
            <div class="skeleton-content">
              <div class="skeleton-text"></div>
              <div class="skeleton-text short"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.innerHTML = skeletonHTML;
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Confirm action with user
   */
  confirm(message, onConfirm, onCancel) {
    if (window.confirm(message)) {
      onConfirm?.();
    } else {
      onCancel?.();
    }
  }
};

// ============================================================================
// IMAGE ACTIONS
// ============================================================================

const ImageActions = {
  /**
   * View image in modal
   */
  viewImage(element) {
    const index = parseInt(element.dataset.index);
    const image = DashboardState.data.images[index];

    if (!image) {
      console.error('Image not found at index:', index);
      return;
    }

    DashboardState.modals.currentImageData = image;

    const imageUrl = image.signed_url || image.public_url;
    document.getElementById('modalTitle').textContent = this.formatDocumentType(image.document_type);
    document.getElementById('modalImage').src = imageUrl || '';
    document.getElementById('modalMeta').innerHTML = `
      <div><strong>Type:</strong> ${this.formatDocumentType(image.document_type)}</div>
      <div><strong>Date:</strong> ${this.formatDate(image.created_at)}</div>
      <div><strong>Status:</strong> ${image.status || 'pending'}</div>
      ${image.error_message ? `<div style="color: var(--danger-red);"><strong>Error:</strong> ${UIUtilities.escapeHtml(image.error_message)}</div>` : ''}
    `;

    NavigationActions.openModal('imageModal');
  },

  /**
   * Edit image metadata
   */
  editImage(element) {
    const index = parseInt(element.dataset.index);
    const image = DashboardState.data.images[index];

    if (!image) {
      console.error('Image not found at index:', index);
      return;
    }

    DashboardState.modals.currentEditDocument = image;

    // Populate edit form
    document.getElementById('editDocumentType').value = image.document_type || '';
    document.getElementById('editDocumentCategory').value = image.document_category || '';
    document.getElementById('editNotes').value = image.notes || '';

    NavigationActions.openModal('editModal');
  },

  /**
   * Download image
   */
  downloadImage(element) {
    const url = element.dataset.url;
    const filename = element.dataset.filename || 'image';

    if (!url) {
      UIUtilities.showToast('Image URL not available', 'error');
      return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    UIUtilities.showToast('Download started', 'success');
  },

  /**
   * Download current image from modal
   */
  downloadCurrentImage() {
    const image = DashboardState.modals.currentImageData;
    if (!image) return;

    const url = image.signed_url || image.public_url;
    if (url) {
      this.downloadImage({ dataset: { url, filename: image.document_type } });
    }
  },

  /**
   * Delete image with confirmation
   */
  deleteImage(element) {
    const imageId = element.dataset.id;

    UIUtilities.confirm(
      'Are you sure you want to delete this image? This action cannot be undone.',
      async () => {
        try {
          const response = await fetch(`/api/user-documents/${imageId}`, {
            method: 'DELETE',
            credentials: 'include'
          });

          if (response.ok) {
            // Remove from state
            DashboardState.data.images = DashboardState.data.images.filter(img => img.id !== imageId);
            UIUtilities.updateCounts();

            // Re-render images section
            if (window.renderImages) {
              window.renderImages();
            }

            // Close modal if open
            NavigationActions.closeModal('imageModal');

            UIUtilities.showToast('Image deleted successfully', 'success');
          } else {
            throw new Error('Delete failed');
          }
        } catch (error) {
          console.error('Delete failed:', error);
          UIUtilities.showToast('Failed to delete image', 'error');
        }
      }
    );
  },

  /**
   * Delete current image from modal
   */
  deleteCurrentImage() {
    const image = DashboardState.modals.currentImageData;
    if (image) {
      this.deleteImage({ dataset: { id: image.id } });
    }
  },

  /**
   * Save document edit
   */
  async saveDocumentEdit() {
    const document = DashboardState.modals.currentEditDocument;
    if (!document) return;

    const updates = {
      document_type: document.getElementById('editDocumentType').value,
      document_category: document.getElementById('editDocumentCategory').value,
      notes: document.getElementById('editNotes').value
    };

    try {
      const response = await fetch(`/api/user-documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        UIUtilities.showToast('Document updated successfully', 'success');
        NavigationActions.closeModal('editModal');

        // Reload images
        if (window.loadImages) {
          await window.loadImages();
        }
      } else {
        throw new Error('Update failed');
      }
    } catch (error) {
      console.error('Edit failed:', error);
      UIUtilities.showToast('Failed to update document', 'error');
    }
  },

  // Helper methods
  formatDocumentType(type) {
    if (!type) return 'Document';
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  },

  formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

// ============================================================================
// FILE ACTIONS (Videos, PDFs, etc.)
// ============================================================================

const FileActions = {
  /**
   * Download any file
   */
  downloadFile(element) {
    const url = element.dataset.url;
    const filename = element.dataset.filename || 'file';

    if (!url) {
      UIUtilities.showToast('File URL not available', 'error');
      return;
    }

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    UIUtilities.showToast('Download started', 'success');
  },

  /**
   * Delete file with confirmation
   */
  deleteFile(element) {
    const fileId = element.dataset.id;
    const fileType = element.dataset.type || 'file';

    UIUtilities.confirm(
      `Are you sure you want to delete this ${fileType}? This action cannot be undone.`,
      async () => {
        try {
          const response = await fetch(`/api/user-documents/${fileId}`, {
            method: 'DELETE',
            credentials: 'include'
          });

          if (response.ok) {
            // Remove from appropriate data array
            if (fileType === 'video') {
              DashboardState.data.videos = DashboardState.data.videos.filter(v => v.id !== fileId);
              if (window.renderVideos) window.renderVideos();
            }

            UIUtilities.updateCounts();
            UIUtilities.showToast(`${fileType} deleted successfully`, 'success');
          } else {
            throw new Error('Delete failed');
          }
        } catch (error) {
          console.error('Delete failed:', error);
          UIUtilities.showToast(`Failed to delete ${fileType}`, 'error');
        }
      }
    );
  }
};

// ============================================================================
// TRANSCRIPTION ACTIONS
// ============================================================================

const TranscriptionActions = {
  /**
   * View transcription details
   */
  viewTranscription(element) {
    const index = parseInt(element.dataset.index);
    const trans = DashboardState.data.transcriptions[index];

    if (!trans) return;

    // For now, show in alert (TODO: create proper modal)
    alert(`Transcript:\n\n${trans.transcript_text || 'No transcript available'}`);
  },

  /**
   * Delete transcription
   */
  deleteTranscription(element) {
    const id = element.dataset.id;

    UIUtilities.confirm(
      'Are you sure you want to delete this transcription?',
      async () => {
        UIUtilities.showToast('Delete functionality coming soon', 'info');
        // TODO: Implement API call
      }
    );
  }
};

// ============================================================================
// REPORT ACTIONS
// ============================================================================

const ReportActions = {
  /**
   * View report details
   */
  viewReport(element) {
    const reportId = element.dataset.id;
    UIUtilities.showToast('Report view functionality coming soon', 'info');
    // TODO: Implement report detail view
  }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize event delegation system
 * Called when DOM is ready
 */
function initializeEventSystem() {
  console.log('🎯 Initializing CSP-compliant event delegation system');

  // Create global event delegator
  const delegator = new EventDelegator();

  // Register all action handlers
  delegator.registerMany({
    // Navigation
    'show-section': (el) => NavigationActions.showSection(el.dataset.section),
    'toggle-dark-mode': () => NavigationActions.toggleDarkMode(),
    'logout': () => NavigationActions.logout(),

    // Modals
    'close-modal': (el) => NavigationActions.closeModal(el.dataset.modalId),
    'close-image-modal': () => NavigationActions.closeModal('imageModal'),
    'close-edit-modal': () => NavigationActions.closeModal('editModal'),

    // Images
    'view-image': (el) => ImageActions.viewImage(el),
    'edit-image': (el) => ImageActions.editImage(el),
    'download-image': (el) => ImageActions.downloadImage(el),
    'download-current-image': () => ImageActions.downloadCurrentImage(),
    'delete-image': (el) => ImageActions.deleteImage(el),
    'delete-current-image': () => ImageActions.deleteCurrentImage(),
    'save-document-edit': () => ImageActions.saveDocumentEdit(),

    // Files
    'download-file': (el) => FileActions.downloadFile(el),
    'delete-file': (el) => FileActions.deleteFile(el),

    // Transcriptions
    'view-transcription': (el) => TranscriptionActions.viewTranscription(el),
    'delete-transcription': (el) => TranscriptionActions.deleteTranscription(el),

    // Reports
    'view-report': (el) => ReportActions.viewReport(el)
  });

  // Apply dark mode if previously enabled
  if (DashboardState.darkMode) {
    document.body.classList.add('dark-mode');
  }

  // Make utilities globally available for legacy code compatibility
  window.DashboardState = DashboardState;
  window.NavigationActions = NavigationActions;
  window.UIUtilities = UIUtilities;
  window.ImageActions = ImageActions;
  window.FileActions = FileActions;

  console.log('✅ Event delegation system initialized');
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEventSystem);
} else {
  initializeEventSystem();
}

// Export for module systems (if used)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DashboardState,
    NavigationActions,
    UIUtilities,
    ImageActions,
    FileActions,
    TranscriptionActions,
    ReportActions
  };
}
