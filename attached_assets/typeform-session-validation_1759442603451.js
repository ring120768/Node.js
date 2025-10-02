// ============================
// User ID and Session Management - STRICT TYPEFORM FLOW
// ============================
async function initializeSession() {
    const urlParams = new URLSearchParams(window.location.search);

    // STRICT: Only accept create_user_id from Typeform
    state.userId = urlParams.get('create_user_id') || 
                  localStorage.getItem('create_user_id');

    // If no user ID found, attempt to retrieve from Supabase
    if (!state.userId) {
        console.warn('No create_user_id found, attempting recovery from Supabase...');
        
        // Try to get from session storage first (in case of page refresh)
        const sessionUserId = sessionStorage.getItem('create_user_id');
        if (sessionUserId) {
            state.userId = sessionUserId;
            localStorage.setItem('create_user_id', sessionUserId);
        } else {
            // Attempt to retrieve from Supabase using any available identifiers
            const recovered = await attemptUserIdRecovery(urlParams);
            if (recovered) {
                state.userId = recovered;
                localStorage.setItem('create_user_id', recovered);
                sessionStorage.setItem('create_user_id', recovered);
            }
        }
    }

    // CRITICAL: If still no user ID, show error and prevent access
    if (!state.userId) {
        console.error('CRITICAL: No create_user_id available from Typeform');
        showTranscriptionServiceError();
        return null; // Return null to indicate initialization failed
    }

    // Validate the user ID format (should be from Typeform)
    if (!validateTypeformUserId(state.userId)) {
        console.error('Invalid create_user_id format - not from Typeform');
        showTranscriptionServiceError();
        return null;
    }

    // Store validated user ID
    localStorage.setItem('create_user_id', state.userId);
    sessionStorage.setItem('create_user_id', state.userId);

    // Check if returning from consent page
    const consentGiven = urlParams.get('consent_given') === 'true';
    if (consentGiven) {
        state.hasConsent = true;
        localStorage.setItem('gdpr_consent', 'true');
    }

    // Extract incident report ID if available
    state.incidentReportId = urlParams.get('incident_report_id') || 
                            urlParams.get('incident_id') ||
                            localStorage.getItem('current_incident_id');

    if (state.incidentReportId) {
        localStorage.setItem('current_incident_id', state.incidentReportId);
    }

    // Update UI with session info
    updateUserInfoBadge();

    console.log('Session initialized with Typeform user:', {
        userId: state.userId,
        incidentId: state.incidentReportId,
        source: urlParams.get('source') || 'direct'
    });

    return state.userId;
}

// Attempt to recover user ID from Supabase
async function attemptUserIdRecovery(urlParams) {
    if (!supabase) {
        await initializeSupabase();
    }
    
    if (!supabase) {
        console.error('Cannot connect to Supabase for user recovery');
        return null;
    }

    try {
        // Try using incident_report_id if available
        const incidentId = urlParams.get('incident_report_id') || 
                          urlParams.get('incident_id');
        
        if (incidentId) {
            console.log('Attempting to recover user ID using incident ID:', incidentId);
            
            // Query incident_reports table
            const { data, error } = await supabase
                .from('incident_reports')
                .select('create_user_id')
                .eq('id', incidentId)
                .single();
            
            if (data && data.create_user_id) {
                console.log('Successfully recovered user ID from incident report');
                return data.create_user_id;
            }
        }

        // Try using email if provided
        const email = urlParams.get('email');
        if (email) {
            console.log('Attempting to recover user ID using email:', email);
            
            const { data, error } = await supabase
                .from('user_signup')
                .select('create_user_id')
                .eq('email', email)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (data && data.create_user_id) {
                console.log('Successfully recovered user ID from user_signup');
                return data.create_user_id;
            }
        }

        console.error('No recovery method succeeded - user must start from Typeform');
        
        // Log the failed recovery attempt
        console.warn('Recovery attempt failed for:', {
            incident_id: incidentId,
            email: email,
            timestamp: new Date().toISOString()
        });
        
        return null;

    } catch (error) {
        console.error('Error recovering user ID from Supabase:', error);
        return null;
    }
}

