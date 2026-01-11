const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

/**
 * Create Supabase admin client (lazy-loaded)
 * This avoids module-load-time failures if env vars aren't loaded yet
 */
function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Delete individual document/photo
 * DELETE /api/deletions/document/:id
 */
async function deleteDocument(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    logger.info(`Delete document request: ${id} by user ${userId}`);

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verify document belongs to user
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('user_documents')
      .select('id, user_id, storage_path, image_url')
      .eq('id', id)
      .single();

    if (fetchError || !document) {
      logger.warn(`Document not found: ${id}`);
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.user_id !== userId) {
      logger.warn(`Unauthorized deletion attempt: ${id} by ${userId}`);
      return res.status(403).json({ error: 'Not authorized to delete this document' });
    }

    // 2. Delete file from Supabase Storage (if exists)
    if (document.storage_path) {
      try {
        const { error: storageError } = await supabaseAdmin.storage
          .from('user-documents')
          .remove([document.storage_path]);

        if (storageError) {
          logger.error(`Storage deletion failed for ${document.storage_path}:`, storageError);
        } else {
          logger.info(`Storage file deleted: ${document.storage_path}`);
        }
      } catch (storageErr) {
        logger.error('Storage deletion error:', storageErr);
      }
    }

    // 3. Delete database record
    const { error: deleteError } = await supabaseAdmin
      .from('user_documents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error(`Database deletion failed for document ${id}:`, deleteError);
      return res.status(500).json({ error: 'Failed to delete document' });
    }

    logger.info(`✅ Document deleted successfully: ${id}`);
    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting document:', error);
    return res.status(500).json({ error: 'Failed to delete document' });
  }
}

/**
 * Delete incident report
 * DELETE /api/deletions/report/:id
 */
async function deleteReport(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    logger.info(`Delete report request: ${id} by user ${userId}`);

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verify report belongs to user
    const { data: report, error: fetchError } = await supabaseAdmin
      .from('incident_reports')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (fetchError || !report) {
      logger.warn(`Report not found: ${id}`);
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.user_id !== userId) {
      logger.warn(`Unauthorized deletion attempt: ${id} by ${userId}`);
      return res.status(403).json({ error: 'Not authorized to delete this report' });
    }

    // 2. Delete associated data (witnesses, other vehicles)
    try {
      await supabaseAdmin
        .from('incident_witnesses')
        .delete()
        .eq('user_id', userId)
        .eq('incident_report_id', id);

      await supabaseAdmin
        .from('incident_other_vehicles')
        .delete()
        .eq('user_id', userId)
        .eq('incident_report_id', id);

      logger.info(`Deleted associated witnesses and vehicles for report ${id}`);
    } catch (cascadeError) {
      logger.error('Error deleting associated data:', cascadeError);
    }

    // 3. Delete report
    const { error: deleteError } = await supabaseAdmin
      .from('incident_reports')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error(`Database deletion failed for report ${id}:`, deleteError);
      return res.status(500).json({ error: 'Failed to delete report' });
    }

    logger.info(`✅ Report deleted successfully: ${id}`);
    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting report:', error);
    return res.status(500).json({ error: 'Failed to delete report' });
  }
}

/**
 * Delete completed PDF
 * DELETE /api/deletions/pdf/:id
 */
async function deletePdf(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    logger.info(`Delete PDF request: ${id} by user ${userId}`);

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verify PDF belongs to user
    const { data: pdf, error: fetchError } = await supabaseAdmin
      .from('completed_incident_forms')
      .select('id, user_id, pdf_storage_path')
      .eq('id', id)
      .single();

    if (fetchError || !pdf) {
      logger.warn(`PDF not found: ${id}`);
      return res.status(404).json({ error: 'PDF not found' });
    }

    if (pdf.user_id !== userId) {
      logger.warn(`Unauthorized deletion attempt: ${id} by ${userId}`);
      return res.status(403).json({ error: 'Not authorized to delete this PDF' });
    }

    // 2. Delete PDF from storage (if exists)
    if (pdf.pdf_storage_path) {
      try {
        const { error: storageError } = await supabaseAdmin.storage
          .from('completed-pdfs')
          .remove([pdf.pdf_storage_path]);

        if (storageError) {
          logger.error(`Storage deletion failed for ${pdf.pdf_storage_path}:`, storageError);
        } else {
          logger.info(`PDF storage file deleted: ${pdf.pdf_storage_path}`);
        }
      } catch (storageErr) {
        logger.error('PDF storage deletion error:', storageErr);
      }
    }

    // 3. Delete database record
    const { error: deleteError } = await supabaseAdmin
      .from('completed_incident_forms')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error(`Database deletion failed for PDF ${id}:`, deleteError);
      return res.status(500).json({ error: 'Failed to delete PDF' });
    }

    logger.info(`✅ PDF deleted successfully: ${id}`);
    return res.status(200).json({
      success: true,
      message: 'PDF deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting PDF:', error);
    return res.status(500).json({ error: 'Failed to delete PDF' });
  }
}

/**
 * Delete transcription
 * DELETE /api/deletions/transcription/:id
 */
async function deleteTranscription(req, res) {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    logger.info(`Delete transcription request: ${id} by user ${userId}`);

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verify transcription belongs to user
    const { data: transcription, error: fetchError } = await supabaseAdmin
      .from('ai_transcription')
      .select('id, user_id, audio_storage_path')
      .eq('id', id)
      .single();

    if (fetchError || !transcription) {
      logger.warn(`Transcription not found: ${id}`);
      return res.status(404).json({ error: 'Transcription not found' });
    }

    if (transcription.user_id !== userId) {
      logger.warn(`Unauthorized deletion attempt: ${id} by ${userId}`);
      return res.status(403).json({ error: 'Not authorized to delete this transcription' });
    }

    // 2. Delete audio file from storage (if exists)
    if (transcription.audio_storage_path) {
      try {
        const { error: storageError } = await supabaseAdmin.storage
          .from('voice-recordings')
          .remove([transcription.audio_storage_path]);

        if (storageError) {
          logger.error(`Storage deletion failed for ${transcription.audio_storage_path}:`, storageError);
        } else {
          logger.info(`Audio file deleted: ${transcription.audio_storage_path}`);
        }
      } catch (storageErr) {
        logger.error('Audio storage deletion error:', storageErr);
      }
    }

    // 3. Delete database record
    const { error: deleteError } = await supabaseAdmin
      .from('ai_transcription')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error(`Database deletion failed for transcription ${id}:`, deleteError);
      return res.status(500).json({ error: 'Failed to delete transcription' });
    }

    logger.info(`✅ Transcription deleted successfully: ${id}`);
    return res.status(200).json({
      success: true,
      message: 'Transcription deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting transcription:', error);
    return res.status(500).json({ error: 'Failed to delete transcription' });
  }
}

module.exports = {
  deleteDocument,
  deleteReport,
  deletePdf,
  deleteTranscription
};
