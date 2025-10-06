
// ========================================
// TRANSCRIPTION SERVICE
// Handles audio transcription with OpenAI Whisper
// ========================================

const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');

class TranscriptionService {
  constructor(openaiApiKey) {
    this.openaiApiKey = openaiApiKey;
    this.baseUrl = 'https://api.openai.com/v1/audio/transcriptions';
  }

  /**
   * Transcribe audio buffer using Whisper API
   * @param {Buffer} audioBuffer 
   * @param {Object} options 
   * @returns {Promise<Object>}
   */
  async transcribeAudio(audioBuffer, options = {}) {
    try {
      const formData = new FormData();
      
      // Create readable stream from buffer
      const audioStream = Readable.from(audioBuffer);
      
      formData.append('file', audioStream, {
        filename: options.filename || 'audio.webm',
        contentType: options.contentType || 'audio/webm',
        knownLength: audioBuffer.length
      });
      
      formData.append('model', options.model || 'whisper-1');
      formData.append('response_format', options.responseFormat || 'json');
      formData.append('language', options.language || 'en');

      const response = await axios.post(this.baseUrl, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: options.timeout || 60000
      });

      return {
        success: true,
        text: response.data.text,
        duration: response.data.duration
      };

    } catch (error) {
      console.error('Transcription error:', error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Check if API key is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.openaiApiKey;
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await axios.get('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        timeout: 5000
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = TranscriptionService;
