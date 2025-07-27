/**
 * Test container setup utilities
 * Provides standardized container configurations for testing
 */

import { createContainer, asFunction, asValue } from 'awilix';
import { Container } from 'typedi';
import { awilixAdapter, typeDIAdapter } from '../../src';

export interface TestService {
  processData: (data: any) => Promise<any>;
  getName: () => string;
}

export class MockTestService implements TestService {
  constructor(private name: string = 'test-service') {}

  async processData(data: any): Promise<any> {
    return { processed: true, originalData: data, timestamp: new Date() };
  }

  getName(): string {
    return this.name;
  }
}

export class MockFailingService implements TestService {
  async processData(data: any): Promise<any> {
    throw new Error('Service processing failed');
  }

  getName(): string {
    return 'failing-service';
  }
}

/**
 * Creates a test Awilix container with standard test services
 */
export function createTestAwilixContainer() {
  const container = createContainer();
  
  container.register({
    testService: asFunction(() => new MockTestService()).singleton(),
    failingService: asFunction(() => new MockFailingService()).singleton(),
    config: asValue({ env: 'test', debug: true }),
    logger: asFunction(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    })).singleton()
  });

  const workflowContainer = awilixAdapter.from(container);
  // Store reference to original container for tests that need it
  (workflowContainer as any).__awilixContainer = container;
  return workflowContainer;
}

/**
 * Creates a test TypeDI container with standard test services
 */
export function createTestTypeDIContainer() {
  // Clear any existing registrations
  Container.reset();
  
  // Register test services
  Container.set('testService', new MockTestService());
  Container.set('failingService', new MockFailingService());
  Container.set('config', { env: 'test', debug: true });
  Container.set('logger', {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  });

  return typeDIAdapter.from(Container);
}

/**
 * Creates a POS module mock for Medusa-style tests
 */
export function createPOSModuleMock() {
  return {
    createBranches: jest.fn().mockImplementation(async (input: any) => ({
      id: `branch-${Date.now()}`,
      name: input.name,
      store_id: input.store_id,
      created_at: new Date()
    })),
    deleteBranch: jest.fn().mockImplementation(async (id: string) => {
      return { deleted: true, id };
    })
  };
}

/**
 * Cleanup function to reset all container states
 */
export function cleanupContainers() {
  Container.reset();
}