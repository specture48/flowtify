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
import { 
  isParallelWrapper, 
  isConditionalResult, 
  isTransformWrapper,
  ParallelWrapper,
  ConditionalResult,
  TransformWrapper
} from './composer-utilities';
import { 
  validateWorkflowConfig, 
  validateWorkflowInput, 
  validateExecutionContext, 
  assertValidation 
} from './validation';
import { 
  ErrorUtils, 
  WorkflowExecutionError, 
  StepExecutionError, 
  CompensationError 
} from './errors';

export function createWorkflow<TData = any, TResult = any, THooks = any>(
  nameOrConfig: string | object,
  composer: WorkflowComposer<TData, TResult, THooks>
): ReturnWorkflow<TData, TResult, THooks> {
  
  // Comprehensive input validation
  try {
    const validation = validateWorkflowConfig(nameOrConfig, composer);
    assertValidation(validation, 'Workflow creation');
  } catch (error) {
    throw ErrorUtils.wrapError(error, 'Failed to create workflow');
  }
  
  const workflowId = typeof nameOrConfig === 'string' ? nameOrConfig : (nameOrConfig as any).name;
  
  // Register the workflow definition
  const workflowDefinition: WorkflowDefinition<TData, TResult, THooks> = {
    id: workflowId,
    composer
  };
  
  workflowRegistry.register(workflowDefinition);
  
  // Return the workflow function (Flowtify pattern)
  return function(scope?: any): WorkflowRunner<TData, TResult> {
    return {
      run: async (input: { input: TData } & WorkflowExecutionContext) => {
        // Validate input before execution
        try {
          const inputValidation = validateWorkflowInput(input?.input);
          assertValidation(inputValidation, 'Workflow input validation');
          
          const contextValidation = validateExecutionContext(input);
          assertValidation(contextValidation, 'Execution context validation');
        } catch (error) {
          throw new WorkflowExecutionError(
            ErrorUtils.extractErrorMessage(error),
            workflowId
          );
        }
        
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
  
  // Track if we created the container so we can dispose it
  const shouldDisposeContainer = !executionContext.scope && !executionContext.container;
  
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
          // Handle permanent failure
          if (stepResponse.isPermanentFailure) {
            throw new StepExecutionError(
              `Step marked as permanent failure`,
              stepFn.__stepId,
              workflowId,
              undefined,
              true
            );
          }
          
          // Handle step skip
          if (stepResponse.isSkipped) {
            return null; // Return null for skipped steps
          }
          
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
        // Wrap non-Flowtify errors
        const wrappedError = ErrorUtils.isFlowtifyError(error) 
          ? error 
          : new StepExecutionError(
              ErrorUtils.extractErrorMessage(error),
              stepFn.__stepId,
              workflowId,
              error instanceof Error ? error : undefined
            );
        
        // Don't compensate on permanent failures
        const isPermanent = (wrappedError instanceof StepExecutionError) ? wrappedError.isPermanentFailure : false;
        if (!isPermanent) {
          await compensateSteps(executedSteps, container, executionContext, workflowId);
        }
        
        throw wrappedError;
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
    // Handle workflow execution errors with proper error wrapping
    const workflowError = ErrorUtils.isFlowtifyError(error)
      ? error
      : new WorkflowExecutionError(
          ErrorUtils.extractErrorMessage(error),
          workflowId,
          undefined,
          error instanceof Error ? error : undefined
        );
    
    // Only compensate if it's not a permanent failure
    const shouldCompensate = !(error instanceof StepExecutionError) || !error.isPermanentFailure;
    if (shouldCompensate) {
      await compensateSteps(executedSteps, container, executionContext, workflowId);
    }
    
    throw workflowError;
  } finally {
    // Clear the interceptor map to prevent memory leaks
    originalStepFunctions.clear();
    
    // Clear executed steps array
    executedSteps.length = 0;
    
    // Dispose container if we created it
    if (shouldDisposeContainer && container && typeof container.dispose === 'function') {
      await container.dispose();
    }
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

  // Handle parallel execution
  if (isParallelWrapper(value)) {
    const parallelResults = await Promise.all(
      value.steps.map(step => resolveStepCalls(step, interceptStep))
    );
    return parallelResults;
  }

  // Handle conditional execution
  if (isConditionalResult(value)) {
    const resolvedCondition = await resolveStepCalls(value.condition, interceptStep);
    const shouldExecute = await value.checkFn(resolvedCondition);
    
    if (shouldExecute) {
      const conditionalResults = [];
      for (const step of value.steps) {
        conditionalResults.push(await resolveStepCalls(step, interceptStep));
      }
      return conditionalResults;
    }
    
    // Check elseIf conditions
    if (value.elseConditions && value.elseConditions.length > 0) {
      for (const elseCondition of value.elseConditions) {
        const resolvedElseCondition = await resolveStepCalls(elseCondition.condition, interceptStep);
        const shouldExecuteElse = await elseCondition.checkFn(resolvedElseCondition);
        
        if (shouldExecuteElse) {
          const elseResults = [];
          for (const step of elseCondition.steps) {
            elseResults.push(await resolveStepCalls(step, interceptStep));
          }
          return elseResults;
        }
      }
    }
    
    // Execute else steps if no conditions were met
    if (value.elseSteps && value.elseSteps.length > 0) {
      const elseResults = [];
      for (const step of value.elseSteps) {
        elseResults.push(await resolveStepCalls(step, interceptStep));
      }
      return elseResults;
    }
    
    return null; // No conditions met and no else clause
  }

  // Handle data transformation
  if (isTransformWrapper(value)) {
    const resolvedInput = await resolveStepCalls(value.input, interceptStep);
    return value.transformFn(resolvedInput);
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
  executionContext: WorkflowExecutionContext,
  workflowId?: string
): Promise<void> {
  const compensationErrors: CompensationError[] = [];
  
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
        const compensationError = new CompensationError(
          stepInfo.stepId,
          compensateError instanceof Error ? compensateError : new Error(String(compensateError)),
          workflowId
        );
        
        compensationErrors.push(compensationError);
        console.error(compensationError.getDescription(), compensationError.toJSON());
      }
    }
  }
  
  // If there were compensation errors, we should log them but not throw
  // because the original workflow error is more important
  if (compensationErrors.length > 0) {
    console.warn(`${compensationErrors.length} compensation errors occurred during workflow rollback`);
  }
}