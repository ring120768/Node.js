
// Universal Navigation Helper
// Include this script on any page that needs navigation functionality

(function() {
    'use strict';
    
    // Global navigation state
    window.pageHistory = window.pageHistory || [];
    window.currentPageIndex = window.currentPageIndex || -1;
    
    // Load navigation history from sessionStorage
    function loadNavigationHistory() {
        try {
            const storedHistory = sessionStorage.getItem('navigationHistory');
            const storedIndex = sessionStorage.getItem('navigationIndex');
            
            if (storedHistory) {
                window.pageHistory = JSON.parse(storedHistory);
            }
            
            if (storedIndex) {
                window.currentPageIndex = parseInt(storedIndex, 10);
            }
            
            console.log('📚 Navigation history loaded:', { 
                history: window.pageHistory, 
                index: window.currentPageIndex 
            });
            
        } catch (error) {
            console.warn('Failed to load navigation history:', error);
            window.pageHistory = [];
            window.currentPageIndex = -1;
        }
    }
    
    // Add page to navigation history
    function addPageToHistory(url) {
        if (!url) return;
        
        // Don't add the same page twice in a row
        if (window.pageHistory.length > 0 && window.pageHistory[window.pageHistory.length - 1] === url) {
            return;
        }
        
        // Remove any forward history if we are navigating back
        if (window.currentPageIndex < window.pageHistory.length - 1) {
            window.pageHistory.splice(window.currentPageIndex + 1);
        }
        
        window.pageHistory.push(url);
        window.currentPageIndex = window.pageHistory.length - 1;
        
        // Store in sessionStorage for persistence across pages
        try {
            sessionStorage.setItem('navigationHistory', JSON.stringify(window.pageHistory));
            sessionStorage.setItem('navigationIndex', window.currentPageIndex.toString());
        } catch (error) {
            console.warn('Failed to store navigation history:', error);
        }
        
        updateNavigationArrows();
    }
    
    // Update navigation arrow visibility and state
    function updateNavigationArrows() {
        const backArrows = document.querySelectorAll('.nav-arrow.back, .back-btn, [onclick*="goBack"]');
        const forwardArrows = document.querySelectorAll('.nav-arrow.forward, [onclick*="goForward"]');
        
        const canGoBack = window.history.length > 1 || (window.pageHistory.length > 1 && window.currentPageIndex > 0);
        const canGoForward = window.currentPageIndex < window.pageHistory.length - 1;
        
        backArrows.forEach(arrow => {
            if (arrow) {
                arrow.style.display = canGoBack ? 'flex' : 'none';
                arrow.style.opacity = canGoBack ? '1' : '0.5';
                arrow.disabled = !canGoBack;
            }
        });
        
        forwardArrows.forEach(arrow => {
            if (arrow) {
                arrow.style.display = canGoForward ? 'flex' : 'none';
                arrow.style.opacity = canGoForward ? '1' : '0.5';
                arrow.disabled = !canGoForward;
            }
        });
        
        console.log('🔄 Navigation arrows updated:', { 
            canGoBack, 
            canGoForward, 
            historyLength: window.pageHistory.length, 
            currentIndex: window.currentPageIndex 
        });
    }
    
    // Universal go back function
    window.goBack = function() {
        console.log('🔙 Go back clicked', { 
            historyLength: window.pageHistory.length, 
            currentIndex: window.currentPageIndex,
            browserHistory: window.history.length
        });
        
        if (window.history.length > 1) {
            window.history.back();
        } else if (window.pageHistory.length > 1 && window.currentPageIndex > 0) {
            window.currentPageIndex--;
            const previousPage = window.pageHistory[window.currentPageIndex];
            console.log('🔙 Navigating to:', previousPage);
            
            // Update sessionStorage before navigation
            sessionStorage.setItem('navigationIndex', window.currentPageIndex.toString());
            
            window.location.href = previousPage;
        } else {
            console.log('🔙 No previous page, going to home');
            window.location.href = '/';
        }
    };
    
    // Universal go forward function
    window.goForward = function() {
        console.log('🔜 Go forward clicked', { 
            historyLength: window.pageHistory.length, 
            currentIndex: window.currentPageIndex 
        });
        
        if (window.currentPageIndex < window.pageHistory.length - 1) {
            window.currentPageIndex++;
            const nextPage = window.pageHistory[window.currentPageIndex];
            console.log('🔜 Navigating to:', nextPage);
            
            // Update sessionStorage before navigation
            sessionStorage.setItem('navigationIndex', window.currentPageIndex.toString());
            
            window.location.href = nextPage;
        } else {
            window.history.forward();
        }
    };
    
    // Initialize navigation when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            loadNavigationHistory();
            addPageToHistory(window.location.href);
            updateNavigationArrows();
        });
    } else {
        loadNavigationHistory();
        addPageToHistory(window.location.href);
        updateNavigationArrows();
    }
    
    // Update arrows when page becomes visible (in case of back/forward browser navigation)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            setTimeout(updateNavigationArrows, 100);
        }
    });
    
    // Make functions globally available
    window.loadNavigationHistory = loadNavigationHistory;
    window.addPageToHistory = addPageToHistory;
    window.updateNavigationArrows = updateNavigationArrows;
    
    console.log('✅ Universal navigation helper loaded');
})();
