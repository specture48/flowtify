import { 
  stepResult, 
  workflowInput, 
  containerValue, 
  deferredValue,
  resolveValue,
  resolveValues,
  isStepResultReference,
  isWorkflowInputReference,
  isContainerValueReference,
  isDeferredValueReference,
  isResolvableValue,
  createPropertyPath,
  containsResolvableValues,
  WorkflowSymbols
} from '../src/core/workflow-api/value-resolution';

describe('Value Resolution Utilities', () => {
  describe('Reference Creators', () => {
    it('should create step result reference', () => {
      const ref = stepResult('stepId', ['prop', 'nested']);
      
      expect(ref.__symbol).toBe(WorkflowSymbols.STEP_RESULT);
      expect(ref.stepId).toBe('stepId');
      expect(ref.propertyPath).toEqual(['prop', 'nested']);
    });

    it('should create workflow input reference', () => {
      const ref = workflowInput(['user', 'name']);
      
      expect(ref.__symbol).toBe(WorkflowSymbols.WORKFLOW_INPUT);
      expect(ref.propertyPath).toEqual(['user', 'name']);
    });

    it('should create container value reference', () => {
      const ref = containerValue('userService', ['getUser']);
      
      expect(ref.__symbol).toBe(WorkflowSymbols.CONTAINER_VALUE);
      expect(ref.serviceKey).toBe('userService');
      expect(ref.propertyPath).toEqual(['getUser']);
    });

    it('should create deferred value reference', () => {
      const resolver = jest.fn().mockResolvedValue('result');
      const ref = deferredValue(resolver, ['dep1']);
      
      expect(ref.__symbol).toBe(WorkflowSymbols.DEFERRED_VALUE);
      expect(ref.resolver).toBe(resolver);
      expect(ref.dependencies).toEqual(['dep1']);
    });
  });

  describe('Type Guards', () => {
    it('should identify step result references', () => {
      const ref = stepResult('stepId');
      const notRef = { someOther: 'object' };
      
      expect(isStepResultReference(ref)).toBe(true);
      expect(isStepResultReference(notRef)).toBe(false);
    });

    it('should identify workflow input references', () => {
      const ref = workflowInput();
      const notRef = { someOther: 'object' };
      
      expect(isWorkflowInputReference(ref)).toBe(true);
      expect(isWorkflowInputReference(notRef)).toBe(false);
    });

    it('should identify container value references', () => {
      const ref = containerValue('service');
      const notRef = { someOther: 'object' };
      
      expect(isContainerValueReference(ref)).toBe(true);
      expect(isContainerValueReference(notRef)).toBe(false);
    });

    it('should identify deferred value references', () => {
      const ref = deferredValue(() => 'value');
      const notRef = { someOther: 'object' };
      
      expect(isDeferredValueReference(ref)).toBe(true);
      expect(isDeferredValueReference(notRef)).toBe(false);
    });

    it('should identify any resolvable value', () => {
      const stepRef = stepResult('stepId');
      const inputRef = workflowInput();
      const containerRef = containerValue('service');
      const deferredRef = deferredValue(() => 'value');
      const notRef = { someOther: 'object' };
      
      expect(isResolvableValue(stepRef)).toBe(true);
      expect(isResolvableValue(inputRef)).toBe(true);
      expect(isResolvableValue(containerRef)).toBe(true);
      expect(isResolvableValue(deferredRef)).toBe(true);
      expect(isResolvableValue(notRef)).toBe(false);
    });
  });

  describe('Property Path Utilities', () => {
    it('should create property path from dot notation', () => {
      const path = createPropertyPath('user.profile.name');
      expect(path).toEqual(['user', 'profile', 'name']);
    });

    it('should handle empty string', () => {
      const path = createPropertyPath('');
      expect(path).toEqual([]);
    });

    it('should handle single property', () => {
      const path = createPropertyPath('user');
      expect(path).toEqual(['user']);
    });
  });

  describe('Detection Utilities', () => {
    it('should detect resolvable values in objects', () => {
      const objWithResolvables = {
        user: stepResult('getUserStep'),
        metadata: workflowInput(['metadata']),
        regular: 'value'
      };
      
      const objWithoutResolvables = {
        regular: 'value',
        number: 42
      };
      
      expect(containsResolvableValues(objWithResolvables)).toBe(true);
      expect(containsResolvableValues(objWithoutResolvables)).toBe(false);
    });

    it('should detect resolvable values in arrays', () => {
      const arrWithResolvables = [
        'regular',
        stepResult('stepId'),
        42
      ];
      
      const arrWithoutResolvables = [
        'regular',
        42,
        { prop: 'value' }
      ];
      
      expect(containsResolvableValues(arrWithResolvables)).toBe(true);
      expect(containsResolvableValues(arrWithoutResolvables)).toBe(false);
    });
  });

  describe('Value Resolution', () => {
    const context = {
      workflowInput: { user: { name: 'John', age: 30 } },
      stepResults: new Map([
        ['getUserStep', { id: 1, name: 'John' }],
        ['getOrderStep', { orderId: 123, total: 100 }]
      ]),
      container: {
        resolve: jest.fn().mockImplementation((key) => {
          if (key === 'userService') {
            return { getCurrentUser: () => ({ id: 1 }) };
          }
          return null;
        })
      }
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should resolve step result reference', async () => {
      const ref = stepResult('getUserStep', ['name']);
      const result = await resolveValue(ref, context);
      
      expect(result).toBe('John');
    });

    it('should resolve workflow input reference', async () => {
      const ref = workflowInput(['user', 'age']);
      const result = await resolveValue(ref, context);
      
      expect(result).toBe(30);
    });

    it('should resolve container value reference', async () => {
      const ref = containerValue('userService', ['getCurrentUser']);
      const result = await resolveValue(ref, context);
      
      expect(typeof result).toBe('function');
      expect(context.container.resolve).toHaveBeenCalledWith('userService');
    });

    it('should resolve deferred value reference', async () => {
      const resolver = jest.fn().mockResolvedValue('deferred result');
      const ref = deferredValue(resolver);
      const result = await resolveValue(ref, context);
      
      expect(result).toBe('deferred result');
      expect(resolver).toHaveBeenCalled();
    });

    it('should return non-resolvable values as-is', async () => {
      const value = { regular: 'object' };
      const result = await resolveValue(value, context);
      
      expect(result).toEqual(value);
    });

    it('should resolve multiple values in array', async () => {
      const values = [
        stepResult('getUserStep', ['name']),
        workflowInput(['user', 'age']),
        'regular value'
      ];
      
      const result = await resolveValues(values, context);
      
      expect(result).toEqual([
        'John',
        30,
        'regular value'
      ]);
    });

    it('should resolve object with nested values', async () => {
      const values = {
        stepData: stepResult('getUserStep', ['name']),
        inputData: workflowInput(['user', 'age']),
        regular: 'value'
      };
      
      const result = await resolveValue(values, context);
      
      expect(result).toEqual({
        stepData: 'John',
        inputData: 30,
        regular: 'value'
      });
    });
  });
});