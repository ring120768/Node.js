const { createClient } = require('@supabase/supabase-js');
const FormData = require('form-data');
const fetch = require('node-fetch');

class AudioStorageManager {
    constructor() {
        this.supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );
        this.bucketName = 'incident-audio';
    }

    async uploadAudio(audioBuffer, userId, metadata = {}) {
        try {
            // Generate unique file path
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(7);
            const fileName = `recording_${timestamp}_${randomId}.webm`;
            const filePath = `${userId}/${fileName}`;

            console.log(`📤 Uploading audio: ${filePath}`);

            // Upload to Supabase Storage
            const { data: storageData, error: storageError } = await this.supabase
                .storage
                .from(this.bucketName)
                .upload(filePath, audioBuffer, {
                    contentType: metadata.mimeType || 'audio/webm',
                    upsert: false
                });

            if (storageError) {
                console.error('Storage upload error:', storageError);
                throw storageError;
            }

            // Create database record for tracking
            const { data: dbData, error: dbError } = await this.supabase
                .from('audio_files')
                .insert({
                    user_id: userId,
                    storage_path: filePath,
                    bucket_name: this.bucketName,
                    file_size: audioBuffer.length,
                    mime_type: metadata.mimeType || 'audio/webm',
                    status: 'uploaded',
                    metadata: metadata
                })
                .select()
                .single();

            if (dbError) {
                console.log('Note: audio_files table may not exist yet, continuing...');
            }

            console.log(`✅ Audio uploaded successfully: ${filePath}`);

            return {
                success: true,
                filePath,
                storageData,
                audioFileId: dbData?.id
            };

        } catch (error) {
            console.error('❌ Audio upload failed:', error);
            throw error;
        }
    }

    async getAudioForTranscription(filePath) {
        try {
            // Download the audio file from storage
            const { data, error } = await this.supabase
                .storage
                .from(this.bucketName)
                .download(filePath);

            if (error) throw error;

            console.log(`✅ Retrieved audio file: ${filePath}`);
            return data;

        } catch (error) {
            console.error('❌ Failed to retrieve audio:', error);
            throw error;
        }
    }

    async getSignedUrl(filePath, expiresIn = 3600) {
        const { data, error } = await this.supabase
            .storage
            .from(this.bucketName)
            .createSignedUrl(filePath, expiresIn);

        if (error) throw error;
        return data.signedUrl;
    }
}

module.exports = AudioStorageManager;