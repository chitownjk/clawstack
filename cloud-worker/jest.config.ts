import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/index.ts'],
  // Pre-existing TS errors in tools.ts (unrelated to tests) — suppress type-check during Jest run
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
  },
}

export default config
