/**
 * Dash-cam Video Uploader Module
 * 
 * A client-side module for uploading dash-cam videos to Supabase Storage
 * with progress tracking, error handling, and metadata extraction.
 * 
 * Features:
 * - Private storage bucket with RLS security
 * - Progress tracking during upload
 * - Video metadata extraction (duration, dimensions)
 * - File size validation (1GB limit)
 * - SHA256 hash generation for integrity
 * - Automatic file naming with UUID
 * - Database logging to incident_evidence table
 * 
 * Dependencies:
 * - Supabase JS client library
 * - Modern browser with File API support
 * 
 * @author Car Crash Lawyer AI System
 * @version 1.0.0
 */

class DashcamUploader {
    constructor(options = {}) {
        this.userId = options.userId;
        this.incidentId = options.incidentId;
        this.onProgress = options.onProgress || (() => {});
        this.onSuccess = options.onSuccess || (() => {});
        this.onError = options.onError || (() => {});

        // Configuration
        this.bucketName = 'dash-cam-upload';
        this.maxFileSize = 1024 * 1024 * 1024; // 1GB
        this.allowedTypes = [
            'video/mp4',
            'video/webm',
            'video/quicktime',
            'video/x-msvideo',
            'video/avi',
            'video/mov'
        ];

        // Initialize Supabase client (assume it's available globally)
        this.supabase = null;
        this.initializeSupabase();
    }

    /**
     * Initialize Supabase client
     */
    async initializeSupabase() {
        // Check if Supabase client is available globally
        if (typeof window !== 'undefined' && window.supabase && window.supabase.createClient) {
            try {
                // Try to get configuration from the app
                const config = await this.getAppConfig();

                if (config.supabaseUrl && config.supabaseAnonKey) {
                    this.supabase = window.supabase.createClient(
                        config.supabaseUrl,
                        config.supabaseAnonKey
                    );
                    console.log('DashcamUploader: Supabase initialized');
                } else {
                    throw new Error('Supabase configuration not available');
                }
            } catch (error) {
                console.error('DashcamUploader: Failed to initialize Supabase', error);
                this.onError(new Error('Failed to initialize storage service'));
            }
        } else {
            console.error('DashcamUploader: Supabase client not available');
            this.onError(new Error('Storage service not available'));
        }
    }

    /**
     * Get app configuration
     */
    async getAppConfig() {
        try {
            // Check for cached config first
            const cached = sessionStorage.getItem('app_config');
            if (cached) {
                return JSON.parse(cached);
            }

            // Fetch from API
            const response = await fetch('/api/config');
            if (!response.ok) {
                throw new Error('Failed to fetch configuration');
            }

            const config = await response.json();
            sessionStorage.setItem('app_config', JSON.stringify(config));
            return config;
        } catch (error) {
            console.error('Failed to get app config:', error);
            throw error;
        }
    }

    /**
     * Validate file before upload
     * @param {File} file - The video file to validate
     * @returns {boolean} - Whether the file is valid
     */
    validateFile(file) {
        // Check file size
        if (file.size > this.maxFileSize) {
            this.onError(new Error(`File size too large. Maximum size is ${Math.round(this.maxFileSize / (1024 * 1024 * 1024))}GB`));
            return false;
        }

        // Check file type
        if (!this.allowedTypes.includes(file.type)) {
            this.onError(new Error(`File type not supported. Allowed types: ${this.allowedTypes.join(', ')}`));
            return false;
        }

        // Check required parameters
        if (!this.userId || !this.incidentId) {
            this.onError(new Error('User ID and Incident ID are required'));
            return false;
        }

        // Check Supabase client
        if (!this.supabase) {
            this.onError(new Error('Storage service not initialized'));
            return false;
        }

        return true;
    }

