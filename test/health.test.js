
const request = require('supertest');

describe('Health Check', () => {
  let app;
  
  beforeAll(() => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001';
    
    // Now require the app after environment is set
    const index = require('../index');
    app = index.app;
  });

  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body).toHaveProperty('status', 'healthy');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /status should return HTML', async () => {
    const response = await request(app)
      .get('/status')
      .expect(200)
      .expect('Content-Type', /html/);
  });
});
