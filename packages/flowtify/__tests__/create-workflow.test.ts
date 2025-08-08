import { createWorkflow } from '../src/core/workflow-api/create-workflow';
import { createStep } from '../src/core/workflow-api/create-step';

describe('createWorkflow', () => {
  it('should create a workflow with string name', () => {
    const composer = jest.fn().mockReturnValue({ result: 'test' });
    const workflow = createWorkflow('testWorkflow', composer);
    
    expect(workflow).toBeDefined();
    expect(typeof workflow).toBe('function');
  });

  it('should create a workflow with config object', () => {
    const composer = jest.fn().mockReturnValue({ result: 'test' });
    const config = { name: 'configWorkflow' };
    const workflow = createWorkflow(config, composer);
    
    expect(workflow).toBeDefined();
    expect(typeof workflow).toBe('function');
  });

  it('should return a workflow runner when called', () => {
    const composer = jest.fn().mockReturnValue({ result: 'test' });
    const workflow = createWorkflow('testWorkflow', composer);
    const runner = workflow();
    
    expect(runner).toBeDefined();
    expect(runner.run).toBeDefined();
    expect(typeof runner.run).toBe('function');
  });

  it('should execute simple workflow with direct result', async () => {
    const expectedResult = { message: 'success' };
    const composer = jest.fn().mockReturnValue(expectedResult);
    const workflow = createWorkflow('simpleWorkflow', composer);
    const runner = workflow();
    
    const result = await runner.run({
      input: { test: 'data' },
      container: undefined
    });
    
    expect(result).toEqual({ result: expectedResult });
    expect(composer).toHaveBeenCalledWith({ test: 'data' });
  });

  it('should execute workflow with step calls', async () => {
    const stepFn = jest.fn().mockResolvedValue('step result');
    const step = createStep('testStep', stepFn);
    
    const composer = jest.fn().mockImplementation((input) => {
      return step(input);
    });
    
    const workflow = createWorkflow('workflowWithSteps', composer);
    const runner = workflow();
    
    const result = await runner.run({
      input: { test: 'data' },
      container: undefined
    });
    
    expect(result.result).toBe('step result');
    expect(stepFn).toHaveBeenCalledWith({ test: 'data' }, expect.any(Object));
  });

  it('should handle workflow execution errors', async () => {
    const error = new Error('Test error');
    const composer = jest.fn().mockImplementation(() => {
      throw error;
    });
    
    const workflow = createWorkflow('errorWorkflow', composer);
    const runner = workflow();
    
    await expect(runner.run({
      input: { test: 'data' },
      container: undefined
    })).rejects.toThrow();
  });

  it('should validate input before execution', async () => {
    const composer = jest.fn().mockReturnValue({ result: 'test' });
    const workflow = createWorkflow('validationWorkflow', composer);
    const runner = workflow();
    
    // Test with invalid input (null)
    await expect(runner.run({
      input: null as any,
      container: undefined
    })).rejects.toThrow();
  });

  it('should pass scope to execution context', async () => {
    const composer = jest.fn().mockReturnValue({ result: 'test' });
    const workflow = createWorkflow('scopeWorkflow', composer);
    const runner = workflow();
    
    const result = await runner.run({
      input: { test: 'data' },
      container: undefined
    });
    
    expect(result).toEqual({ result: { result: 'test' } });
    expect(composer).toHaveBeenCalledWith({ test: 'data' });
  });

  it('should throw error for invalid workflow config', () => {
    expect(() => createWorkflow('', null as any)).toThrow();
    expect(() => createWorkflow(null as any, jest.fn())).toThrow();
  });
});