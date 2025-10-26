const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/tests/**/*.test.ts'],
  moduleNameMapper: {
    '^@monorepo/(.*)$': '<rootDir>/packages/$1/src',
  },
};

export default config;
