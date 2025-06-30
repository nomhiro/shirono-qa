const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node', // Azure SDK requires node environment
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@azure|@azure/cosmos|@azure/storage-blob|@azure/openai)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  // Azure SDK モック設定
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@azure/cosmos$': '<rootDir>/src/__mocks__/@azure/cosmos.js',
    '^@azure/storage-blob$': '<rootDir>/src/__mocks__/@azure/storage-blob.js',
    '^@azure/openai$': '<rootDir>/src/__mocks__/@azure/openai.js',
  },
}

module.exports = createJestConfig(customJestConfig)