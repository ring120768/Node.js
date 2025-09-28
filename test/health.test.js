
const request = require('supertest');
const { app } = require('../index');

describe('Health Check', () => {
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
