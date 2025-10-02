// lib/transcriptionService.js - ENHANCED VERSION WITH YOUR REQUESTED FEATURES
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

        // Initialize metrics tracking
        this.metrics = {
            processed: 0,
            failed: 0,
            retried: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0,
            lastProcessedAt: null,
            queueRuns: 0,
            lastQueueRunAt: null,
            currentlyProcessing: 0,
            peakConcurrent: 0
        };

        this.logger.info('✅ TranscriptionService initialized with API key:', this.apiKey.substring(0, 7) + '...');
    }

    /**
     * Main method that index.js calls - ENHANCED WITH RETRY LOGIC
     */
    async processTranscriptionFromBuffer(
        queueId,
        audioBuffer,
        userId,
        incidentId,
        audioUrl,
        retryAttempt = 0
    ) {
        const startTime = Date.now();
        this.logger.info(`🎯 Processing transcription for queue ${queueId} (attempt ${retryAttempt + 1})`);

        // Track concurrent processing
        this.metrics.currentlyProcessing++;
        if (this.metrics.currentlyProcessing > this.metrics.peakConcurrent) {
            this.metrics.peakConcurrent = this.metrics.currentlyProcessing;
        }

        try {
            // Update queue status to processing
            if (this.supabase) {
                await this.updateQueueStatus(queueId, 'PROCESSING', {
                    retry_count: retryAttempt,
                    processing_started_at: new Date().toISOString()
                });
            }

            // Call OpenAI Whisper with retry logic
            const transcriptionText = await this.callWhisperAPIWithRetry(audioBuffer, queueId);

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

                // Update queue status with metrics
                await this.updateQueueStatus(queueId, 'COMPLETED', {
                    processing_time_ms: Date.now() - startTime,
                    transcription_length: transcriptionText.length,
                    retry_count: retryAttempt,
                    completed_at: new Date().toISOString()
                });
            }

            // Store in memory for WebSocket
            if (global.transcriptionStatuses) {
                global.transcriptionStatuses.set(queueId.toString(), {
                    status: 'COMPLETED',
                    transcription: transcriptionText,
                    error: null,
                    create_user_id: userId,
                    processingTime: Date.now() - startTime
                });
            }

            // Update metrics
            this.updateMetrics('success', Date.now() - startTime);

            return transcriptionText;

        } catch (error) {
            this.logger.error(`❌ Transcription failed:`, error);

            // Check if error is retriable
            const isRetriable = this.isRetriableError(error);
            const maxRetries = 3;

            if (isRetriable && retryAttempt < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s
                const backoffDelay = Math.pow(2, retryAttempt) * 1000;
                this.logger.info(`⏳ Retrying in ${backoffDelay}ms (attempt ${retryAttempt + 1}/${maxRetries})`);

                // Update metrics
                this.metrics.retried++;

                // Update status to show retry
                if (this.supabase) {
                    await this.updateQueueStatus(queueId, 'RETRYING', {
                        retry_count: retryAttempt + 1,
                        next_retry_at: new Date(Date.now() + backoffDelay).toISOString(),
                        error_message: error.message
                    });
                }

                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, backoffDelay));

                // Decrement current processing count before recursive call
                this.metrics.currentlyProcessing--;

                // Recursive retry
                return this.processTranscriptionFromBuffer(
                    queueId,
                    audioBuffer,
                    userId,
                    incidentId,
                    audioUrl,
                    retryAttempt + 1
                );
            }

            // Final failure - update status
            if (this.supabase) {
                await this.updateQueueStatus(queueId, 'FAILED', {
                    error_message: error.message,
                    retry_count: retryAttempt,
                    processing_time_ms: Date.now() - startTime,
                    failed_at: new Date().toISOString()
                });
            }

            if (global.transcriptionStatuses) {
                global.transcriptionStatuses.set(queueId.toString(), {
                    status: 'FAILED',
                    error: error.message,
                    create_user_id: userId,
                    retryCount: retryAttempt
                });
            }

            // Update metrics
            this.updateMetrics('failure', Date.now() - startTime);

            throw error;
        } finally {
            // Always decrement concurrent processing count
            this.metrics.currentlyProcessing--;
        }
    }

    /**
     * ENHANCED: Call OpenAI Whisper API with retry logic
     */
    async callWhisperAPIWithRetry(audioBuffer, queueId, maxRetries = 3) {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await this.callWhisperAPI(audioBuffer);
            } catch (error) {
                // If it's the last attempt, throw the error
                if (attempt === maxRetries - 1) throw error;

                // Check if error is retriable
                if (!this.isRetriableError(error)) throw error;

                // Exponential backoff: 1s, 2s, 4s
                const delay = Math.pow(2, attempt) * 1000;
                this.logger.info(`🔄 Whisper API retry ${attempt + 1}/${maxRetries} after ${delay}ms for queue ${queueId}`);

                // Update metrics
                this.metrics.retried++;

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    /**
     * Call OpenAI Whisper API (existing implementation)
     */
    async callWhisperAPI(audioBuffer) {
        this.logger.info('📞 Calling OpenAI Whisper API...');
        this.logger.info(`Buffer size: ${audioBuffer.length} bytes`);

        // Validate buffer size (minimum for meaningful audio)
        if (!audioBuffer || audioBuffer.length < 1000) {
            throw new Error('Audio buffer too small or empty');
        }

        if (audioBuffer.length > 25 * 1024 * 1024) { // 25MB limit
            throw new Error('Audio buffer too large (max 25MB)');
        }

        try {
            const formData = new FormData();

            // Create stream from buffer
            const audioStream = Readable.from(audioBuffer);

            // Determine file extension based on buffer content
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

            // Validate transcription has minimum word count
            const wordCount = responseData.text.trim().split(/\s+/).length;
            if (wordCount < 100) {
                throw new Error(`Transcription too short: ${wordCount} words (minimum 100 words required for substantial content)`);
            }

            return responseData.text;

        } catch (error) {
            this.logger.error('Whisper API error:', error);
            throw error;
        }
    }

    /**
     * ENHANCED: Process queue items with better concurrency control
     */
    async processTranscriptionQueue() {
        if (!this.supabase) {
            this.logger.warn('Queue processing skipped - no Supabase');
            return;
        }

        const queueRunStartTime = Date.now();
        this.metrics.queueRuns++;
        this.metrics.lastQueueRunAt = new Date();

        this.logger.info(`🔍 TranscriptionService queue run #${this.metrics.queueRuns} starting...`);

        try {
            // Get pending items with smart ordering
            const { data: items, error } = await this.supabase
                .from('transcription_queue')
                .select('*')
                .or('status.eq.PENDING,status.eq.pending')
                .is('transcription_id', null)
                .lt('retry_count', 3)  // Don't keep retrying forever
                .order('created_at', { ascending: true })  // FIFO
                .limit(10);  // Get more items for better batching

            if (error) throw error;

            if (!items || items.length === 0) {
                this.logger.info('No pending items in queue');
                this.logQueueRunMetrics(0, 0, Date.now() - queueRunStartTime);
                return;
            }

            this.logger.info(`🎯 Found ${items.length} items to process`);

            // Process items with controlled concurrency
            const concurrentLimit = parseInt(process.env.TRANSCRIPTION_CONCURRENT_LIMIT || '3');
            const results = await this.processConcurrently(items, concurrentLimit);

            // Count results
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            // Log comprehensive metrics
            this.logQueueRunMetrics(successful, failed, Date.now() - queueRunStartTime);

        } catch (error) {
            this.logger.error('Queue processing error:', error);
            this.logQueueRunMetrics(0, 0, Date.now() - queueRunStartTime, error);
        }
    }

    /**
     * NEW: Process items with controlled concurrency
     */
    async processConcurrently(items, limit) {
        const results = [];

        // Process in batches
        for (let i = 0; i < items.length; i += limit) {
            const batch = items.slice(i, i + limit);
            this.logger.info(`📦 Processing batch ${Math.floor(i/limit) + 1} (${batch.length} items)`);

            const batchResults = await Promise.allSettled(
                batch.map(item => this.processQueueItem(item))
            );

            results.push(...batchResults);

            // Add small delay between batches to prevent overwhelming the API
            if (i + limit < items.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        return results;
    }

    /**
     * Process individual queue item
     */
    async processQueueItem(item) {
        const itemStartTime = Date.now();

        try {
            // Skip if already processing or completed
            if (item.status === 'PROCESSING' || item.status === 'COMPLETED') {
                this.logger.info(`Skipping item ${item.id} (status: ${item.status})`);
                return;
            }

            this.logger.info(`📋 Processing queue item ${item.id}`);

            // Mark as processing
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

            this.logger.info(`✅ Downloaded audio for item ${item.id} (${buffer.length} bytes)`);

            // Process with the actual buffer
            const result = await this.processTranscriptionFromBuffer(
                item.id,
                buffer,
                item.create_user_id,
                item.incident_report_id,
                item.audio_url
            );

            this.logger.success(`✅ Item ${item.id} processed in ${Date.now() - itemStartTime}ms`);
            return result;

        } catch (err) {
            this.logger.error(`Failed to process item ${item.id}:`, err);

            // Mark as failed
            await this.updateQueueStatus(item.id, 'FAILED', {
                error_message: err.message,
                processing_time_ms: Date.now() - itemStartTime
            });

            throw err;
        }
    }

    /**
     * Save transcription to database (existing implementation)
     */
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

    /**
     * Update queue status with metrics
     */
    async updateQueueStatus(queueId, status, extra = {}) {
        try {
            const updateData = {
                status: status,
                ...extra
            };

            // Try with updated_at first
            let { error } = await this.supabase
                .from('transcription_queue')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', queueId);

            if (error && error.message?.includes('updated_at')) {
                // Fallback without updated_at
                this.logger.warn('updated_at column not found, updating without timestamp');
                const { error: retryError } = await this.supabase
                    .from('transcription_queue')
                    .update(updateData)
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

    /**
     * NEW: Check if error is retriable
     */
    isRetriableError(error) {
        const retriableMessages = [
            'rate limit',
            'timeout',
            'ECONNRESET',
            'ETIMEDOUT',
            'ENOTFOUND',
            'network',
            '429',  // Rate limit
            '500',  // Server error
            '502',  // Bad gateway
            '503',  // Service unavailable
            '504'   // Gateway timeout
        ];

        const errorMessage = error.message?.toLowerCase() || '';
        return retriableMessages.some(msg => errorMessage.includes(msg.toLowerCase()));
    }

    /**
     * NEW: Update metrics after processing
     */
    updateMetrics(result, processingTime) {
        if (result === 'success') {
            this.metrics.processed++;
        } else {
            this.metrics.failed++;
        }

        this.metrics.totalProcessingTime += processingTime;
        this.metrics.averageProcessingTime = Math.round(
            this.metrics.totalProcessingTime / (this.metrics.processed + this.metrics.failed)
        );
        this.metrics.lastProcessedAt = new Date();
    }

    /**
     * NEW: Log comprehensive queue run metrics
     */
    async logQueueRunMetrics(successful, failed, duration, error = null) {
        const metricsLog = {
            queueRun: this.metrics.queueRuns,
            successful,
            failed,
            duration: `${duration}ms`,
            currentlyProcessing: this.metrics.currentlyProcessing,
            peakConcurrent: this.metrics.peakConcurrent,
            totalProcessed: this.metrics.processed,
            totalFailed: this.metrics.failed,
            totalRetried: this.metrics.retried,
            averageProcessingTime: `${this.metrics.averageProcessingTime}ms`
        };

        if (error) {
            metricsLog.error = error.message;
        }

        this.logger.info('📊 Queue run metrics:', metricsLog);

        // Optionally save to database for monitoring
        if (this.supabase && process.env.ENABLE_METRICS_LOGGING === 'true') {
            try {
                await this.supabase
                    .from('system_metrics')
                    .insert({
                        service: 'transcription_queue',
                        metrics: metricsLog,
                        timestamp: new Date().toISOString()
                    });
            } catch (metricError) {
                this.logger.warn('Failed to save metrics:', metricError);
            }
        }
    }

    /**
     * NEW: Get current metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            uptime: this.metrics.lastProcessedAt 
                ? `${Math.round((Date.now() - new Date(this.metrics.lastProcessedAt).getTime()) / 1000)}s ago`
                : 'Never processed'
        };
    }

    /**
     * NEW: Reset metrics (useful for testing or scheduled resets)
     */
    resetMetrics() {
        this.metrics = {
            processed: 0,
            failed: 0,
            retried: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0,
            lastProcessedAt: null,
            queueRuns: 0,
            lastQueueRunAt: null,
            currentlyProcessing: 0,
            peakConcurrent: 0
        };
        this.logger.info('📊 Metrics reset');
    }
}

// Singleton instance
let serviceInstance = null;

/**
 * Get or create TranscriptionService instance
 */
function getTranscriptionService(supabase = null, logger = console) {
    if (!serviceInstance) {
        serviceInstance = new TranscriptionService(supabase, logger);
    }
    return serviceInstance;
}

module.exports = { TranscriptionService, getTranscriptionService };