
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



    // ====================================
    // TYPEFORM INTEGRATION HELPER
    // ====================================
    
    /**
     * Universal Typeform redirect function
     * @param {string} formType - 'signup', 'incident', or 'demo'
     * @param {string} userId - User ID (optional, will be generated if not provided)
     * @param {Object} additionalParams - Additional parameters
     * @returns {Promise} - Promise that resolves when redirect is initiated
     */
    window.redirectToTypeform = async function(formType, userId = null, additionalParams = {}) {
        try {
            // Generate user ID if not provided
            if (!userId && window.UUIDService) {
                const session = window.UUIDService.getOrCreateSession();
                userId = session.user_id;
            }
            
            if (!userId) {
                throw new Error('No user ID available for Typeform redirect');
            }
            
            console.log(`🔗 Redirecting to Typeform: ${formType} with UUID: ${userId.substring(0, 8)}...`);
            
            // Build query parameters
            const params = new URLSearchParams({
                userId: userId,
                ...additionalParams
            });
            
            // Call backend redirect service
            const response = await fetch(`/api/redirect-to-typeform/${formType}?${params.toString()}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success && data.typeform_url) {
                    // Store redirect data for return flow
                    sessionStorage.setItem('create_user_id', userId);
                    sessionStorage.setItem('typeform_redirect_type', formType);
                    sessionStorage.setItem('typeform_redirect_time', new Date().toISOString());
                    
                    // Open or redirect to Typeform
                    if (additionalParams.openInNewTab !== false) {
                        window.open(data.typeform_url, '_blank');
                    } else {
                        window.location.href = data.typeform_url;
                    }
                    
                    return { success: true, url: data.typeform_url };
                } else {
                    throw new Error('Invalid response from redirect service');
                }
            } else {
                throw new Error(`Redirect service error: ${response.status}`);
            }
            
        } catch (error) {
            console.error('❌ Typeform redirect failed:', error);
            
            // Fallback to direct URLs if backend service fails
            const fallbackUrls = {
                signup: 'https://form.typeform.com/to/b03aFxEO',
                incident: 'https://form.typeform.com/to/WvM2ejru',
                demo: 'https://form.typeform.com/to/XMBB3Xhq'
            };
            
            const fallbackUrl = fallbackUrls[formType];
            if (fallbackUrl) {
                console.log(`📝 Using fallback URL for ${formType}: ${fallbackUrl}`);
                
                // Try to add UUID parameters manually
                if (userId && window.UUIDService) {
                    try {
                        const enhancedUrl = window.UUIDService.buildTypeformUrl(fallbackUrl, {
                            product_id: formType === 'demo' ? 'demo' : 'car_crash_lawyer_ai',
                            source: `${formType}_fallback`,
                            ...additionalParams
                        });
                        
                        if (additionalParams.openInNewTab !== false) {
                            window.open(enhancedUrl, '_blank');
                        } else {
                            window.location.href = enhancedUrl;
                        }
                        
                        return { success: true, url: enhancedUrl, fallback: true };
                    } catch (uuidError) {
                        console.error('UUID service fallback failed:', uuidError);
                    }
                }
                
                // Last resort: basic URL
                if (additionalParams.openInNewTab !== false) {
                    window.open(fallbackUrl, '_blank');
                } else {
                    window.location.href = fallbackUrl;
                }
                
                return { success: true, url: fallbackUrl, fallback: true, basic: true };
            }
            
            throw new Error(`No fallback URL available for form type: ${formType}`);
        }
    };
    
    /**
     * Check if user returned from Typeform
     * @returns {Object|null} - Return data if user came from Typeform
     */
    window.checkTypeformReturn = function() {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('user_id') || urlParams.get('create_user_id');
        const formType = urlParams.get('form_type');
        const error = urlParams.get('error');
        
        if (userId || formType || error) {
            return {
                userId: userId,
                formType: formType,
                error: error,
                timestamp: new Date().toISOString()
            };
        }
        
        return null;
    };
