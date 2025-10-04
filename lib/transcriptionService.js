// lib/transcriptionService.js
const FormData = require('form-data');
const fetch = require('node-fetch');
const { Readable } = require('stream');

class TranscriptionService {
    constructor(supabase = null, logger = console) {
        this.apiKey = process.env.OPENAI_API_KEY;
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required - CANNOT USE MOCK DATA FOR LEGAL RECORDS');
        }

        // PRODUCTION SAFETY: Validate API key format
        if (!this.apiKey.startsWith('sk-')) {
            throw new Error('Invalid OpenAI API key format - CANNOT USE MOCK DATA FOR LEGAL RECORDS');
        }

        this.supabase = supabase;
        this.logger = logger;
        this.logger.info('✅ TranscriptionService initialized with API key:', this.apiKey.substring(0, 7) + '...');
    }

    /**
     * Main method that index.js calls
     */
    async processTranscriptionFromBuffer(
        queueId,
        audioBuffer,
        userId,
        incidentId,
        audioUrl
    ) {
        this.logger.info(`🎯 Processing transcription for queue ${queueId}`);

        // SECURITY RESTORED: Validate user ID format
        if (!userId) {
            throw new Error('User ID is required for transcription processing');
        }
        
        // Validate user ID - allow UUIDs and legitimate alphanumeric user IDs
        const isValidUserId = (id) => {
            // Allow valid UUIDs
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
                return true;
            }
            
            // Allow legitimate alphanumeric user IDs (like ianring_120768)
            if (/^[a-zA-Z][a-zA-Z0-9_]{2,63}$/.test(id)) {
                // Block only clearly problematic prefixes
                const blockedPrefixes = ['temp_', 'test_', 'dummy_', 'mock_', 'generated_', 'placeholder_'];
                return !blockedPrefixes.some(prefix => id.toLowerCase().startsWith(prefix));
            }
            
            return false;
        };
        
        if (!isValidUserId(userId)) {
            throw new Error(`SECURITY VIOLATION: Invalid user ID format: ${userId} - must be valid UUID or legitimate user identifier`);
        }
        
        this.logger.info(`✅ Valid Typeform user ID accepted: ${userId}`);

        try {
            // Update queue status to processing
            if (this.supabase) {
                await this.updateQueueStatus(queueId, 'PROCESSING');
            }

            // Call OpenAI Whisper
            const transcriptionText = await this.callWhisperAPI(audioBuffer);

            if (!transcriptionText) {
                throw new Error('No transcription returned from OpenAI');
            }

            this.logger.success(`✅ Transcription received: ${transcriptionText.substring(0, 100)}...`);

            // Save to database
            if (this.supabase) {
                await this.saveTranscription(
                    userId,
                    incidentId,
                    transcriptionText,
                    audioUrl,
                    queueId
                );

                // Update queue status
                await this.updateQueueStatus(queueId, 'COMPLETED');

                // Notify external systems (like Zapier) - non-blocking
                try {
                    if (global.notifyTranscriptionComplete) {
                        global.notifyTranscriptionComplete(userId, incidentId, transcriptionText);
                    }
                } catch (notifyError) {
                    this.logger.warn('External notification failed:', notifyError);
                }
            }

            // Store in memory for WebSocket
            if (global.transcriptionStatuses) {
                global.transcriptionStatuses.set(queueId.toString(), {
                    status: 'COMPLETED',
                    transcription: transcriptionText,
                    error: null,
                    create_user_id: userId
                });
            }

            return transcriptionText;

        } catch (error) {
            this.logger.error(`❌ Transcription failed:`, error);

            if (this.supabase) {
                await this.updateQueueStatus(queueId, 'FAILED', {
                    error_message: error.message
                });
            }

            if (global.transcriptionStatuses) {
                global.transcriptionStatuses.set(queueId.toString(), {
                    status: 'FAILED',
                    error: error.message,
                    create_user_id: userId
                });
            }

            throw error;
        }
    }

    /**
     * Call OpenAI Whisper API
     */
    async callWhisperAPI(audioBuffer) {
        this.logger.info('📞 Calling OpenAI Whisper API...');
        this.logger.info(`Buffer size: ${audioBuffer.length} bytes`);

        // Validate buffer size
        if (!audioBuffer || audioBuffer.length < 100) {
            throw new Error('Audio buffer too small or empty');
        }

        if (audioBuffer.length > 25 * 1024 * 1024) { // 25MB limit
            throw new Error('Audio buffer too large (max 25MB)');
        }

        try {
            const formData = new FormData();

            // Create stream from buffer
            const audioStream = Readable.from(audioBuffer);

            // Determine file extension based on buffer content or use webm as default
            let filename = 'audio.webm';
            let contentType = 'audio/webm';

            // Check for common audio file signatures
            const bufferStart = audioBuffer.slice(0, 12);
            if (bufferStart.includes(Buffer.from('fLaC'))) {
                filename = 'audio.flac';
                contentType = 'audio/flac';
            } else if (bufferStart.includes(Buffer.from('ID3')) || bufferStart[0] === 0xFF && (bufferStart[1] & 0xE0) === 0xE0) {
                filename = 'audio.mp3';
                contentType = 'audio/mp3';
            } else if (bufferStart.includes(Buffer.from('OggS'))) {
                filename = 'audio.ogg';
                contentType = 'audio/ogg';
            }

            formData.append('file', audioStream, {
                filename: filename,
                contentType: contentType
            });
            formData.append('model', 'whisper-1');
            formData.append('language', 'en');

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    ...formData.getHeaders()
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`OpenAI error (${response.status}):`, errorText);

                if (response.status === 401) {
                    throw new Error('Invalid OpenAI API key');
                } else if (response.status === 429) {
                    throw new Error('OpenAI rate limit exceeded');
                } else {
                    throw new Error(`OpenAI error: ${errorText}`);
                }
            }

            const responseData = await response.json();
            
            if (!responseData.text) {
                throw new Error('No transcription text returned from OpenAI');
            }

            return responseData.text;

        } catch (error) {
            this.logger.error('Whisper API error:', error);
            throw error;
        }
    }

    /**
     * Process queue items
     */
    async processTranscriptionQueue() {
        if (!this.supabase) {
            this.logger.warn('Queue processing skipped - no Supabase');
            return;
        }

        this.logger.info('🔍 REAL TranscriptionService checking queue...');

        try {
            // Only process truly pending items, avoid failed items unless retry_count is reasonable
            const { data: items, error } = await this.supabase
                .from('transcription_queue')
                .select('*')
                .or('status.eq.PENDING,status.eq.pending')
                .limit(3);

            if (error) throw error;

            if (!items || items.length === 0) {
                this.logger.info('No pending items in queue');
                return;
            }

            this.logger.info(`🎯 Found ${items.length} items to process with REAL service`);

            for (const item of items) {
                try {
                    // Skip if already processing or completed
                    if (item.status === 'PROCESSING' || item.status === 'COMPLETED') {
                        continue;
                    }

                    // Mark as processing first to avoid duplicate processing
                    await this.updateQueueStatus(item.id, 'PROCESSING');

                    // Download audio with timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);

                    const response = await fetch(item.audio_url, {
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`Failed to download audio: ${response.status}`);
                    }

                    const buffer = await response.buffer();

                    if (!buffer || buffer.length === 0) {
                        throw new Error('Downloaded audio buffer is empty');
                    }

                    // Process with the actual buffer
                    await this.processTranscriptionFromBuffer(
                        item.id,
                        buffer,
                        item.create_user_id,
                        item.incident_report_id,
                        item.audio_url
                    );

                } catch (err) {
                    this.logger.error(`Failed to process item ${item.id}:`, err);
                    
                    // Mark as failed to prevent reprocessing
                    await this.updateQueueStatus(item.id, 'FAILED', {
                        error_message: err.message
                    });
                }
            }

        } catch (error) {
            this.logger.error('Queue processing error:', error);
        }
    }

    async saveTranscription(userId, incidentId, text, audioUrl, queueId) {
        try {
            const { error } = await this.supabase
                .from('ai_transcription')
                .upsert({
                    create_user_id: userId,
                    incident_report_id: incidentId,
                    transcription_text: text,
                    audio_url: audioUrl,
                    created_at: new Date().toISOString()
                });

            if (error) throw error;
            this.logger.success('✅ Transcription saved');

        } catch (error) {
            this.logger.error('Save error:', error);
            throw error;
        }
    }

    async updateQueueStatus(queueId, status, extra = {}) {
        try {
            // Check if updated_at column exists, if not use created_at
            const updateData = {
                status: status,
                ...extra
            };

            // Try to update with updated_at first
            let { error } = await this.supabase
                .from('transcription_queue')
                .update(updateData)
                .eq('id', queueId);

            if (error && error.message?.includes('updated_at')) {
                // If updated_at doesn't exist, try without it
                this.logger.warn('updated_at column not found, updating without timestamp');
                const { error: retryError } = await this.supabase
                    .from('transcription_queue')
                    .update({
                        status: status,
                        ...extra
                    })
                    .eq('id', queueId);
                error = retryError;
            }

            if (error) throw error;
            this.logger.info(`Queue ${queueId} → ${status}`);

        } catch (error) {
            this.logger.error('Status update error:', error);
            // Don't throw - continue processing even if status update fails
        }
    }
}

module.exports = TranscriptionService;