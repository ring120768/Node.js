
// ========================================
// AUDIO STORAGE SERVICE
// Handles audio file storage and retrieval
// ========================================

const { createClient } = require('@supabase/supabase-js');

class AudioStorageService {
  constructor(supabaseUrl, supabaseKey, bucketName = 'incident-audio') {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.bucketName = bucketName;
  }

  /**
   * Upload audio buffer to storage
   * @param {Buffer} audioBuffer 
   * @param {string} fileName 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async uploadAudio(audioBuffer, fileName, options = {}) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, audioBuffer, {
          contentType: options.contentType || 'audio/webm',
          upsert: options.upsert || false
        });

      if (error) throw error;

      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);

      return {
        success: true,
        path: data.path,
        publicUrl: publicUrl
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Download audio from storage
   * @param {string} fileName 
   * @returns {Promise<Buffer>}
   */
  async downloadAudio(fileName) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .download(fileName);

      if (error) throw error;

      return Buffer.from(await data.arrayBuffer());

    } catch (error) {
      throw new Error(`Failed to download audio: ${error.message}`);
    }
  }

  /**
   * Get signed URL for audio file
   * @param {string} fileName 
   * @param {number} expiresIn 
   * @returns {Promise<string>}
   */
  async getSignedUrl(fileName, expiresIn = 3600) {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .createSignedUrl(fileName, expiresIn);

      if (error) throw error;

      return data.signedUrl;

    } catch (error) {
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete audio file
   * @param {string} fileName 
   * @returns {Promise<boolean>}
   */
  async deleteAudio(fileName) {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([fileName]);

      return !error;

    } catch (error) {
      return false;
    }
  }
}

module.exports = AudioStorageService;
