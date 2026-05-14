const request = require('supertest');
const { setupTestDb, teardownTestDb, getApp } = require('../helpers/memoryMongo');

describe('Integration: user auth (register + login)', () => {
  let app;

  beforeAll(async () => {
    await setupTestDb();
    app = getApp();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('registers a new user and returns 201', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Test User',
        email: 'user@test.floodguard.lk',
        phone: '+94770000001',
        password: 'Str0ng!Pass',
        zone: 'Gampaha',
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/registered/i);
    expect(res.body.token).toBeDefined();
  });

  it('rejects duplicate email on register', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send({
        name: 'Other',
        email: 'user@test.floodguard.lk',
        phone: '+94770000002',
        password: 'OtherPass1!',
        zone: 'Gampaha',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it('logs in with correct credentials and returns user + JWT', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'user@test.floodguard.lk',
        password: 'Str0ng!Pass',
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({
      email: 'user@test.floodguard.lk',
      role: 'user',
    });
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'user@test.floodguard.lk',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  it('returns 404 for unknown email', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({
        email: 'nobody@test.floodguard.lk',
        password: 'AnyPass1!',
      });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });
});
