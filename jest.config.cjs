const { pathsToModuleNameMapper } = require('ts-jest')
const { compilerOptions } = require('./tsconfig.base.json')

module.exports = {
  preset: 'ts-jest/presets/default-esm'
, resolver: '@blackglory/jest-resolver'
, testEnvironment: 'jsdom'
, testMatch: ['**/__tests__/**/?(*.)+(spec|test).[jt]s?(x)']
, moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/'
  })
  // hack https://github.com/facebook/jest/issues/2070
, modulePathIgnorePatterns: ["<rootDir>/.*/__mocks__"]
}
