/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.js'],
  maxWorkers: 1,
  testTimeout: 120000,
  forceExit: true,
  /** List each test name under its suite (like `jest --verbose`). */
  verbose: true,
};
