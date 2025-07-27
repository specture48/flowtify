/**
 * Unit tests for StepResponse and WorkflowResponse classes
 */

import { StepResponse, WorkflowResponse } from '../../../src/core/medusa-api/response-classes';

describe('StepResponse', () => {
  test('should create response with output only', () => {
    const response = new StepResponse({ data: 'test' });
    
    expect(response.output).toEqual({ data: 'test' });
    expect(response.compensateInput).toEqual({ data: 'test' });
  });

  test('should create response with custom compensate input', () => {
    const output = { id: 123, name: 'test' };
    const compensateInput = { id: 123 };
    const response = new StepResponse(output, compensateInput);
    
    expect(response.output).toEqual(output);
    expect(response.compensateInput).toEqual(compensateInput);
  });

  test('should handle undefined output', () => {
    const response = new StepResponse();
    
    expect(response.output).toBeUndefined();
    expect(response.compensateInput).toBeUndefined();
  });

  test('should handle null values correctly', () => {
    const response = new StepResponse(null, null);
    
    expect(response.output).toBeNull();
    expect(response.compensateInput).toBeNull();
  });

  test('should default compensateInput to output when not provided', () => {
    const output = { complex: { nested: { data: 'value' } } };
    const response = new StepResponse(output);
    
    expect(response.compensateInput).toEqual(output);
    expect(response.compensateInput).toBe(output); // Should be same reference
  });
});

describe('WorkflowResponse', () => {
  test('should create response with result', () => {
    const result = { result: 'success', data: [1, 2, 3] };
    const response = new WorkflowResponse(result);
    
    expect(response.result).toEqual(result);
  });

  test('should handle undefined result with default', () => {
    const response = new WorkflowResponse(undefined);
    
    expect(response.result).toBeUndefined();
  });

  test('should handle complex nested objects', () => {
    const complexResult = {
      user: { id: 1, profile: { name: 'John', settings: { theme: 'dark' } } },
      orders: [{ id: 'a', items: [{ name: 'item1' }] }],
      metadata: { timestamp: new Date(), version: '1.0' }
    };
    
    const response = new WorkflowResponse(complexResult);
    
    expect(response.result).toEqual(complexResult);
  });

  test('should store result reference correctly', () => {
    const result = { count: 5 };
    const response = new WorkflowResponse(result);
    
    // Should store the same reference (this is expected behavior)
    expect(response.result).toBe(result);
    
    // Modifying original object will affect response (expected behavior)
    result.count = 10;
    expect(response.result.count).toBe(10);
  });

  test('should handle hooks in options', () => {
    const result = { data: 'test' };
    const hooks = { beforeStep: jest.fn(), afterStep: jest.fn() };
    const response = new WorkflowResponse(result, { hooks });
    
    expect(response.result).toEqual(result);
    expect(response.hooks).toEqual(hooks);
  });
});