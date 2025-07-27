/**
 * Unit tests for WorkflowRegistry
 */

import { WorkflowRegistry, workflowRegistry } from '../../../src/core/medusa-api/workflow-registry';
import { WorkflowDefinition } from '../../../src/core/medusa-api/types';

describe('WorkflowRegistry', () => {
  let registry: WorkflowRegistry;

  beforeEach(() => {
    registry = new WorkflowRegistry();
  });

  describe('register', () => {
    test('should register a workflow definition', () => {
      const workflow: WorkflowDefinition = {
        id: 'test-workflow',
        composer: jest.fn()
      };

      registry.register(workflow);

      expect(registry.has('test-workflow')).toBe(true);
      expect(registry.get('test-workflow')).toEqual(workflow);
    });

    test('should overwrite existing workflow with same id', () => {
      const workflow1: WorkflowDefinition = {
        id: 'test-workflow',
        composer: jest.fn().mockReturnValue('first')
      };

      const workflow2: WorkflowDefinition = {
        id: 'test-workflow',
        composer: jest.fn().mockReturnValue('second')
      };

      registry.register(workflow1);
      registry.register(workflow2);

      expect(registry.get('test-workflow')).toEqual(workflow2);
      expect(registry.get('test-workflow')?.composer({})).toBe('second');
    });
  });

  describe('get', () => {
    test('should return workflow definition by id', () => {
      const workflow: WorkflowDefinition = {
        id: 'get-test',
        composer: jest.fn()
      };

      registry.register(workflow);

      expect(registry.get('get-test')).toEqual(workflow);
    });

    test('should return undefined for non-existent workflow', () => {
      expect(registry.get('non-existent')).toBeUndefined();
    });

    test('should maintain type safety with generics', () => {
      interface CustomInput { customField: string; }
      interface CustomOutput { result: number; }

      const workflow: WorkflowDefinition<CustomInput, CustomOutput> = {
        id: 'typed-workflow',
        composer: jest.fn()
      };

      registry.register(workflow);

      const retrieved = registry.get<CustomInput, CustomOutput>('typed-workflow');
      expect(retrieved).toEqual(workflow);
    });
  });

  describe('has', () => {
    test('should return true for existing workflows', () => {
      const workflow: WorkflowDefinition = {
        id: 'exists',
        composer: jest.fn()
      };

      registry.register(workflow);

      expect(registry.has('exists')).toBe(true);
    });

    test('should return false for non-existent workflows', () => {
      expect(registry.has('does-not-exist')).toBe(false);
    });
  });

  describe('getAll', () => {
    test('should return empty array when no workflows registered', () => {
      expect(registry.getAll()).toEqual([]);
    });

    test('should return all registered workflows', () => {
      const workflow1: WorkflowDefinition = {
        id: 'workflow-1',
        composer: jest.fn()
      };

      const workflow2: WorkflowDefinition = {
        id: 'workflow-2',
        composer: jest.fn()
      };

      registry.register(workflow1);
      registry.register(workflow2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all).toContain(workflow1);
      expect(all).toContain(workflow2);
    });
  });

  describe('clear', () => {
    test('should remove all workflows', () => {
      const workflow: WorkflowDefinition = {
        id: 'to-clear',
        composer: jest.fn()
      };

      registry.register(workflow);
      expect(registry.has('to-clear')).toBe(true);

      registry.clear();
      expect(registry.has('to-clear')).toBe(false);
      expect(registry.getAll()).toEqual([]);
    });
  });

  describe('remove', () => {
    test('should remove specific workflow and return true', () => {
      const workflow: WorkflowDefinition = {
        id: 'to-remove',
        composer: jest.fn()
      };

      registry.register(workflow);
      expect(registry.has('to-remove')).toBe(true);

      const removed = registry.remove('to-remove');
      expect(removed).toBe(true);
      expect(registry.has('to-remove')).toBe(false);
    });

    test('should return false when removing non-existent workflow', () => {
      const removed = registry.remove('does-not-exist');
      expect(removed).toBe(false);
    });

    test('should not affect other workflows when removing one', () => {
      const workflow1: WorkflowDefinition = {
        id: 'keep-me',
        composer: jest.fn()
      };

      const workflow2: WorkflowDefinition = {
        id: 'remove-me',
        composer: jest.fn()
      };

      registry.register(workflow1);
      registry.register(workflow2);

      registry.remove('remove-me');

      expect(registry.has('keep-me')).toBe(true);
      expect(registry.has('remove-me')).toBe(false);
    });
  });

  describe('singleton instance', () => {
    test('should provide a global registry instance', () => {
      expect(workflowRegistry).toBeInstanceOf(WorkflowRegistry);
    });

    test('should maintain state across imports', () => {
      const workflow: WorkflowDefinition = {
        id: 'singleton-test',
        composer: jest.fn()
      };

      workflowRegistry.register(workflow);
      expect(workflowRegistry.has('singleton-test')).toBe(true);

      // Clear for other tests
      workflowRegistry.remove('singleton-test');
    });
  });
});