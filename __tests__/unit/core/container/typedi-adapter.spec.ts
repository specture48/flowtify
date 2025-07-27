/**
 * Unit tests for TypeDI Container Adapter
 */

import { Container, Token } from 'typedi';
import { typeDIAdapter, TypeDIWorkflowContainer } from '../../../../src/core/container/typedi-adapter';

// Mock TypeDI Container for testing
jest.mock('typedi', () => ({
  Container: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
    remove: jest.fn(),
    reset: jest.fn(),
    of: jest.fn()
  },
  Token: jest.fn().mockImplementation((name: string) => ({ name }))
}));

describe('TypeDIWorkflowContainer', () => {
  let adapter: TypeDIWorkflowContainer;
  let mockContainer: jest.Mocked<typeof Container>;

  beforeEach(() => {
    mockContainer = Container as jest.Mocked<typeof Container>;
    jest.clearAllMocks();
    
    adapter = new TypeDIWorkflowContainer(mockContainer);
  });

  describe('resolve', () => {
    test('should resolve service by string key', () => {
      const mockService = { data: 'test-service' };
      mockContainer.get.mockReturnValue(mockService);

      const result = adapter.resolve('testService');

      expect(mockContainer.get).toHaveBeenCalledWith('testService');
      expect(result).toBe(mockService);
    });

    test('should resolve service by symbol token', () => {
      const mockService = { type: 'symbol-service' };
      const symbolToken = Symbol('test-token');
      mockContainer.get.mockReturnValue(mockService);

      const result = adapter.resolve(symbolToken);

      expect(mockContainer.get).toHaveBeenCalledWith(symbolToken);
      expect(result).toBe(mockService);
    });

    test('should handle TypeDI Token objects', () => {
      const mockService = { type: 'token-service' };
      const token = new Token('test-token');
      mockContainer.get.mockReturnValue(mockService);

      const result = adapter.resolve(token as any);

      expect(mockContainer.get).toHaveBeenCalledWith(token);
      expect(result).toBe(mockService);
    });

    test('should propagate resolution errors', () => {
      const error = new Error('Service not found');
      mockContainer.get.mockImplementation(() => { throw error; });

      expect(() => adapter.resolve('nonExistent'))
        .toThrow('Service not found');
    });
  });

  describe('register', () => {
    test('should register value by string key', () => {
      const service = { value: 'test' };
      
      adapter.register('myService', service);

      expect(mockContainer.set).toHaveBeenCalledWith('myService', service);
    });

    test('should register factory function by string key', () => {
      const factory = () => ({ created: new Date() });
      
      adapter.register('factoryService', factory);

      expect(mockContainer.set).toHaveBeenCalledWith({
        id: 'factoryService',
        factory: expect.any(Function),
        multiple: false,
        global: false
      });
    });

    test('should register by symbol key', () => {
      const symbolKey = Symbol('test-symbol');
      const service = { symbol: true };
      
      adapter.register(symbolKey, service);

      expect(mockContainer.set).toHaveBeenCalledWith(symbolKey, service);
    });

    test('should ignore lifetime options (TypeDI handles this differently)', () => {
      const service = { data: 'test' };
      
      adapter.register('service', service, { lifetime: 'singleton' });

      expect(mockContainer.set).toHaveBeenCalledWith('service', service);
    });

    test('should handle Token objects', () => {
      const token = new Token('test-token');
      const service = { token: true };
      
      adapter.register(token as any, service);

      expect(mockContainer.set).toHaveBeenCalledWith(token, service);
    });
  });

  describe('has', () => {
    test('should check existence by string key', () => {
      mockContainer.has.mockReturnValue(true);

      const result = adapter.has('existingService');

      expect(mockContainer.has).toHaveBeenCalledWith('existingService');
      expect(result).toBe(true);
    });

    test('should check existence by symbol key', () => {
      const symbolKey = Symbol('test-symbol');
      mockContainer.has.mockReturnValue(false);

      const result = adapter.has(symbolKey);

      expect(mockContainer.has).toHaveBeenCalledWith(symbolKey);
      expect(result).toBe(false);
    });

    test('should handle Token objects', () => {
      const token = new Token('test-token');
      mockContainer.has.mockReturnValue(true);

      const result = adapter.has(token as any);

      expect(mockContainer.has).toHaveBeenCalledWith(token);
      expect(result).toBe(true);
    });
  });

  describe('createScope', () => {
    test('should create new container instance with same container', () => {
      const scope = adapter.createScope();

      expect(scope).toBeInstanceOf(TypeDIWorkflowContainer);
      expect(scope).not.toBe(adapter);
    });

    test('should share the same underlying container', () => {
      const scope = adapter.createScope();
      const service = { scoped: true };
      
      scope.register('scopedService', service);
      
      // Should register on the same underlying container
      expect(mockContainer.set).toHaveBeenCalledWith('scopedService', service);
    });
  });

  describe('dispose', () => {
    test('should complete dispose without errors', async () => {
      // TypeDI dispose is a no-op in current implementation
      await expect(adapter.dispose()).resolves.toBeUndefined();
    });

    test('should not call reset method', async () => {
      await adapter.dispose();
      
      // Dispose doesn't actually call reset in the current implementation
      expect(mockContainer.reset).not.toHaveBeenCalled();
    });
  });
});

describe('typeDIAdapter utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should create adapter from TypeDI container', () => {
    const adapter = typeDIAdapter.from(Container);

    expect(adapter).toBeInstanceOf(TypeDIWorkflowContainer);
  });

  test('should work with the global Container', () => {
    const mockService = { global: true };
    (Container.get as jest.Mock).mockReturnValue(mockService);

    const adapter = typeDIAdapter.from(Container);
    const result = adapter.resolve('globalService');

    expect(Container.get).toHaveBeenCalledWith('globalService');
    expect(result).toBe(mockService);
  });

  test('should handle custom container instances', () => {
    const customContainer = {
      get: jest.fn().mockReturnValue({ custom: true }),
      set: jest.fn(),
      has: jest.fn().mockReturnValue(true),
      reset: jest.fn()
    };

    const adapter = typeDIAdapter.from(customContainer as any);
    const result = adapter.resolve('customService');

    expect(customContainer.get).toHaveBeenCalledWith('customService');
    expect(result).toEqual({ custom: true });
  });
});