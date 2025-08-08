import 'reflect-metadata';

// Setup for Jest tests
global.console = {
  ...console,
  // Optionally suppress logs during tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};