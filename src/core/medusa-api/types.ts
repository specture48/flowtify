import { WorkflowContainer } from '../container';
import { StepResponse, WorkflowResponse } from './response-classes';

export interface StepExecutionContext {
  container: WorkflowContainer;
  metadata?: Record<string, any>;
}

export type InvokeFn<TInput = any, TOutput = any, TCompensateInput = any> = (
  input: TInput,
  context: StepExecutionContext
) => Promise<StepResponse<TOutput, TCompensateInput>>;

export type CompensateFn<TCompensateInput = any> = (
  compensateInput: TCompensateInput,
  context: StepExecutionContext
) => Promise<void>;

export interface StepFunction<TInput = any, TOutput = any> {
  (input: TInput): TOutput;
  __stepId: string;
  __stepDefinition: WorkflowStepDefinition;
}

export interface WorkflowStepDefinition<TInput = any, TOutput = any, TCompensateInput = any> {
  id: string;
  invoke: InvokeFn<TInput, TOutput, TCompensateInput>;
  compensate?: CompensateFn<TCompensateInput>;
}

export type WorkflowData<T> = T;

export type WorkflowComposer<TInput = any, TResult = any, THooks = any> = (
  input: WorkflowData<TInput>
) => void | WorkflowResponse<TResult, THooks>;

export interface WorkflowDefinition<TInput = any, TResult = any, THooks = any> {
  id: string;
  composer: WorkflowComposer<TInput, TResult, THooks>;
}

export interface WorkflowExecutionContext {
  container?: WorkflowContainer;
  scope?: WorkflowContainer;
  metadata?: Record<string, any>;
}

export interface WorkflowRunner<TInput = any, TResult = any> {
  run(input: { input: TInput } & WorkflowExecutionContext): Promise<{ result: TResult }>;
}

export interface ReturnWorkflow<TInput = any, TResult = any, THooks = any> {
  (scope?: WorkflowContainer): WorkflowRunner<TInput, TResult>;
}