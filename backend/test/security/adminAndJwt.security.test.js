const request = require('supertest');
const jwt = require('jsonwebtoken');
const { setupTestDb, teardownTestDb, getApp } = require('../helpers/memoryMongo');
const { seedTestAdmin, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD } = require('../helpers/seedTestAdmin');
const User = require('../../src/models/User');

describe('Security: admin JWT, RBAC, and protected routes', () => {
  let app;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    await setupTestDb();
    app = getApp();
    await seedTestAdmin();

    const adminLogin = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: TEST_ADMIN_EMAIL, password: TEST_ADMIN_PASSWORD });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.token;

    await request(app).post('/api/users/register').send({
      name: 'RBAC User',
      email: 'rbac@test.floodguard.lk',
      phone: '+94770000003',
      password: 'UserPass1!',
      zone: 'Gampaha',
    });
    const userLogin = await request(app).post('/api/users/login').send({
      email: 'rbac@test.floodguard.lk',
      password: 'UserPass1!',
    });
    expect(userLogin.status).toBe(200);
    userToken = userLogin.body.token;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('GET /api/ml/status without Authorization returns 401', async () => {
    const res = await request(app).get('/api/ml/status');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/no token/i);
  });

  it('GET /api/ml/status with malformed Authorization returns 401', async () => {
    const res = await request(app)
      .get('/api/ml/status')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });

  it('GET /api/ml/status with valid user JWT returns 403 (not admin)', async () => {
    const res = await request(app)
      .get('/api/ml/status')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/admin privileges/i);
  });

  it('GET /api/ml/status with valid admin JWT returns 200', async () => {
    const res = await request(app)
      .get('/api/ml/status')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/predictions/ without token returns 401', async () => {
    const res = await request(app).post('/api/predictions/').send({ predictions: [] });
    expect(res.status).toBe(401);
  });

  it('POST /api/predictions/ with user token returns 403', async () => {
    const res = await request(app)
      .post('/api/predictions/')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ predictions: [] });
    expect(res.status).toBe(403);
  });

  it('GET /api/admin/users without token returns 401', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('GET /api/admin/users with admin token returns 200', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('rejects JWT signed with wrong secret', async () => {
    const user = await User.findOne({ email: 'rbac@test.floodguard.lk' });
    const badToken = jwt.sign(
      { id: String(user._id), role: 'user' },
      'wrong_secret_not_jest',
      { expiresIn: '1h' },
    );
    const res = await request(app)
      .get('/api/ml/status')
      .set('Authorization', `Bearer ${badToken}`);
    expect(res.status).toBe(401);
  });
});
