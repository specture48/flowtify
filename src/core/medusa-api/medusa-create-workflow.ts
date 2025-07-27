import { 
  WorkflowComposer, 
  WorkflowDefinition, 
  ReturnWorkflow,
  WorkflowRunner,
  WorkflowExecutionContext,
  StepFunction,
  StepExecutionContext
} from './types';
import { StepResponse, WorkflowResponse } from './response-classes';
import { WorkflowContainer, awilixAdapter } from '../container';
import { workflowRegistry } from './workflow-registry';

export function createWorkflow<TData = any, TResult = any, THooks = any>(
  nameOrConfig: string | object,
  composer: WorkflowComposer<TData, TResult, THooks>
): ReturnWorkflow<TData, TResult, THooks> {
  
  const workflowId = typeof nameOrConfig === 'string' ? nameOrConfig : (nameOrConfig as any).name;
  
  // Validate composer function constraints (like Medusa)
  if (typeof composer !== 'function') {
    throw new Error('Workflow composer must be a function');
  }
  
  // Register the workflow definition
  const workflowDefinition: WorkflowDefinition<TData, TResult, THooks> = {
    id: workflowId,
    composer
  };
  
  workflowRegistry.register(workflowDefinition);
  
  // Return the workflow function (Medusa pattern)
  return function(scope?: any): WorkflowRunner<TData, TResult> {
    return {
      run: async (input: { input: TData } & WorkflowExecutionContext) => {
        const contextWithScope = scope 
          ? { ...input, scope }
          : input;
          
        return await executeWorkflow(workflowId, composer, contextWithScope.input, contextWithScope);
      }
    };
  };
}

async function executeWorkflow<TData, TResult, THooks>(
  workflowId: string,
  composer: WorkflowComposer<TData, TResult, THooks>,
  input: TData,
  executionContext: WorkflowExecutionContext
): Promise<{ result: TResult }> {
  const container = executionContext.scope || executionContext.container || awilixAdapter.create();
  
  // Track executed steps for compensation
  const executedSteps: Array<{
    stepId: string;
    stepDefinition: any;
    output: any;
    compensateInput: any;
  }> = [];

  // Create step interceptor function
  const originalStepFunctions = new Map<StepFunction, any>();
  
  // Override global step functions temporarily to intercept calls
  const interceptStep = (stepFn: StepFunction) => {
    if (originalStepFunctions.has(stepFn)) {
      return originalStepFunctions.get(stepFn);
    }

    const interceptor = async (stepInput: any) => {
      const stepContext: StepExecutionContext = {
        container,
        metadata: executionContext.metadata
      };

      try {
        const stepResponse = await stepFn.__stepDefinition.invoke(stepInput, stepContext);
        
        let output, compensateInput;
        if (stepResponse instanceof StepResponse) {
          output = stepResponse.output;
          compensateInput = stepResponse.compensateInput;
        } else {
          output = stepResponse;
          compensateInput = stepResponse;
        }

        // Track for compensation
        executedSteps.push({
          stepId: stepFn.__stepId,
          stepDefinition: stepFn.__stepDefinition,
          output,
          compensateInput
        });

        return output;
      } catch (error) {
        // Compensate on error
        await compensateSteps(executedSteps, container, executionContext);
        throw error;
      }
    };

    originalStepFunctions.set(stepFn, interceptor);
    return interceptor;
  };

  try {
    // Execute composer with step interception
    const result = await executeComposerWithInterception(composer, input, interceptStep);
    
    if (result instanceof WorkflowResponse) {
      return { result: result.result };
    }
    
    return { result };
  } catch (error) {
    await compensateSteps(executedSteps, container, executionContext);
    throw error;
  }
}

async function executeComposerWithInterception<TData, TResult, THooks>(
  composer: WorkflowComposer<TData, TResult, THooks>,
  input: TData,
  interceptStep: (stepFn: StepFunction) => any
): Promise<TResult> {
  // Execute the composer function to get the workflow structure
  const composerResult = composer(input);
  
  // Now we need to resolve any step calls in the result
  const resolvedResult = await resolveStepCalls(composerResult, interceptStep);
  
  return resolvedResult;
}

async function resolveStepCalls(value: any, interceptStep: (stepFn: StepFunction) => any): Promise<any> {
  if (!value || typeof value !== 'object') {
    return value;
  }

  // Check if this is a step call placeholder
  if (value.__isStepCall) {
    // This is a step call - execute it
    const stepDefinition = value.__stepDefinition;
    let stepInput = value.__stepInput;
    
    // First, resolve any step calls in the input
    stepInput = await resolveStepCalls(stepInput, interceptStep);
    
    // Find the step function to intercept
    const mockStepFn = {
      __stepId: value.__stepId,
      __stepDefinition: stepDefinition
    } as StepFunction;
    
    const interceptor = interceptStep(mockStepFn);
    return await interceptor(stepInput);
  }

  // Check if this is a WorkflowResponse
  if (value instanceof WorkflowResponse) {
    const resolvedResult = await resolveStepCalls(value.result, interceptStep);
    return new WorkflowResponse(resolvedResult, { hooks: value.hooks });
  }

  // Handle arrays
  if (Array.isArray(value)) {
    const resolvedArray = [];
    for (const item of value) {
      resolvedArray.push(await resolveStepCalls(item, interceptStep));
    }
    return resolvedArray;
  }

  // Handle objects
  const resolvedObject: any = {};
  for (const [key, val] of Object.entries(value)) {
    resolvedObject[key] = await resolveStepCalls(val, interceptStep);
  }
  
  return resolvedObject;
}

async function compensateSteps(
  executedSteps: Array<{
    stepId: string;
    stepDefinition: any;
    output: any;
    compensateInput: any;
  }>,
  container: WorkflowContainer,
  executionContext: WorkflowExecutionContext
): Promise<void> {
  // Compensate in reverse order
  for (const stepInfo of executedSteps.reverse()) {
    if (stepInfo.stepDefinition.compensate) {
      try {
        const stepContext: StepExecutionContext = {
          container,
          metadata: executionContext.metadata
        };
        
        await stepInfo.stepDefinition.compensate(stepInfo.compensateInput, stepContext);
      } catch (compensateError) {
        console.error(`Compensation failed for step ${stepInfo.stepId}:`, compensateError);
      }
    }
  }
}