// Validate that the user ID is from Typeform
function validateTypeformUserId(userId) {
    // Typeform user IDs typically have a specific format
    // Adjust this validation based on your actual Typeform ID format
    
    // Check if it's NOT an auto-generated ID
    if (userId.startsWith('user_') && userId.includes('_')) {
        const parts = userId.split('_');
        // Check if second part is a timestamp (auto-generated)
        if (parts[1] && !isNaN(parseInt(parts[1]))) {
            return false; // This is auto-generated, not from Typeform
        }
    }
    
    // Check for minimum length and basic format
    if (!userId || userId.length < 5) {
        return false;
    }
    
    // Add any specific Typeform ID validation here
    // For example, if Typeform IDs are UUIDs:
    // const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    // return uuidRegex.test(userId);
    
    return true; // Assume valid if passes basic checks
}

// Show error when transcription service is unavailable
function showTranscriptionServiceError() {
    // Hide all normal UI elements
    const container = document.querySelector('.container');
    
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
                <h1 style="color: #ef4444; margin-bottom: 20px;">Transcription Service Error</h1>
                <div style="background: #fee2e2; border: 2px solid #ef4444; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                    <p style="font-size: 18px; color: #991b1b; margin-bottom: 15px;">
                        <strong>Unable to access transcription services</strong>
                    </p>
                    <p style="color: #7f1d1d; line-height: 1.6;">
                        We couldn't retrieve your session information from the form submission. 
                        This usually happens when:
                    </p>
                    <ul style="text-align: left; max-width: 400px; margin: 15px auto; color: #7f1d1d;">
                        <li>You accessed this page directly without completing the initial form</li>
                        <li>Your session has expired (sessions expire after 24 hours)</li>
                        <li>There was an issue with the form submission</li>
                    </ul>
                </div>
                <div style="background: #f0f7ff; border: 1px solid #667eea; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                    <p style="color: #1e3a8a; font-weight: 600; margin-bottom: 10px;">
                        To resolve this issue:
                    </p>
                    <ol style="text-align: left; max-width: 400px; margin: 0 auto; color: #1e3a8a;">
                        <li>Return to the incident report form</li>
                        <li>Complete all required fields</li>
                        <li>Submit the form to receive your unique session link</li>
                        <li>Use the link provided to access this transcription page</li>
                    </ol>
                </div>
                <button onclick="window.location.href='/incident.html'" 
                        class="btn btn-primary" 
                        style="margin-right: 10px;">
                    Return to Incident Form
                </button>
                <button onclick="contactSupport()" 
                        class="btn btn-ghost">
                    Contact Support
                </button>
                <p style="margin-top: 20px; color: #666; font-size: 14px;">
                    Error Code: NO_TYPEFORM_ID | Timestamp: ${new Date().toISOString()}
                </p>
            </div>
        `;
    }

    // Log error for monitoring
    console.error('Transcription Service Error - No Typeform create_user_id', {
        timestamp: new Date().toISOString(),
        url: window.location.href,
        referrer: document.referrer,
        localStorage: {
            hasUserId: !!localStorage.getItem('create_user_id'),
            hasIncidentId: !!localStorage.getItem('current_incident_id')
        }
    });

    // Prevent any further initialization
    throw new Error('HALT: No valid Typeform user ID available');
}

// Contact support function
function contactSupport() {
    const errorDetails = {
        timestamp: new Date().toISOString(),
        page: 'transcription-status.html',
        error: 'NO_TYPEFORM_ID',
        url: window.location.href
    };
    
    // Encode error details for support
    const supportUrl = `mailto:support@carcrashlawyerai.com?subject=Transcription Service Error&body=Error Details: ${encodeURIComponent(JSON.stringify(errorDetails, null, 2))}`;
    
    window.location.href = supportUrl;
}

// Update the DOMContentLoaded event listener to handle initialization failure
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initializing recording page with strict Typeform validation');

    try {
        // Load navigation history first
        loadNavigationHistory();
        
        // Add current page to history
        addPageToHistory(window.location.href);

        // Initialize configuration first
        await initializeConfig();
        await initializeSupabase();

        // Initialize session with strict validation
        const userId = await initializeSession();
        
        // If initialization failed, stop here
        if (!userId) {
            console.error('Session initialization failed - halting page load');
            return; // Stop all further initialization
        }

        // Continue with normal initialization only if we have a valid Typeform user ID
        const hasConsent = await checkGDPRConsent(state.userId);
        console.log('GDPR consent status:', hasConsent);

        state.hasConsent = hasConsent;

        if (!hasConsent) {
            // Show consent banner for first-time users
            showConsentBanner();
            const gdprNotice = document.getElementById('gdprNotice');
            if (gdprNotice) {
                gdprNotice.classList.add('visible');
            }
        } else {
            // User has consent, make sure record button is visible
            const recordButton = document.getElementById('recordButton');
            if (recordButton) {
                recordButton.style.display = 'inline-block';
            }
        }

        // Initialize components
        initializeVisualizer();
        initWebSocket();
        updateNetworkStatus();

        // Set up event listeners with null checks
        const testMicButton = document.getElementById('testMicButton');
        const recordButton = document.getElementById('recordButton');
        const stopButton = document.getElementById('stopButton');
        const retryButton = document.getElementById('retryButton');
        const confirmButton = document.getElementById('confirmButton');
        
        if (testMicButton) {
            testMicButton.addEventListener('click', testMicrophone);
        }
        if (recordButton) {
            recordButton.addEventListener('click', startRecording);
        }
        if (stopButton) {
            stopButton.addEventListener('click', stopRecording);
        }
        if (retryButton) {
            retryButton.addEventListener('click', confirmReRecord);
        }
        if (confirmButton) {
            confirmButton.addEventListener('click', confirmTranscription);
        }

        // GDPR Consent Banner Listeners
        const consentBanner = document.getElementById('consentBanner');
        const agreeRecordButton = document.getElementById('agreeRecordButton');
        const declineButton = document.getElementById('declineButton');

        if (agreeRecordButton) {
            agreeRecordButton.addEventListener('click', async () => {
                await logConsent('recording_consent', true);
                state.hasConsent = true;
                if (consentBanner) consentBanner.style.display = 'none';

                const recordBtn = document.getElementById('recordButton');
                if (recordBtn) {
                    recordBtn.style.display = 'inline-block';
                    recordBtn.disabled = false;
                    recordBtn.textContent = '🎤 Start Recording';
                }

                showStatus('Consent granted. You can now start recording.', 'success');
            });
        }

        if (declineButton) {
            declineButton.addEventListener('click', async () => {
                await logConsent('recording_consent', false);

                if (consentBanner) consentBanner.style.display = 'none';

                const recordBtn = document.getElementById('recordButton');
                if (recordBtn) {
                    recordBtn.disabled = true;
                    recordBtn.textContent = '🔒 Consent Required';
                    recordBtn.style.display = 'inline-block';
                }

                showStatus('Recording consent declined. You cannot record without consent.', 'warning');

                setTimeout(() => {
                    if (confirm('Would you like to return to the home page?')) {
                        window.location.href = 'https://carcrashlawyerai.com/';
                    }
                }, 3000);
            });
        }

        // Network status monitoring
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        // Handle visibility change (mobile browsers)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && state.mediaRecorder && 
                state.mediaRecorder.state === 'recording') {
                console.log('Page hidden while recording - stopping');
                stopRecording();
            }
        });

        // Use the extracted handler function
        window.addEventListener('beforeunload', handleBeforeUnload);

        // Cleanup on page unload
        window.addEventListener('unload', () => {
            if (state.pollInterval) {
                clearInterval(state.pollInterval);
            }
            if (state.heartbeatInterval) {
                clearInterval(state.heartbeatInterval);
            }
            if (state.ws && !state.isRedirecting) {
                state.ws.close();
            }
        });

        // Show initial status
        showStatus('Ready to record your statement', 'info');

        console.log('Initialization complete');
        
    } catch (error) {
        console.error('Critical initialization error:', error);
        
        // Show error if not already shown
        if (!document.querySelector('.container').innerHTML.includes('Transcription Service Error')) {
            showTranscriptionServiceError();
        }
    }
});