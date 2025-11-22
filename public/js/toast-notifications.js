/**
 * Toast Notification System
 * Simple, lightweight toast notifications for dashboard updates
 */

class ToastNotificationSystem {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.maxToasts = 5;
    this.defaultDuration = 5000; // 5 seconds
    this.init();
  }

  /**
   * Initialize toast container
   */
  init() {
    // Create container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
      `;
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  /**
   * Show a toast notification
   * @param {string} title - Toast title
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, info, warning)
   * @param {number} duration - How long to show toast (ms)
   */
  show(title, message, type = 'info', duration = this.defaultDuration) {
    // Limit number of toasts
    if (this.toasts.length >= this.maxToasts) {
      const oldestToast = this.toasts.shift();
      if (oldestToast && oldestToast.element) {
        this.removeToast(oldestToast);
      }
    }

    const toast = this.createToast(title, message, type);
    this.container.appendChild(toast.element);
    this.toasts.push(toast);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      toast.element.classList.add('toast-show');
    });

    // Auto-dismiss
    toast.timeout = setTimeout(() => {
      this.dismissToast(toast);
    }, duration);

    return toast;
  }

  /**
   * Create toast element
   */
  createToast(title, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 16px;
      min-width: 300px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
    `;

    // Icon based on type
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const colors = {
      success: '#10B981',
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#0B7AB0'
    };

    toast.innerHTML = `
      <div style="font-size: 24px; line-height: 1;">
        ${icons[type] || icons.info}
      </div>
      <div style="flex: 1;">
        <div style="font-weight: 600; color: ${colors[type] || colors.info}; margin-bottom: 4px;">
          ${this.escapeHtml(title)}
        </div>
        <div style="font-size: 14px; color: #6B7280; line-height: 1.4;">
          ${this.escapeHtml(message)}
        </div>
      </div>
      <button class="toast-close" style="
        background: none;
        border: none;
        font-size: 20px;
        color: #9CA3AF;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      ">×</button>
    `;

    const toastObj = {
      element: toast,
      type,
      timeout: null
    };

    // Click to dismiss
    toast.addEventListener('click', () => {
      this.dismissToast(toastObj);
    });

    return toastObj;
  }

  /**
   * Dismiss a toast
   */
  dismissToast(toast) {
    if (!toast || !toast.element) return;

    // Clear timeout
    if (toast.timeout) {
      clearTimeout(toast.timeout);
      toast.timeout = null;
    }

    // Animate out
    toast.element.style.opacity = '0';
    toast.element.style.transform = 'translateX(100%)';

    // Remove after animation
    setTimeout(() => {
      this.removeToast(toast);
    }, 300);
  }

  /**
   * Remove toast from DOM and array
   */
  removeToast(toast) {
    if (toast.element && toast.element.parentNode) {
      toast.element.parentNode.removeChild(toast.element);
    }

    const index = this.toasts.indexOf(toast);
    if (index > -1) {
      this.toasts.splice(index, 1);
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear all toasts
   */
  clearAll() {
    this.toasts.forEach(toast => {
      this.dismissToast(toast);
    });
  }
}

// Add CSS for show animation
const style = document.createElement('style');
style.textContent = `
  .toast-show {
    opacity: 1 !important;
    transform: translateX(0) !important;
  }

  .toast:hover {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  }

  .toast-close:hover {
    color: #374151;
  }
`;
document.head.appendChild(style);

// Create global instance
const toastSystem = new ToastNotificationSystem();

// Export global function
window.showToast = function(title, message, type = 'info', duration) {
  return toastSystem.show(title, message, type, duration);
};

// Also export the class
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ToastNotificationSystem;
} else {
  window.ToastNotificationSystem = ToastNotificationSystem;
}
