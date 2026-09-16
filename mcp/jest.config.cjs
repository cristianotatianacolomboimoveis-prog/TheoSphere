module.exports = {
  rootDir: '..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/mcp/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['<rootDir>/backend/node_modules/ts-jest', { tsconfig: '<rootDir>/mcp/tsconfig.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  clearMocks: true,
};