    /**
     * Extract video metadata
     * @param {File} file - The video file
     * @returns {Promise<Object>} - Video metadata
     */
    async extractVideoMetadata(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';

            video.onloadedmetadata = () => {
                const metadata = {
                    duration_seconds: Math.round(video.duration * 100) / 100, // Round to 2 decimal places
                    width: video.videoWidth,
                    height: video.videoHeight
                };

                // Clean up
                URL.revokeObjectURL(video.src);
                resolve(metadata);
            };

            video.onerror = () => {
                console.warn('Failed to extract video metadata');
                resolve({
                    duration_seconds: null,
                    width: null,
                    height: null
                });
            };

            video.src = URL.createObjectURL(file);
        });
    }

    /**
     * Generate SHA256 hash of file
     * @param {File} file - The file to hash
     * @returns {Promise<string>} - SHA256 hash
     */
    async generateFileHash(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return hashHex;
        } catch (error) {
            console.warn('Failed to generate file hash:', error);
            return null;
        }
    }

    /**
     * Generate unique filename
     * @param {string} originalName - Original filename
     * @returns {string} - Unique filename with UUID
     */
    generateUniqueFilename(originalName) {
        // Generate UUID v4
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });

        // Get file extension
        const extension = originalName.split('.').pop() || 'mp4';

        // Return formatted filename
        return `${uuid}.${extension}`;
    }

    /**
     * Upload video file to Supabase Storage
     * @param {File} file - The video file to upload
     * @returns {Promise<Object>} - Upload result
     */
    async uploadVideo(file) {
        try {
            // Validate file
            if (!this.validateFile(file)) {
                return;
            }

            console.log(`Starting upload for ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

            // Generate unique filename and storage path
            const uniqueFilename = this.generateUniqueFilename(file.name);
            const storagePath = `${this.userId}/${this.incidentId}/${uniqueFilename}`;

            // Extract video metadata
            console.log('Extracting video metadata...');
            const metadata = await this.extractVideoMetadata(file);

            // Generate file hash for integrity
            console.log('Generating file hash...');
            const fileHash = await this.generateFileHash(file);

            // Start upload with progress tracking
            console.log('Starting file upload...');
            this.onProgress(0);

            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .upload(storagePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Upload error:', error);
                throw new Error(`Upload failed: ${error.message}`);
            }

            console.log('File uploaded successfully:', data.path);
            this.onProgress(90); // Upload complete, now saving metadata

            // Save evidence record to database
            const evidenceRecord = await this.saveEvidenceRecord({
                storagePath: data.path,
                originalFilename: file.name,
                mimeType: file.type,
                bytes: file.size,
                durationSeconds: metadata.duration_seconds,
                width: metadata.width,
                height: metadata.height,
                sha256: fileHash
            });

            this.onProgress(100);

            const result = {
                success: true,
                storagePath: data.path,
                evidenceId: evidenceRecord.id,
                metadata: metadata,
                fileSize: file.size,
                fileName: file.name,
                uploadedAt: new Date().toISOString()
            };

            console.log('Upload completed successfully:', result);
            this.onSuccess(result);

            return result;

        } catch (error) {
            console.error('Upload failed:', error);
            this.onError(error);
            throw error;
        }
    }

    /**
     * Save evidence record to database
     * @param {Object} evidenceData - Evidence data to save
     * @returns {Promise<Object>} - Database record
     */
    async saveEvidenceRecord(evidenceData) {
        try {
            const record = {
                user_id: this.userId,
                incident_id: this.incidentId,
                kind: 'video',
                source: 'upload',
                storage_path: evidenceData.storagePath,
                original_filename: evidenceData.originalFilename,
                mime_type: evidenceData.mimeType,
                bytes: evidenceData.bytes,
                duration_seconds: evidenceData.durationSeconds,
                width: evidenceData.width,
                height: evidenceData.height,
                sha256: evidenceData.sha256,
                uploaded_at: new Date().toISOString(),
                created_at: new Date().toISOString()
            };

            const { data, error } = await this.supabase
                .from('incident_evidence')
                .insert([record])
                .select()
                .single();

            if (error) {
                console.error('Database save error:', error);
                throw new Error(`Failed to save evidence record: ${error.message}`);
            }

            console.log('Evidence record saved:', data.id);
            return data;

        } catch (error) {
            console.error('Failed to save evidence record:', error);
            throw error;
        }
    }

    /**
     * Get signed URL for video playback
     * @param {string} storagePath - Path to the video file
     * @param {number} expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
     * @returns {Promise<string>} - Signed URL
     */
    async getSignedUrl(storagePath, expiresIn = 3600) {
        try {
            if (!this.supabase) {
                throw new Error('Storage service not initialized');
            }

            const { data, error } = await this.supabase.storage
                .from(this.bucketName)
                .createSignedUrl(storagePath, expiresIn);

            if (error) {
                throw new Error(`Failed to generate signed URL: ${error.message}`);
            }

            return data.signedUrl;

        } catch (error) {
            console.error('Failed to get signed URL:', error);
            throw error;
        }
    }

    /**
     * Get user's uploaded videos for an incident
     * @param {string} userId - User ID (optional, defaults to instance userId)
     * @param {string} incidentId - Incident ID (optional, defaults to instance incidentId)
     * @returns {Promise<Array>} - Array of evidence records
     */
    async getUploadedVideos(userId = null, incidentId = null) {
        try {
            const searchUserId = userId || this.userId;
            const searchIncidentId = incidentId || this.incidentId;

            if (!searchUserId || !searchIncidentId) {
                throw new Error('User ID and Incident ID are required');
            }

            const { data, error } = await this.supabase
                .from('incident_evidence')
                .select('*')
                .eq('user_id', searchUserId)
                .eq('incident_id', searchIncidentId)
                .eq('kind', 'video')
                .eq('source', 'upload')
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Failed to fetch videos: ${error.message}`);
            }

            return data || [];

        } catch (error) {
            console.error('Failed to get uploaded videos:', error);
            throw error;
        }
    }

    /**
     * Delete a video and its database record
     * @param {string} evidenceId - Evidence record ID
     * @returns {Promise<boolean>} - Success status
     */
    async deleteVideo(evidenceId) {
        try {
            // First get the evidence record to find the storage path
            const { data: evidence, error: fetchError } = await this.supabase
                .from('incident_evidence')
                .select('storage_path, user_id')
                .eq('id', evidenceId)
                .single();

            if (fetchError) {
                throw new Error(`Failed to fetch evidence record: ${fetchError.message}`);
            }

            // Verify user owns this record
            if (evidence.user_id !== this.userId) {
                throw new Error('Unauthorized: You can only delete your own videos');
            }

            // Delete from storage
            const { error: storageError } = await this.supabase.storage
                .from(this.bucketName)
                .remove([evidence.storage_path]);

            if (storageError) {
                console.warn('Failed to delete from storage:', storageError);
                // Continue with database deletion even if storage deletion fails
            }

            // Delete database record
            const { error: dbError } = await this.supabase
                .from('incident_evidence')
                .delete()
                .eq('id', evidenceId);

            if (dbError) {
                throw new Error(`Failed to delete evidence record: ${dbError.message}`);
            }

            console.log('Video deleted successfully:', evidenceId);
            return true;

        } catch (error) {
            console.error('Failed to delete video:', error);
            throw error;
        }
    }

    /**
     * Create the storage bucket if it doesn't exist
     * Note: This should typically be run server-side with admin privileges
     * @returns {Promise<boolean>} - Success status
     */
    static async createBucketIfMissing() {
        console.warn('createBucketIfMissing should be called server-side with admin privileges');
        return false;
    }

    /**
     * Utility function to format file size
     * @param {number} bytes - File size in bytes
     * @returns {string} - Formatted file size
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Utility function to format duration
     * @param {number} seconds - Duration in seconds
     * @returns {string} - Formatted duration (HH:MM:SS or MM:SS)
     */
    static formatDuration(seconds) {
        if (!seconds || seconds <= 0) return '0:00';

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
        }
    }
}

// Export for use in both module and global contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashcamUploader;
} else if (typeof window !== 'undefined') {
    window.DashcamUploader = DashcamUploader;
}