const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Start in-memory MongoDB and connect Mongoose. Sets JWT_SECRET for auth tests.
 */
async function setupTestDb() {
  process.env.JWT_SECRET = process.env.JWT_SECRET_TEST || 'jest_jwt_secret_fixed';
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGO_URI);
}

async function teardownTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

/** Load Express app after MONGO_URI is set (avoids accidental prod connects). */
function getApp() {
  // eslint-disable-next-line global-require
  return require('../../src/app');
}

module.exports = { setupTestDb, teardownTestDb, getApp };
