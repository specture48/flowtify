/**
 * Unit tests for Awilix Container Adapter
 */

import { createContainer, asFunction, asValue, Lifetime } from 'awilix';
import { awilixAdapter, AwilixWorkflowContainer } from '../../../../src/core/container/awilix-adapter';

describe('AwilixWorkflowContainer', () => {
  let awilixContainer: any;
  let adapter: AwilixWorkflowContainer;

  beforeEach(() => {
    awilixContainer = createContainer();
    adapter = new AwilixWorkflowContainer(awilixContainer);
  });

  describe('resolve', () => {
    test('should resolve registered services', () => {
      const testService = { getName: () => 'test-service' };
      awilixContainer.register({
        testService: asValue(testService)
      });

      const resolved = adapter.resolve('testService');
      expect(resolved).toBe(testService);
    });

    test('should resolve factory functions', () => {
      awilixContainer.register({
        dynamicService: asFunction(() => ({ 
          timestamp: Date.now(),
          type: 'dynamic' 
        }))
      });

      const resolved = adapter.resolve('dynamicService');
      expect(resolved).toHaveProperty('timestamp');
      expect(resolved.type).toBe('dynamic');
    });

    test('should throw error when resolving non-existent service', () => {
      expect(() => adapter.resolve('nonExistent'))
        .toThrow();
    });

    test('should handle symbol keys', () => {
      const symbolKey = Symbol('test-symbol');
      const service = { value: 'symbol-service' };
      
      awilixContainer.register({
        [symbolKey]: asValue(service)
      });

      const resolved = adapter.resolve(symbolKey);
      expect(resolved).toBe(service);
    });
  });

  describe('register', () => {
    test('should register value services', () => {
      const service = { data: 'test' };
      adapter.register('myService', service);

      expect(adapter.resolve('myService')).toBe(service);
    });

    test('should register factory functions', () => {
      const factory = () => ({ created: new Date() });
      adapter.register('factoryService', factory);

      const resolved = adapter.resolve('factoryService');
      expect(resolved).toHaveProperty('created');
    });

    test('should register with lifetime options', () => {
      let callCount = 0;
      const factory = () => ({ call: ++callCount });

      adapter.register('singletonService', factory, { 
        lifetime: 'singleton' 
      });

      const first = adapter.resolve('singletonService');
      const second = adapter.resolve('singletonService');

      expect(first).toBe(second);
      expect(first.call).toBe(1);
    });

    test('should register with scoped lifetime', () => {
      let callCount = 0;
      const factory = () => ({ call: ++callCount });

      adapter.register('scopedService', factory, { 
        lifetime: 'scoped' 
      });

      // In same scope, should be same instance
      const first = adapter.resolve('scopedService');
      const second = adapter.resolve('scopedService');
      expect(first).toBe(second);
    });

    test('should handle symbol keys in registration', () => {
      const symbolKey = Symbol('register-test');
      const service = { value: 'registered-symbol' };

      adapter.register(symbolKey, service);
      expect(adapter.resolve(symbolKey)).toBe(service);
    });
  });

  describe('has', () => {
    test('should return true for registered services', () => {
      adapter.register('existingService', { data: 'exists' });
      expect(adapter.has('existingService')).toBe(true);
    });

    test('should return false for non-existent services', () => {
      expect(adapter.has('nonExistentService')).toBe(false);
    });

    test('should work with symbol keys', () => {
      const symbolKey = Symbol('has-test');
      adapter.register(symbolKey, { value: 'test' });
      
      expect(adapter.has(symbolKey)).toBe(true);
    });
  });

  describe('createScope', () => {
    test('should create a new scoped container', () => {
      const scope = adapter.createScope();
      expect(scope).toBeInstanceOf(AwilixWorkflowContainer);
      expect(scope).not.toBe(adapter);
    });

    test('should inherit parent registrations in scope', () => {
      adapter.register('parentService', { type: 'parent' });
      
      const scope = adapter.createScope();
      expect(scope!.resolve('parentService')).toEqual({ type: 'parent' });
    });

    test('should isolate scoped registrations', () => {
      let callCount = 0;
      adapter.register('scopedService', () => ({ call: ++callCount }), {
        lifetime: 'scoped'
      });

      const scope1 = adapter.createScope();
      const scope2 = adapter.createScope();

      const instance1a = scope1!.resolve('scopedService');
      const instance1b = scope1!.resolve('scopedService');
      const instance2 = scope2!.resolve('scopedService');

      // Same instance within scope
      expect(instance1a).toBe(instance1b);
      // Different instances across scopes
      expect(instance1a).not.toBe(instance2);
    });
  });

  describe('dispose', () => {
    test('should dispose container resources', async () => {
      const mockDispose = jest.fn();
      awilixContainer.dispose = mockDispose;

      await adapter.dispose();
      expect(mockDispose).toHaveBeenCalled();
    });

    test('should handle containers without dispose method', async () => {
      delete awilixContainer.dispose;
      
      // Should not throw
      await expect(adapter.dispose()).resolves.toBeUndefined();
    });
  });
});

describe('awilixAdapter utility', () => {
  test('should create adapter from awilix container', () => {
    const container = createContainer();
    const adapter = awilixAdapter.from(container);

    expect(adapter).toBeInstanceOf(AwilixWorkflowContainer);
  });

  test('should work with pre-configured containers', () => {
    const container = createContainer();
    container.register({
      preConfiguredService: asValue({ configured: true })
    });

    const adapter = awilixAdapter.from(container);
    const service = adapter.resolve('preConfiguredService');

    expect(service.configured).toBe(true);
  });
});