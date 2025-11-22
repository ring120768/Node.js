/**
 * Mascot Loading Component
 * Creates enhanced loading animations with mascot or hourglass
 */

(function() {
    'use strict';

    /**
     * Create mascot loading HTML
     * @param {string} message - Loading message to display
     * @returns {string} HTML string
     */
    function createMascotLoading(message) {
        return `
            <div class="mascot-loading-container">
                <div class="mascot-loading-animation">
                    <img src="/images/mascot.png" alt="AL - Processing" loading="eager">
                </div>
                <div class="mascot-loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <div class="mascot-loading-text">${message}</div>
            </div>
        `;
    }

    /**
     * Create hourglass loading HTML
     * @param {string} message - Loading message to display
     * @returns {string} HTML string
     */
    function createHourglassLoading(message) {
        return `
            <div class="hourglass-container">
                <div class="hourglass-animation"></div>
                <div class="hourglass-text">${message}</div>
            </div>
        `;
    }

    /**
     * Show mascot loading in a container
     * @param {string|HTMLElement} container - Container element or selector
     * @param {string} message - Loading message
     * @param {string} type - 'mascot' or 'hourglass'
     */
    function showLoading(container, message, type = 'mascot') {
        const element = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!element) {
            console.error('Loading container not found:', container);
            return;
        }

        const html = type === 'hourglass'
            ? createHourglassLoading(message)
            : createMascotLoading(message);

        element.innerHTML = html;
        element.style.display = 'block';
    }

    /**
     * Hide loading in a container
     * @param {string|HTMLElement} container - Container element or selector
     */
    function hideLoading(container) {
        const element = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!element) {
            console.error('Loading container not found:', container);
            return;
        }

        element.style.display = 'none';
        element.innerHTML = '';
    }

    /**
     * Update loading message
     * @param {string|HTMLElement} container - Container element or selector
     * @param {string} message - New message
     */
    function updateLoadingMessage(container, message) {
        const element = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!element) {
            console.error('Loading container not found:', container);
            return;
        }

        const textElement = element.querySelector('.mascot-loading-text') ||
                          element.querySelector('.hourglass-text');

        if (textElement) {
            textElement.textContent = message;
        }
    }

    // Expose to global scope
    window.MascotLoading = {
        show: showLoading,
        hide: hideLoading,
        updateMessage: updateLoadingMessage,
        createMascot: createMascotLoading,
        createHourglass: createHourglassLoading
    };

    console.log('✅ Mascot Loading component loaded');
})();
