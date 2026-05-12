/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
   clearMocks: true,
   moduleFileExtensions: ['js', 'ts'],
   testEnvironment: 'node',
   testMatch: ['**/*.test.ts'],
   testPathIgnorePatterns: ['/node_modules/', '/tmp/'],
   transform: {
      '^.+\\.ts$': [
         'ts-jest',
         {
            useESM: true,
            tsconfig: {
               module: 'NodeNext',
               moduleResolution: 'NodeNext',
               target: 'es2022',
               esModuleInterop: true,
               isolatedModules: true,
               types: ['node', 'jest']
            }
         }
      ]
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
