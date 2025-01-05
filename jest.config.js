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
    // Only include E2E tests if RUN_E2E environment variable is set
    ...(process.env.RUN_E2E ? [{
      displayName: 'e2e',
      testEnvironment: 'node',
      testMatch: ['**/tests/extension.test.js'],
      transform: {
        '^.+\\.js$': 'babel-jest',
      },

    }] : []),
  ],
};