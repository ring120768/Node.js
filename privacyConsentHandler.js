/**
 * Privacy Consent Handler Module - FIXED FOR YOUR SCHEMA
 * Updated to use create_user_id and match your actual Supabase table structure
 */

const { createClient } = require('@supabase/supabase-js');

class PrivacyConsentHandler {
    constructor(supabaseUrl, supabaseKey) {
        // Initialize Supabase client
        this.supabase = createClient(supabaseUrl, supabaseKey);

        // Cache for consent status (5 minute timeout)
        this.consentCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes

        console.log('🔒 PrivacyConsentHandler initialized');
    }

    /**
     * Register Express routes for privacy consent
     */
    registerRoutes(app) {
        // Main consent recording endpoint
        app.post('/api/gdpr/consent', this.recordConsent.bind(this));

        // Get consent status endpoint
        app.get('/api/gdpr/consent/:userId', this.getConsentStatus.bind(this));

        // Bulk consent check endpoint
        app.post('/api/gdpr/consent/check', this.checkConsentBulk.bind(this));

        // Revoke consent endpoint
        app.delete('/api/gdpr/consent/:userId', this.revokeConsent.bind(this));

        console.log('✅ Privacy consent routes registered');
    }

    /**
     * Record privacy consent with checkbox preferences
     */
    async recordConsent(req, res) {
        console.log('📝 Privacy consent request received');

        try {
            const {
                user_id = 'anonymous',
                consent_type = 'privacy_preferences',
                consent_action,
                preferences,
                timestamp,
                source = 'privacy_modal',
                jurisdiction = 'UK',
                session_id = null,
                ip_address = req.ip
            } = req.body;

            // Validate required fields
            if (!preferences || typeof preferences !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: 'Preferences object is required'
                });
            }

            // Determine if overall consent is given
            const hasConsent = preferences.analytics || preferences.marketing || preferences.ai_processing;

            // 1. Insert/Update main gdpr_consent table (simple structure)
            const { data: consentData, error: consentError } = await this.supabase
                .from('gdpr_consent')
                .upsert({
                    create_user_id: user_id,  // FIXED: Using create_user_id
                    gdpr_consent: hasConsent,
                    gdpr_consent_date: timestamp || new Date().toISOString(),
                    incident_id: null // Your schema has this field
                }, {
                    onConflict: 'create_user_id',
                    ignoreDuplicates: false
                })
                .select()
                .single();

            if (consentError) {
                console.error('❌ Error updating gdpr_consent:', consentError);
                // Don't throw - continue with other tables
            }

            // 2. Insert detailed record into gdpr_consent_records
            const consentText = this.generateConsentText(preferences);
            const applicableLaw = jurisdiction === 'US' ? 'US State Privacy Laws' : 'UK GDPR';

