import { StepResponse, WorkflowResponse } from '../src/core/workflow-api/response-classes';

describe('StepResponse', () => {
  it('should create successful step response', () => {
    const output = { result: 'success' };
    const response = new StepResponse(output);
    
    expect(response.output).toBe(output);
    expect(response.compensateInput).toBe(output);
    expect(response.isPermanentFailure).toBe(false);
    expect(response.isSkipped).toBe(false);
  });

  it('should create successful step response with custom compensate input', () => {
    const output = { result: 'success' };
    const compensateInput = { id: 123 };
    const response = new StepResponse(output, compensateInput);
    
    expect(response.output).toBe(output);
    expect(response.compensateInput).toBe(compensateInput);
  });

  it('should create skipped step response', () => {
    const response = new StepResponse().skip();
    
    expect(response.isPermanentFailure).toBe(false);
    expect(response.isSkipped).toBe(true);
  });

  it('should create permanent failure response', () => {
    const response = new StepResponse().permanentFailure();
    
    expect(response.isPermanentFailure).toBe(true);
    expect(response.isSkipped).toBe(false);
  });

  it('should chain methods properly', () => {
    const output = { result: 'success' };
    const response = new StepResponse(output).skip();
    
    expect(response.output).toBe(output);
    expect(response.isSkipped).toBe(true);
  });

  it('should handle undefined compensate input', () => {
    const output = { result: 'success' };
    const response = new StepResponse(output, undefined);
    
    expect(response.output).toBe(output);
    expect(response.compensateInput).toBe(output);
  });
});

describe('WorkflowResponse', () => {
  it('should create workflow response', () => {
    const result = { final: 'result' };
    const response = new WorkflowResponse(result);
    
    expect(response.result).toBe(result);
    expect(response.hooks).toBeUndefined();
  });

  it('should create workflow response with hooks', () => {
    const result = { final: 'result' };
    const hooks = { 
      onSuccess: jest.fn(),
      onFailure: jest.fn()
    };
    const response = new WorkflowResponse(result, { hooks });
    
    expect(response.result).toBe(result);
    expect(response.hooks).toBe(hooks);
  });

  it('should create workflow response without options', () => {
    const result = { final: 'result' };
    const response = new WorkflowResponse(result);
    
    expect(response.result).toBe(result);
    expect(response.hooks).toBeUndefined();
  });

  it('should create workflow response with empty options', () => {
    const result = { final: 'result' };
    const response = new WorkflowResponse(result, {});
    
    expect(response.result).toBe(result);
    expect(response.hooks).toBeUndefined();
  });
});