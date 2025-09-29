
const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');

describe('API Integration Tests', () => {
  let app;
  let supabase;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001';
    
    // Initialize Supabase for test verification
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Import app after environment is set
    const index = require('../../index');
    app = index.app;
  });

  describe('POST /api/webhook - Main webhook processor', () => {
    const testData = {
      create_user_id: `test_${Date.now()}`,
      full_name: 'Test User',
      email: 'test@example.com',
      phone_number: '07123456789',
      gdpr_consent: true,
      legal_support: 'Yes'
    };

    test('should process user signup successfully', async () => {
      const response = await request(app)
        .post('/api/webhook')
        .set('X-Api-Key', process.env.ZAPIER_SHARED_KEY)
        .send(testData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.create_user_id).toBe(testData.create_user_id);

      // Verify in database
      const { data: user } = await supabase
        .from('user_signup')
        .select('*')
        .eq('create_user_id', testData.create_user_id)
        .single();

      expect(user).toBeTruthy();
      expect(user.email).toBe(testData.email);
    });

    test('should handle missing API key', async () => {
      await request(app)
        .post('/api/webhook')
        .send(testData)
        .expect(401);
    });
  });

  describe('POST /api/generate-legal-narrative', () => {
    test('should generate legal narrative', async () => {
      const narrativeData = {
        create_user_id: 'test_user_001',
        transcription_text: 'I was driving on the M1 when another car hit me from behind.',
        target_length: '350-500 words'
      };

      const response = await request(app)
        .post('/api/generate-legal-narrative')
        .set('X-Api-Key', process.env.ZAPIER_SHARED_KEY)
        .send(narrativeData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.narrative).toBeTruthy();
    });
  });

  describe('GDPR Endpoints', () => {
    const testUserId = 'gdpr_test_user';

    test('GET /api/gdpr/status/:userId should return consent status', async () => {
      const response = await request(app)
        .get(`/api/gdpr/status/${testUserId}`)
        .set('X-Api-Key', process.env.ZAPIER_SHARED_KEY)
        .expect(200);

      expect(response.body).toHaveProperty('has_consent');
    });

    test('POST /api/gdpr/consent should record consent', async () => {
      const response = await request(app)
        .post('/api/gdpr/consent')
        .set('X-Api-Key', process.env.ZAPIER_SHARED_KEY)
        .send({ userId: testUserId })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  afterEach(async () => {
    // Cleanup test data
    if (supabase) {
      await supabase
        .from('user_signup')
        .delete()
        .like('create_user_id', 'test_%');
    }
  });
});