            const { data: recordData, error: recordError } = await this.supabase
                .from('gdpr_consent_records')
                .insert({
                    create_user_id: user_id,  // FIXED: Using create_user_id
                    consent_given: hasConsent,
                    consent_type: consent_type,
                    consent_method: 'checkbox_modal',
                    consent_text: consentText,
                    consent_version: '4.0',
                    jurisdiction: jurisdiction,
                    applicable_law: applicableLaw,
                    ip_address: ip_address,
                    user_agent: req.headers['user-agent'],
                    consent_date: timestamp || new Date().toISOString(),
                    expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months

                    // Store preferences in metadata JSONB field
                    metadata: {
                        preferences: preferences,
                        consent_action: consent_action,
                        source: source,
                        session_id: session_id,
                        categories: {
                            essential: true, // Always true
                            analytics: preferences.analytics === true,
                            marketing: preferences.marketing === true,
                            ai_processing: preferences.ai_processing === true
                        }
                    },

                    withdrawal_date: null,
                    withdrawal_reason: null,
                    withdrawal_method: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (recordError) {
                console.error('❌ Error inserting into gdpr_consent_records:', recordError);
                throw recordError;
            }

            // 3. Log to gdpr_audit_log
            const { error: auditError } = await this.supabase
                .from('gdpr_audit_log')
                .insert({
                    create_user_id: user_id,  // FIXED: Using create_user_id
                    activity_type: 'CONSENT_UPDATED',  // FIXED: Using activity_type
                    details: {
                        consent_action: consent_action,
                        preferences: preferences,
                        source: source,
                        jurisdiction: jurisdiction,
                        record_id: recordData?.id
                    },
                    ip_address: ip_address,
                    user_agent: req.headers['user-agent'],
                    request_id: `consent_${Date.now()}`,
                    timestamp: new Date().toISOString()
                });

            if (auditError) {
                console.error('⚠️ Warning: Failed to log to audit trail:', auditError);
                // Don't throw - audit logging is non-critical
            }

            // Clear cache for this user
            this.clearUserCache(user_id);

            // Success response
            console.log('✅ Privacy consent successfully recorded');
            res.json({
                success: true,
                consent_id: recordData?.id,
                status: hasConsent ? 'granted' : 'declined',
                preferences: preferences,
                expiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
                message: 'Privacy preferences saved successfully'
            });

        } catch (error) {
            console.error('❌ Error processing privacy consent:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to save privacy preferences',
                details: error.message
            });
        }
    }

    /**
     * Get consent status for a user
     */
    async getConsentStatus(req, res) {
        try {
            const { userId } = req.params;

            // Check cache first
            if (this.consentCache.has(userId)) {
                const cached = this.consentCache.get(userId);
                if (Date.now() - cached.timestamp < this.cacheTimeout) {
                    console.log('📦 Returning cached consent status');
                    return res.json(cached.data);
                }
            }

            // Get the most recent consent record
            const { data, error } = await this.supabase
                .from('gdpr_consent_records')
                .select('*')
                .eq('create_user_id', userId)  // FIXED: Using create_user_id
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                // No consent found - return default
                const response = {
                    success: true,
                    hasConsent: false,
                    preferences: {
                        essential: true,
                        analytics: false,
                        marketing: false,
                        ai_processing: false
                    },
                    message: 'No active consent found'
                };

                return res.json(response);
            }

            // Check if consent is expired
            const isExpired = data.expiry_date && new Date(data.expiry_date) < new Date();

            // Check if consent was withdrawn
            const isWithdrawn = data.withdrawal_date !== null;

            if (isExpired || isWithdrawn) {
                return res.json({
                    success: true,
                    hasConsent: false,
                    expired: isExpired,
                    withdrawn: isWithdrawn,
                    preferences: {
                        essential: true,
                        analytics: false,
                        marketing: false,
                        ai_processing: false
                    },
                    message: isExpired ? 'Consent has expired' : 'Consent was withdrawn'
                });
            }

            // Extract preferences from metadata
            const preferences = data.metadata?.preferences || 
                               data.metadata?.categories || 
                               {
                                   essential: true,
                                   analytics: false,
                                   marketing: false,
                                   ai_processing: false
                               };

            const response = {
                success: true,
                hasConsent: data.consent_given,
                preferences: preferences,
                consent_id: data.id,
                expiry: data.expiry_date,
                jurisdiction: data.jurisdiction
            };

            // Cache the result
            this.consentCache.set(userId, {
                data: response,
                timestamp: Date.now()
            });

            res.json(response);

        } catch (error) {
            console.error('❌ Error fetching consent status:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch consent status'
            });
        }
    }

    /**
     * Check consent for multiple categories at once
     */
    async checkConsentBulk(req, res) {
        try {
            const { user_id, categories } = req.body;

            if (!user_id || !categories || !Array.isArray(categories)) {
                return res.status(400).json({
                    success: false,
                    error: 'user_id and categories array required'
                });
            }

            // Get user's current consent from gdpr_consent_records
            const { data } = await this.supabase
                .from('gdpr_consent_records')
                .select('*')
                .eq('create_user_id', user_id)  // FIXED: Using create_user_id
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const results = {};
            categories.forEach(category => {
                if (category === 'essential') {
                    results[category] = true;
                } else if (data && !data.withdrawal_date) {
                    results[category] = data.metadata?.categories?.[category] || 
                                       data.metadata?.preferences?.[category] || 
                                       false;
                } else {
                    results[category] = false;
                }
            });

            res.json({
                success: true,
                user_id,
                consents: results,
                has_active_consent: !!data && !data.withdrawal_date
            });

        } catch (error) {
            console.error('❌ Error checking bulk consent:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check consent'
            });
        }
    }

    /**
     * Revoke all consent for a user (withdrawal)
     */
    async revokeConsent(req, res) {
        try {
            const { userId } = req.params;
            const { reason = 'User requested withdrawal', method = 'api' } = req.body;

            // Update existing records with withdrawal info
            const { error: updateError } = await this.supabase
                .from('gdpr_consent_records')
                .update({ 
                    withdrawal_date: new Date().toISOString(),
                    withdrawal_reason: reason,
                    withdrawal_method: method,
                    consent_given: false,
                    updated_at: new Date().toISOString()
                })
                .eq('create_user_id', userId)  // FIXED: Using create_user_id
                .is('withdrawal_date', null);  // Only update active consents

            if (updateError) {
                console.error('⚠️ Error updating consent records:', updateError);
            }

            // Update main gdpr_consent table
            const { error: consentError } = await this.supabase
                .from('gdpr_consent')
                .update({
                    gdpr_consent: false,
                    gdpr_consent_date: new Date().toISOString()
                })
                .eq('create_user_id', userId);  // FIXED: Using create_user_id

            if (consentError) {
                console.error('⚠️ Error updating gdpr_consent:', consentError);
            }

            // Log to audit trail
            await this.supabase
                .from('gdpr_audit_log')
                .insert({
                    create_user_id: userId,  // FIXED: Using create_user_id
                    activity_type: 'CONSENT_REVOKED',  // FIXED: Using activity_type
                    details: {
                        reason: reason,
                        method: method,
                        timestamp: new Date().toISOString()
                    },
                    ip_address: req.ip,
                    user_agent: req.headers['user-agent'],
                    request_id: `revoke_${Date.now()}`,
                    timestamp: new Date().toISOString()
                });

            // Clear cache
            this.clearUserCache(userId);

            res.json({
                success: true,
                message: 'Consent revoked successfully'
            });

        } catch (error) {
            console.error('❌ Error revoking consent:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to revoke consent'
            });
        }
    }

    // ==================== Helper Methods ====================

    /**
     * Generate human-readable consent text
     */
    generateConsentText(preferences) {
        const consentParts = ['User consented to: Essential cookies (required)'];

        if (preferences.analytics) {
            consentParts.push('Analytics cookies for usage tracking');
        }
        if (preferences.marketing) {
            consentParts.push('Marketing cookies for advertising');
        }
        if (preferences.ai_processing) {
            consentParts.push('AI processing for legal document generation');
        }

        if (!preferences.analytics && !preferences.marketing && !preferences.ai_processing) {
            return 'User opted for essential cookies only (minimum required for functionality)';
        }

        return consentParts.join(', ');
    }

    clearUserCache(userId) {
        this.consentCache.delete(userId);
    }

    /**
     * Handle essential-only consent (cleanup method)
     */
    async handleEssentialOnly(user_id) {
        // This could clear analytics data, remove from marketing lists, etc.
        console.log(`🧹 Handling essential-only consent for user: ${user_id}`);

        // Log the action
        try {
            await this.supabase
                .from('gdpr_audit_log')
                .insert({
                    create_user_id: user_id,  // FIXED: Using create_user_id
                    activity_type: 'ESSENTIAL_ONLY_MODE',  // FIXED: Using activity_type
                    details: {
                        action: 'User opted for essential cookies only',
                        timestamp: new Date().toISOString()
                    },
                    timestamp: new Date().toISOString()
                });
        } catch (error) {
            console.error('⚠️ Failed to log essential-only mode:', error);
        }
    }
}

// Export the class
module.exports = PrivacyConsentHandler;