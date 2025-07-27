// jest.config.js

module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/__tests__/**/*.spec.ts"],
    testPathIgnorePatterns: ["/node_modules/", "/dist/"],
    collectCoverage: true,
    collectCoverageFrom: [
      "src/**/*.ts",
      "!src/**/*.d.ts",
      "!src/demo.ts"
    ],
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],
    verbose: true,
    testTimeout: 15000
  };