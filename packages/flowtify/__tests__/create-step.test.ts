import { createStep } from '../src/core/workflow-api/create-step';

describe('createStep', () => {
  it('should create a step with string name', () => {
    const invokeFn = jest.fn();
    const step = createStep('testStep', invokeFn);
    
    expect(step).toBeDefined();
    expect(step.__stepId).toBe('testStep');
    expect(step.__stepDefinition).toBeDefined();
    expect(step.__stepDefinition.id).toBe('testStep');
    expect(step.__stepDefinition.invoke).toBe(invokeFn);
  });

  it('should create a step with config object', () => {
    const invokeFn = jest.fn();
    const config = { name: 'configStep' };
    const step = createStep(config, invokeFn);
    
    expect(step).toBeDefined();
    expect(step.__stepId).toBe('configStep');
    expect(step.__stepDefinition.id).toBe('configStep');
  });

  it('should create a step with compensate function', () => {
    const invokeFn = jest.fn();
    const compensateFn = jest.fn();
    const step = createStep('stepWithCompensate', invokeFn, compensateFn);
    
    expect(step.__stepDefinition.compensate).toBe(compensateFn);
  });

  it('should generate ULID when config object has no name', () => {
    const invokeFn = jest.fn();
    const step = createStep({}, invokeFn);
    
    expect(step.__stepId).toBeDefined();
    expect(step.__stepId.length).toBe(26); // ULID length
  });

  it('should throw error for invalid input', () => {
    expect(() => createStep('', null as any)).toThrow();
    expect(() => createStep(null as any, jest.fn())).toThrow();
  });

  it('should return step call metadata when invoked', () => {
    const invokeFn = jest.fn();
    const step = createStep('testStep', invokeFn);
    const input = { test: 'data' };
    
    const result = step(input) as any;
    
    expect(result.__stepId).toBe('testStep');
    expect(result.__stepInput).toBe(input);
    expect(result.__isStepCall).toBe(true);
    expect(result.__stepDefinition).toBeDefined();
  });
});