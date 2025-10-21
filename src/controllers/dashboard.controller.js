/**
 * Dashboard Controller
 * Handles user dashboard requests for viewing incident reports
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Get all reports for the authenticated user
 * GET /api/dashboard/reports
 */
exports.getReports = async (req, res) => {
  try {
    const userId = req.session?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - please log in'
      });
    }

    logger.info(`📋 Fetching reports for user: ${userId}`);

    // Fetch incident reports from database
    const { data: reports, error } = await supabase
      .from('incident_reports')
      .select(`
        id,
        create_user_id,
        created_at,
        updated_at,
        incident_location,
        what3words,
        incident_description,
        brief_description,
        status,
        deleted_at
      `)
      .eq('create_user_id', userId)
      .is('deleted_at', null) // GDPR: Only show non-deleted reports
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('❌ Supabase error fetching reports:', error);
      throw error;
    }

    // Check if there's a completed PDF for each report
    const reportIds = reports.map(r => r.id);
    let completedForms = [];

    if (reportIds.length > 0) {
      const { data: forms, error: formsError } = await supabase
        .from('completed_incident_forms')
        .select('incident_report_id, created_at')
        .in('incident_report_id', reportIds)
        .is('deleted_at', null);

      if (!formsError) {
        completedForms = forms || [];
      }
    }

    // Enhance reports with PDF status
    const enhancedReports = reports.map(report => ({
      ...report,
      pdf_generated: completedForms.some(f => f.incident_report_id === report.id),
      status: report.status || (completedForms.some(f => f.incident_report_id === report.id) ? 'complete' : 'pending')
    }));

    logger.info(`✅ Found ${enhancedReports.length} reports for user ${userId}`);

    return res.status(200).json({
      success: true,
      reports: enhancedReports,
      count: enhancedReports.length
    });

  } catch (error) {
    logger.error('❌ Error in getReports:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reports'
    });
  }
};

/**
 * Get detailed report with media files
 * GET /api/dashboard/reports/:id
 */
exports.getReportDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session?.userId || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized - please log in'
      });
    }

    logger.info(`📖 Fetching report details: ${id} for user: ${userId}`);

    // Fetch main incident report
    const { data: report, error: reportError } = await supabase
      .from('incident_reports')
      .select('*')
      .eq('id', id)
      .eq('create_user_id', userId) // Security: User can only view their own reports
      .is('deleted_at', null)
      .single();

    if (reportError || !report) {
      logger.error('❌ Report not found or access denied:', reportError);
      return res.status(404).json({
        success: false,
        error: 'Report not found or access denied'
      });
    }

    // Fetch user documents (images, videos)
    const { data: documents, error: docsError } = await supabase
      .from('user_documents')
      .select('*')
      .eq('create_user_id', userId)
      .eq('status', 'completed') // Only show successfully processed files
      .is('deleted_at', null);

    const images = documents?.filter(doc =>
      doc.file_name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    ) || [];

    const videos = documents?.filter(doc =>
      doc.file_name?.match(/\.(mp4|mov|avi|webm)$/i)
    ) || [];

    // Fetch audio transcription if exists
    const { data: transcription, error: transError } = await supabase
      .from('ai_transcription')
      .select('*')
      .eq('create_user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch DVLA vehicle data if exists
    const { data: dvla, error: dvlaError } = await supabase
      .from('dvla_vehicle_info_new')
      .select('*')
      .eq('create_user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();

    logger.info(`✅ Report details loaded: ${images.length} images, ${videos.length} videos`);

    return res.status(200).json({
      success: true,
      report,
      images,
      videos,
      transcription,
      dvla
    });

  } catch (error) {
    logger.error('❌ Error in getReportDetails:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch report details'
    });
  }
};
