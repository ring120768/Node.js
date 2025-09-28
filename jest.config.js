
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./test/setup.js'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'index.js',
    'lib/**/*.js',
    '!node_modules/**'
  ],
  testMatch: ['**/test/**/*.test.js'],
  verbose: true,
  testTimeout: 10000,
  forceExit: true,
  detectOpenHandles: false
};
