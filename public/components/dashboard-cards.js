/**
 * Dashboard Cards JavaScript
 * Car Crash Lawyer AI
 *
 * Dynamic card generation from API data with accessibility support
 * Usage: <script src="/components/dashboard-cards.js"></script>
 */

(function() {
  'use strict';

  /**
   * DashboardCards - Main card generation utility
   */
  window.DashboardCards = {

    /**
     * Generate image card from user document data
     * @param {Object} document - Document object from API
     * @param {Function} onClickCallback - Optional click handler
     * @returns {string} HTML string for image card
     */
    createImageCard: function(document, onClickCallback) {
      const imageUrl = document.signed_url || document.public_url;
      const documentType = this.formatDocumentType(document.document_type);
      const date = this.formatDate(document.created_at);
      const statusBadge = this.getStatusBadge(document.status);
      const clickHandler = onClickCallback ? `data-card-id="${document.id}"` : '';

      return `
        <div class="card card-interactive"
             tabindex="0"
             role="button"
             aria-label="View ${documentType} image"
             ${clickHandler}>
          ${imageUrl ?
            `<img src="${imageUrl}"
                  alt="${documentType}"
                  class="card-image"
                  onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">
             <div class="card-image" style="display:none; align-items:center; justify-content:center; font-size:3rem;">
               🖼️
             </div>` :
            `<div class="card-image" style="display:flex; align-items:center; justify-content:center; font-size:3rem;">
               🖼️
             </div>`
          }
          <div class="card-content">
            <h4>${documentType}</h4>
            <div class="card-meta">
              ${statusBadge}
              <time datetime="${document.created_at}">${date}</time>
            </div>
          </div>
        </div>
      `;
    },

    /**
     * Generate transcription card from transcription data
     * @param {Object} transcription - Transcription object from API
     * @returns {string} HTML string for transcription card
     */
    createTranscriptionCard: function(transcription) {
      const title = transcription.title || 'Incident Description';
      const status = transcription.status || 'pending';
      const statusBadge = this.getTranscriptionStatusBadge(status);
      const progress = this.getTranscriptionProgress(status);
      const date = this.formatDate(transcription.created_at);

      return `
        <div class="card">
          <div class="card-header">
            <h4>${title}</h4>
            ${statusBadge}
          </div>
          <div class="card-body">
            <div class="progress-bar" role="progressbar"
                 aria-valuenow="${progress}"
                 aria-valuemin="0"
                 aria-valuemax="100"
                 aria-label="Processing progress">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <p class="card-meta">
              ${status === 'completed' ? 'Completed' : 'Uploaded'}: ${date}
            </p>
          </div>
        </div>
      `;
    },

    /**
     * Generate empty state card
     * @param {Object} options - Configuration options
     * @returns {string} HTML string for empty state card
     */
    createEmptyStateCard: function(options = {}) {
      const {
        icon = '📁',
        title = 'No Data Yet',
        message = 'Content will appear here when available',
        buttonText = 'Upload Now',
        buttonLink = '#'
      } = options;

      return `
        <div class="card card-empty">
          <div class="empty-icon" aria-hidden="true">${icon}</div>
          <h3>${title}</h3>
          <p>${message}</p>
          ${buttonText ? `<a href="${buttonLink}" class="btn btn-primary">${buttonText}</a>` : ''}
        </div>
      `;
    },

    /**
     * Generate skeleton loading cards
     * @param {number} count - Number of skeleton cards to generate
     * @returns {string} HTML string for skeleton cards
     */
    createSkeletonCards: function(count = 3) {
      const skeletonCard = `
        <div class="card card-skeleton" aria-busy="true" aria-label="Loading content">
          <div class="skeleton skeleton-image"></div>
          <div class="skeleton-content">
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text short"></div>
          </div>
        </div>
      `;

      return Array(count).fill(skeletonCard).join('');
    },

    /**
     * Render cards to container from API data
     * @param {string} containerId - ID of container element
     * @param {Array} data - Array of data objects
     * @param {string} cardType - Type of cards to render ('image', 'transcription')
     * @param {Function} onClickCallback - Optional click handler
     */
    renderCards: function(containerId, data, cardType = 'image', onClickCallback) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error(`Container #${containerId} not found`);
        return;
      }

      // Show skeleton while loading
      this.showSkeletonLoader(containerId);

      // Check if data is empty
      if (!data || data.length === 0) {
        const emptyOptions = this.getEmptyStateOptions(cardType);
        container.innerHTML = this.createEmptyStateCard(emptyOptions);
        return;
      }

      // Generate cards based on type
      let cardsHTML = '<div class="cards-grid">';

      data.forEach(item => {
        if (cardType === 'image') {
          cardsHTML += this.createImageCard(item, onClickCallback);
        } else if (cardType === 'transcription') {
          cardsHTML += this.createTranscriptionCard(item);
        }
      });

      cardsHTML += '</div>';

      container.innerHTML = cardsHTML;

      // Attach click handlers if callback provided
      if (onClickCallback) {
        this.attachCardClickHandlers(containerId, data, onClickCallback);
      }
    },

    /**
     * Show skeleton loader in container
     * @param {string} containerId - ID of container element
     * @param {number} count - Number of skeleton cards
     */
    showSkeletonLoader: function(containerId, count = 6) {
      const container = document.getElementById(containerId);
      if (!container) return;

      container.innerHTML = `
        <div class="cards-grid">
          ${this.createSkeletonCards(count)}
        </div>
      `;
    },

    /**
     * Attach click handlers to interactive cards
     * @param {string} containerId - ID of container element
     * @param {Array} data - Array of data objects
     * @param {Function} callback - Click handler function
     */
    attachCardClickHandlers: function(containerId, data, callback) {
      const container = document.getElementById(containerId);
      if (!container) return;

      // Event delegation for better performance
      container.addEventListener('click', (e) => {
        const card = e.target.closest('[data-card-id]');
        if (card) {
          const cardId = card.getAttribute('data-card-id');
          const item = data.find(d => d.id === cardId);
          if (item) callback(item);
        }
      });

      // Keyboard accessibility
      container.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const card = e.target.closest('[data-card-id]');
          if (card) {
            e.preventDefault();
            const cardId = card.getAttribute('data-card-id');
            const item = data.find(d => d.id === cardId);
            if (item) callback(item);
          }
        }
      });
    },

    /**
     * Helper: Format document type for display
     * @param {string} type - Document type from API
     * @returns {string} Formatted type
     */
    formatDocumentType: function(type) {
      if (!type) return 'Document';
      return type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    },

    /**
     * Helper: Format date for display (UK format)
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    formatDate: function(dateString) {
      if (!dateString) return 'Unknown date';

      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    },

    /**
     * Helper: Get status badge HTML
     * @param {string} status - Status from API
     * @returns {string} Badge HTML
     */
    getStatusBadge: function(status) {
      const statusMap = {
        'completed': { class: 'badge-completed', icon: '✓', text: 'Completed' },
        'processing': { class: 'badge-processing', icon: '⏳', text: 'Processing' },
        'pending': { class: 'badge-pending', icon: '⏱', text: 'Pending' },
        'failed': { class: 'badge-failed', icon: '✗', text: 'Failed' }
      };

      const config = statusMap[status] || statusMap['pending'];
      return `<span class="badge ${config.class}">${config.icon} ${config.text}</span>`;
    },

    /**
     * Helper: Get transcription status badge
     * @param {string} status - Transcription status
     * @returns {string} Badge HTML
     */
    getTranscriptionStatusBadge: function(status) {
      const statusMap = {
        'completed': { class: 'badge-completed', icon: '✓', text: 'Complete' },
        'processing': { class: 'badge-processing', icon: '⏳', text: 'Processing...' },
        'failed': { class: 'badge-failed', icon: '✗', text: 'Failed' }
      };

      const config = statusMap[status] || statusMap['processing'];
      return `<span class="badge ${config.class}">${config.icon} ${config.text}</span>`;
    },

    /**
     * Helper: Calculate transcription progress percentage
     * @param {string} status - Transcription status
     * @returns {number} Progress percentage
     */
    getTranscriptionProgress: function(status) {
      const progressMap = {
        'pending': 10,
        'processing': 65,
        'completed': 100,
        'failed': 0
      };

      return progressMap[status] || 0;
    },

    /**
     * Helper: Get empty state options by card type
     * @param {string} cardType - Type of card
     * @returns {Object} Empty state configuration
     */
    getEmptyStateOptions: function(cardType) {
      const options = {
        'image': {
          icon: '🖼️',
          title: 'No Images Yet',
          message: 'Images you upload will appear here',
          buttonText: 'Upload Images',
          buttonLink: '/incident.html'
        },
        'transcription': {
          icon: '🎙️',
          title: 'No Transcriptions Yet',
          message: 'Audio recordings and transcripts will appear here',
          buttonText: 'Upload Audio',
          buttonLink: '/transcription.html'
        },
        'pdf': {
          icon: '📄',
          title: 'No Reports Generated',
          message: 'Completed PDF reports will appear here once generated',
          buttonText: 'Generate Report',
          buttonLink: '/incident.html'
        }
      };

      return options[cardType] || options['image'];
    }
  };

  /**
   * Example Usage:
   *
   * // Load images from API and render
   * fetch('/api/user-documents?user_id=xxx&document_type=image')
   *   .then(res => res.json())
   *   .then(data => {
   *     const documents = data.data?.documents || [];
   *     DashboardCards.renderCards(
   *       'imagesContainer',
   *       documents,
   *       'image',
   *       (document) => {
   *         console.log('Card clicked:', document);
   *         // Show modal, navigate, etc.
   *       }
   *     );
   *   });
   *
   * // Show loading state
   * DashboardCards.showSkeletonLoader('imagesContainer', 6);
   *
   * // Generate single card manually
   * const cardHTML = DashboardCards.createImageCard(documentData);
   * document.getElementById('container').innerHTML = cardHTML;
   */

})();

/**
 * Initialize card interactions when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('✅ Dashboard Cards component loaded');

  // Add keyboard navigation support for all interactive cards
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.card-interactive[tabindex="0"]');
      if (card) {
        e.preventDefault();
        card.click();
      }
    }
  });
});
