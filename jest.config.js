// jest.config.js
export default {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/test/**/*.spec.ts"],
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov"],
};