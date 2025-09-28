
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'index.js',
    'lib/**/*.js',
    '!node_modules/**'
  ],
  testMatch: ['**/test/**/*.test.js'],
  verbose: true,
  testTimeout: 10000
};
