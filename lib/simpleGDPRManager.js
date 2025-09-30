// simpleGDPRManager.js
// This goes in your Node.js project folder, NOT in SQL editor

const { createClient } = require('@supabase/supabase-js');

class SimpleGDPRManager {
    constructor(supabaseUrl, supabaseKey) {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        console.log('✅ SimpleGDPRManager initialized');
    }

    // Register routes with Express
    registerRoutes(app) {
        app.post('/api/gdpr/consent', this.updateConsent.bind(this));
        app.get('/api/gdpr/status/:userId', this.getConsentStatus.bind(this));
        app.get('/api/gdpr/export/:userId', this.exportUserData.bind(this));
        app.delete('/api/gdpr/delete/:userId', this.deleteUserData.bind(this));

        console.log('✅ GDPR routes registered');
    }

    // Update consent - simplified
    async updateConsent(req, res) {
        const { create_user_id, consent_given } = req.body;

        try {
            // Update consent in user_signup table only
            const { data, error } = await this.supabase
                .from('user_signup')
                .upsert({
                    create_user_id: create_user_id,
                    gdpr_consent: consent_given,
                    gdpr_consent_date: new Date().toISOString()
                }, {
                    onConflict: 'create_user_id'
                })
                .select()
                .single();

            if (error) throw error;

            // Log audit activity
            await this.auditLog(create_user_id, consent_given ? 'CONSENT_GRANTED' : 'CONSENT_WITHDRAWN', {
                ip_address: req.ip,
                timestamp: new Date().toISOString()
            }, req);

            res.json({
                success: true,
                message: consent_given ? 'Consent granted' : 'Consent withdrawn',
                data: data
            });

        } catch (error) {
            console.error('❌ Consent error:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    // Get consent status
    async getConsentStatus(req, res) {
        const { userId } = req.params;

        try {
            const { data, error } = await this.supabase
                .from('user_signup')
                .select('gdpr_consent, gdpr_consent_date')
                .eq('create_user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            res.json({
                success: true,
                has_consent: data?.gdpr_consent || false,
                consent_date: data?.gdpr_consent_date,
                user_id: userId
            });

        } catch (error) {
            console.error('❌ Status check error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // Export user data (GDPR Article 15)
    async exportUserData(req, res) {
        const { userId } = req.params;

        try {
            const userData = {};

            // Get user data and consent status from user_signup
            const { data: userInfo } = await this.supabase
                .from('user_signup')
                .select('gdpr_consent, gdpr_consent_date, email, name, surname, mobile')
                .eq('create_user_id', userId)
                .single();
            userData.user_info = userInfo;

            // Get incident reports
            const { data: incidents } = await this.supabase
                .from('incident_reports')
                .select('*')
                .eq('create_user_id', userId);
            userData.incidents = incidents || [];

            // Get AI summaries
            const { data: summaries } = await this.supabase
                .from('ai_summary')
                .select('*')
                .eq('user_id', userId);
            userData.ai_summaries = summaries || [];

            // Log the export
            await this.supabase
                .from('gdpr_audit_log')
                .insert({
                    create_user_id: userId,
                    activity_type: 'DATA_EXPORTED',
                    details: { 
                        exported_at: new Date().toISOString(),
                        tables_exported: Object.keys(userData)
                    }
                });

            res.json({
                success: true,
                user_id: userId,
                exported_at: new Date().toISOString(),
                data: userData
            });

        } catch (error) {
            console.error('❌ Export error:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    // Delete user data (GDPR Article 17)
    async deleteUserData(req, res) {
        const { userId } = req.params;
        const { confirm } = req.body;

        if (confirm !== 'DELETE') {
            return res.status(400).json({
                success: false,
                error: 'Please confirm deletion with: { "confirm": "DELETE" }'
            });
        }

        try {
            const deletedTables = [];

            // Delete from various tables
            const tablesToDelete = [
                'incident_reports',
                'ai_summary',
                'ai_transcription',
                'incident_images'
            ];

            for (const table of tablesToDelete) {
                const { error } = await this.supabase
                    .from(table)
                    .delete()
                    .or(`create_user_id.eq.${userId},user_id.eq.${userId}`);

                if (!error) deletedTables.push(table);
            }

            // Mark consent as withdrawn in user_signup
            await this.supabase
                .from('user_signup')
                .update({ 
                    gdpr_consent: false,
                    gdpr_consent_date: new Date().toISOString()
                })
                .eq('create_user_id', userId);

            // Log deletion
            await this.supabase
                .from('gdpr_audit_log')
                .insert({
                    create_user_id: userId,
                    activity_type: 'DATA_DELETED',
                    details: { 
                        deleted_at: new Date().toISOString(),
                        tables_cleared: deletedTables
                    }
                });

            res.json({
                success: true,
                message: 'User data deleted successfully',
                tables_cleared: deletedTables
            });

        } catch (error) {
            console.error('❌ Deletion error:', error);
            res.status(500).json({ 
                success: false, 
                error: error.message 
            });
        }
    }

    // Add audit logging method
    async auditLog(userId, activityType, details, req) {
        try {
            await this.supabase
                .from('gdpr_audit_log')
                .insert({
                    create_user_id: userId,
                    activity_type: activityType,
                    details: details,
                    ip_address: req?.ip || req?.clientIp || 'unknown',
                    created_at: new Date().toISOString()
                });
        } catch (error) {
            console.warn('Audit log failed:', error.message);
        }
    }

    // Add consent check method
    async checkConsent(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_signup')
                .select('gdpr_consent, gdpr_consent_date')
                .eq('create_user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                return { consent_given: false, error: error.message };
            }

            return {
                consent_given: data?.gdpr_consent || false,
                consent_date: data?.gdpr_consent_date
            };
        } catch (error) {
            return { consent_given: false, error: error.message };
        }
    }
}

module.exports = SimpleGDPRManager;