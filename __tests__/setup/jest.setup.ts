/**
 * Jest setup configuration for flowtify test suite
 * This file is run before any tests to configure the testing environment
 */

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn during tests unless VERBOSE_TESTS is set
  if (!process.env.VERBOSE_TESTS) {
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Custom matchers
expect.extend({
  toHaveBeenCalledWithError(received: jest.Mock, expectedError: any) {
    const calls = received.mock.calls;
    const pass = calls.some((call: any[]) => 
      call.some((arg: any) => 
        arg instanceof Error && arg.message === expectedError.message
      )
    );

    return {
      message: () => 
        pass 
          ? `Expected mock not to have been called with error "${expectedError.message}"`
          : `Expected mock to have been called with error "${expectedError.message}"`,
      pass,
    };
  },
});