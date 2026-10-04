/** @type {import('jest').Config} */
module.exports = {
   clearMocks: true,
   moduleFileExtensions: ['js', 'ts'],
   testEnvironment: 'node',
   testMatch: ['**/*.test.ts'],
   testPathIgnorePatterns: ['/node_modules/', '/tmp/', '/build/'],
   transform: {
      '^.+\\.ts$': '<rootDir>/jest.transform.cjs'
   },
   extensionsToTreatAsEsm: ['.ts'],
   moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1'
   },
   verbose: true,
   coverageThreshold: {
      global: {
         branches: 0,
         functions: 14,
         lines: 27,
         statements: 27
      }
   }
}
