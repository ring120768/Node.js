
const request = require('supertest');
const fs = require('fs');
const path = require('path');

describe('Transcription Integration Tests', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001';
    
    const index = require('../../index');
    app = index.app;
  });

  describe('POST /api/whisper/transcribe', () => {
    test('should handle audio transcription', async () => {
      // Create a minimal test audio file buffer
      const testAudioBuffer = Buffer.from('fake-audio-data');

      const response = await request(app)
        .post('/api/whisper/transcribe')
        .set('X-Api-Key', process.env.ZAPIER_SHARED_KEY)
        .attach('audio', testAudioBuffer, 'test-audio.webm')
        .field('create_user_id', 'test_transcription_user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.queueId).toBeTruthy();
    });

    test('should reject request without audio file', async () => {
      await request(app)
        .post('/api/whisper/transcribe')
        .set('X-Api-Key', process.env.ZAPIER_SHARED_KEY)
        .field('create_user_id', 'test_user')
        .expect(400);
    });

    test('should reject request without user ID', async () => {
      const testAudioBuffer = Buffer.from('fake-audio-data');

      await request(app)
        .post('/api/whisper/transcribe')
        .set('X-Api-Key', process.env.ZAPIER_SHARED_KEY)
        .attach('audio', testAudioBuffer, 'test-audio.webm')
        .expect(400);
    });
  });
});
