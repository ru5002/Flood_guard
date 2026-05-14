const request = require('supertest');
const { setupTestDb, teardownTestDb, getApp } = require('../helpers/memoryMongo');

describe('Integration: public prediction routes', () => {
  let app;

  beforeAll(async () => {
    await setupTestDb();
    app = getApp();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('GET /api/predictions/latest returns JSON with predictions array', async () => {
    const res = await request(app).get('/api/predictions/latest');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.predictions)).toBe(true);
  });
});
