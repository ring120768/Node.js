// lib/transcriptionService.js
const FormData = require('form-data');
const fetch = require('node-fetch');
const { Readable } = require('stream');

class TranscriptionService {
    constructor(supabase = null, logger = console) {
        this.apiKey = process.env.OPENAI_API_KEY;
        if (!this.apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required');
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

        try {
            const formData = new FormData();

            // Create stream from buffer
            const audioStream = Readable.from(audioBuffer);

            formData.append('file', audioStream, {
                filename: 'audio.webm',
                contentType: 'audio/webm'
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

        try {
            const { data: items, error } = await this.supabase
                .from('transcription_queue')
                .select('*')
                .eq('status', 'PENDING')
                .limit(5);

            if (error) throw error;

            if (!items || items.length === 0) {
                this.logger.info('No pending items in queue');
                return;
            }

            for (const item of items) {
                try {
                    // Download audio
                    const response = await fetch(item.audio_url);
                    const buffer = await response.buffer();

                    // Process
                    await this.processTranscriptionFromBuffer(
                        item.id,
                        buffer,
                        item.create_user_id,
                        item.incident_report_id,
                        item.audio_url
                    );
                } catch (err) {
                    this.logger.error(`Failed to process item ${item.id}:`, err);
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
            const { error } = await this.supabase
                .from('transcription_queue')
                .update({
                    status: status,
                    updated_at: new Date().toISOString(),
                    ...extra
                })
                .eq('id', queueId);

            if (error) throw error;
            this.logger.info(`Queue ${queueId} → ${status}`);

        } catch (error) {
            this.logger.error('Status update error:', error);
        }
    }
}

module.exports = TranscriptionService;