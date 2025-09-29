
const request = require('supertest');
const { createClient } = require('@supabase/supabase-js');

describe('Production Environment Tests', () => {
  let app;
  let supabase;

  beforeAll(async () => {
    // Use actual production port
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3000';
    
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const index = require('../index');
    app = index.app;
  });

  test('Health check should return healthy status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body.services).toBeTruthy();
    expect(response.body.services.supabase).toBe(true);
  });

  test('Main webhook endpoint should process signup', async () => {
    const testUser = {
      create_user_id: `prod_test_${Date.now()}`,
      full_name: 'Production Test User',
      email: `test-${Date.now()}@example.com`,
      phone_number: '07123456789',
      gdpr_consent: true,
      legal_support: 'Yes'
    };

    const response = await request(app)
      .post('/api/webhook')
      .set('X-Api-Key', process.env.ZAPIER_SHARED_KEY)
      .send(testUser)
      .expect(200);

    expect(response.body.success).toBe(true);

    // Verify in production database
    const { data: savedUser } = await supabase
      .from('user_signup')
      .select('*')
      .eq('create_user_id', testUser.create_user_id)
      .single();

    expect(savedUser).toBeTruthy();
    expect(savedUser.gdpr_consent).toBe(true);

    // Cleanup
    await supabase
      .from('user_signup')
      .delete()
      .eq('create_user_id', testUser.create_user_id);
  });

  test('GDPR compliance should be active', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.services.gdpr_compliance.module).toBe('active');
    expect(response.body.compliance.uk_gdpr).toBe('compliant');
  });
});
