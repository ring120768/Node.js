/**
 * Mascot Component - Adds fixed mascot to top-left corner
 * Include this script on any page to add the mascot
 */

(function() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addMascot);
    } else {
        addMascot();
    }

    function addMascot() {
        // Check if mascot already exists
        if (document.querySelector('.mascot-fixed')) {
            return;
        }

        // Create mascot element
        const mascot = document.createElement('a');
        mascot.href = '/';
        mascot.className = 'mascot-fixed animate-pulse';
        mascot.title = 'Car Crash Lawyer AI - Home';
        mascot.setAttribute('aria-label', 'Return to home page');

        // Create img element
        const img = document.createElement('img');
        img.src = '/images/mascot.png';
        img.alt = 'AL - Your legal sidekick';
        img.loading = 'eager';

        // Append img to link
        mascot.appendChild(img);

        // Add to body
        document.body.insertBefore(mascot, document.body.firstChild);

        // Remove pulse animation after first animation
        setTimeout(() => {
            mascot.classList.remove('animate-pulse');
        }, 2000);

        console.log('✅ Mascot loaded');
    }
})();
