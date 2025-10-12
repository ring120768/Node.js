const OpenAI = require('openai');
const FormData = require('form-data');
const fetch = require('node-fetch');

class TranscriptionService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async transcribeAudio(audioBlob, options = {}) {
        try {
            console.log('🎯 Starting Whisper transcription...');

            // Convert Blob to File-like object for OpenAI
            const audioFile = new File([audioBlob], 'audio.webm', { 
                type: 'audio/webm' 
            });

            const transcription = await this.openai.audio.transcriptions.create({
                file: audioFile,
                model: "whisper-1",
                language: options.language || "en",
                response_format: "verbose_json",
                prompt: options.prompt || "This is a car accident incident report recording."
            });

            console.log('✅ Transcription completed');

            return {
                text: transcription.text,
                language: transcription.language,
                duration: transcription.duration,
                segments: transcription.segments || [],
                confidence: this.calculateConfidence(transcription.segments)
            };

        } catch (error) {
            console.error('❌ Transcription failed:', error);
            throw error;
        }
    }

    async transcribeFromBuffer(buffer, mimeType = 'audio/webm') {
        try {
            console.log('🎯 Transcribing from buffer...');

            // Create form data
            const formData = new FormData();
            formData.append('file', buffer, {
                filename: 'audio.webm',
                contentType: mimeType
            });
            formData.append('model', 'whisper-1');
            formData.append('response_format', 'verbose_json');

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...formData.getHeaders()
                },
                body: formData
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI API error: ${error}`);
            }

            const transcription = await response.json();

            return {
                text: transcription.text,
                language: transcription.language || 'en',
                duration: transcription.duration,
                segments: transcription.segments || [],
                words: transcription.words || []
            };

        } catch (error) {
            console.error('❌ Buffer transcription failed:', error);
            throw error;
        }
    }

    calculateConfidence(segments) {
        if (!segments || segments.length === 0) return 0.95;

        const avgConfidence = segments.reduce((acc, seg) => {
            return acc + (seg.no_speech_prob ? (1 - seg.no_speech_prob) : 0.95);
        }, 0) / segments.length;

        return avgConfidence;
    }
}

module.exports = TranscriptionService;