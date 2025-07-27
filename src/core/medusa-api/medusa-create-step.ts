import { ulid } from 'ulid';
import { 
  InvokeFn, 
  CompensateFn, 
  StepFunction, 
  WorkflowStepDefinition 
} from './types';

export function createStep<
  TInvokeInput = any,
  TInvokeResultOutput = any,
  TInvokeResultCompensateInput = TInvokeResultOutput
>(
  nameOrConfig: string | object,
  invokeFn: InvokeFn<TInvokeInput, TInvokeResultOutput, TInvokeResultCompensateInput>,
  compensateFn?: CompensateFn<TInvokeResultCompensateInput>
): StepFunction<TInvokeInput, TInvokeResultOutput> {
  
  const stepId = typeof nameOrConfig === 'string' ? nameOrConfig : (nameOrConfig as any).name || ulid();
  
  const stepDefinition: WorkflowStepDefinition<TInvokeInput, TInvokeResultOutput, TInvokeResultCompensateInput> = {
    id: stepId,
    invoke: invokeFn,
    compensate: compensateFn
  };

  // Create the step function that will be called within workflows
  const stepFunction = function(input: TInvokeInput): TInvokeResultOutput {
    // When called in a workflow context, this will be replaced by the workflow engine
    // For now, just return a placeholder that includes the step metadata
    return {
      __stepId: stepId,
      __stepInput: input,
      __stepDefinition: stepDefinition,
      __isStepCall: true
    } as any;
  } as StepFunction<TInvokeInput, TInvokeResultOutput>;

  // Attach metadata for the workflow engine
  stepFunction.__stepId = stepId;
  stepFunction.__stepDefinition = stepDefinition;

  return stepFunction;
}