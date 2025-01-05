module.exports = {
  projects: [
    {
      displayName: 'unit',
      testEnvironment: 'jsdom',
      setupFiles: ['<rootDir>/tests/setup.js'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      testMatch: ['**/tests/**/*.test.js', '!**/tests/extension.test.js'],
      transform: {
        '^.+\\.js$': 'babel-jest',
      },
    },
    {
      displayName: 'e2e',
      testEnvironment: 'node',
      testMatch: ['**/tests/extension.test.js'],
      transform: {
        '^.+\\.js$': 'babel-jest',
      },
      testTimeout: 60000,
    },
  ],
};