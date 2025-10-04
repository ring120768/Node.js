// Import the new strict AI summary service
const StrictAISummaryService = require('./lib/strictAISummaryService');
let strictAISummaryService = null;

// Initialize after Supabase setup
if (supabaseEnabled && process.env.OPENAI_API_KEY) {
    strictAISummaryService = new StrictAISummaryService(supabase, Logger);
    Logger.success('✅ Strict AI Summary Service initialized');
}

// Add the new endpoint for strict AI summary generation
app.post('/api/generate-strict-ai-summary', checkSharedKey, async (req, res) => {
    try {
        const { userId, incidentId, queueId, transcription } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'User ID is required',
                requestId: req.requestId
            });
        }
        
        // Get transcription if not provided
        let transcriptionText = transcription;
        
        if (!transcriptionText && queueId) {
            // Fetch from database
            const { data: queueData } = await supabase
                .from('transcription_queue')
                .select('*')
                .eq('id', queueId)
                .single();
                
            if (queueData && queueData.transcription_id) {
                const { data: transData } = await supabase
                    .from('ai_transcription')
                    .select('transcription_text')
                    .eq('id', queueData.transcription_id)
                    .single();
                
                transcriptionText = transData?.transcription_text;
            }
        }
        
        if (!transcriptionText) {
            return res.status(400).json({
                success: false,
                error: 'No transcription found',
                details: 'Unable to retrieve transcription for summary generation',
                requestId: req.requestId
            });
        }
        
        // Generate strict AI summary
        const result = await strictAISummaryService.generateSummary(
            transcriptionText,
            userId,
            incidentId
        );
        
        res.json({
            ...result,
            requestId: req.requestId
        });
        
    } catch (error) {
        Logger.error('Strict AI summary error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to generate AI summary',
            details: error.message,
            requestId: req.requestId
        });
    }
});

// Endpoint to get AI summary validation status
app.get('/api/ai-summary/validation-status/:summaryId', async (req, res) => {
    try {
        const { summaryId } = req.params;
        
        const summary = await strictAISummaryService.getSummary(summaryId);
        
        if (!summary) {
            return res.status(404).json({
                success: false,
                error: 'Summary not found',
                requestId: req.requestId
            });
        }
        
        res.json({
            success: true,
            validation: summary.metadata?.validation,
            factCount: summary.fact_count,
            wordCount: summary.word_count,
            qualityScore: summary.validation_score,
            requestId: req.requestId
        });
        
    } catch (error) {
        Logger.error('Validation status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get validation status',
            requestId: req.requestId
        });
    }
});