import { AwilixContainer } from "awilix";

export interface WorkflowContext {
    [key: string]: any;
}

export interface WorkflowStep<TInput = any, TOutput = any> {
    execute: (
        input: TInput,
        context: WorkflowContext,
        container: AwilixContainer
    ) => Promise<TOutput>;
    compensate?: (
        output: TOutput,
        context: WorkflowContext,
        container: AwilixContainer
    ) => Promise<void>;
}

export type StepGroup =
    | {
    type: "sequential";
    key: string;
    step: WorkflowStep;
    inputResolver?: (context: WorkflowContext) => any;
}
    | {
    type: "parallel";
    steps: Array<{
        key: string;
        step: WorkflowStep;
        inputResolver?: (context: WorkflowContext) => any;
    }>;
};