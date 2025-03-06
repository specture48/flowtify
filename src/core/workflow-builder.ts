import {AwilixContainer, createContainer} from "awilix";
import {StepGroup, WorkflowContext, WorkflowStep} from "./types.ts";

export class WorkflowBuilder<TInput = any, TOutput = any> {
    private stepGroups: StepGroup[] = [];
    private executedGroups: Array<{
        type: "sequential" | "parallel";
        steps: Array<{ key: string; output: any; step: WorkflowStep }>;
    }> = [];
    private context: WorkflowContext = {};
    private readonly container: AwilixContainer;

    constructor(container?: AwilixContainer) {
        this.container = container || createContainer();
    }

    addStep<TStepOutput>(
        key: string,
        step: WorkflowStep<any, TStepOutput> | ((context: WorkflowContext) => WorkflowStep<any, TStepOutput>),
        inputResolver?: (context: WorkflowContext) => any
    ): WorkflowBuilder<TInput, TStepOutput> {

        this.stepGroups.push({
            type: "sequential",
            key,
            step: typeof step === "function" ? step(this.context) : step,
            inputResolver,
        });
        return this as unknown as WorkflowBuilder<TInput, TStepOutput>;
    }

    addParallel<TParallelOutputs>(
        steps: Record<string, WorkflowStep | ((context: WorkflowContext) => WorkflowStep)>,
        inputResolvers?: Record<string, (context: WorkflowContext) => any>
    ): WorkflowBuilder<TInput, TParallelOutputs> {
        this.stepGroups.push({
            type: "parallel",
            steps: Object.entries(steps).map(([key, step]) => ({
                key,
                step: typeof step === "function" ? step(this.context) : step,
                inputResolver: inputResolvers?.[key],
            })),
        });
        return this as unknown as WorkflowBuilder<TInput, TParallelOutputs>;
    }

    public runAsStep(key: string, inputResolver?: (context: WorkflowContext) => any): WorkflowStep<TInput, TOutput> {
        return {
            execute: async (input, context, container) => {
                const resolvedInput = inputResolver ? inputResolver(context) : input;
                const workflow = new WorkflowBuilder<TInput, TOutput>(container);
                workflow.stepGroups = [...this.stepGroups];
                const output = await workflow.execute(resolvedInput);

                // Store execution details in parent context
                context[`${key}_executedGroups`] = workflow.executedGroups;
                context[key] = output;

                // Merge child context into parent
                Object.assign(context, workflow.context);
                return output;
            },
            compensate: async (output, context, container) => {
                const executedGroups = context[`${key}_executedGroups`] as Array<{
                    type: "sequential" | "parallel";
                    steps: Array<{ key: string; output: any; step: WorkflowStep }>;
                }>;

                if (executedGroups) {
                    for (const group of executedGroups.reverse()) {
                        if (group.type === "sequential") {
                            for (const step of group.steps) {
                                if (step.step.compensate) {
                                    await step.step.compensate(step.output, context, container);
                                }
                            }
                        } else if (group.type === "parallel") {
                            await Promise.all(group.steps.map(step =>
                                step.step.compensate?.(step.output, context, container)
                            ));
                        }
                    }
                }
            },
        };
    }

    async execute(input: TInput): Promise<TOutput> {
        this.context = {input};


        try {
            for (const group of this.stepGroups) {
                if (group.type === "sequential") {
                    // Handle sequential step
                    const {key, step, inputResolver} = group;
                    const resolvedInput = inputResolver ? inputResolver(this.context) : this.context[key] || this.context.input;
                    const output = await step.execute(resolvedInput, this.context, this.container);
                    this.context[key] = output;
                    this.executedGroups.push({type: "sequential", steps: [{key, output, step}]});
                } else {
                    // Handle parallel steps
                    const parallelContext = {...this.context};
                    const results = await Promise.allSettled(
                        group.steps.map(async ({key, step, inputResolver}) => {
                            const resolvedInput = inputResolver ? inputResolver(parallelContext) : parallelContext[key] || parallelContext.input;
                            const output = await step.execute(resolvedInput, parallelContext, this.container);
                            return ({key, output, step});
                        })
                    );

                    // Check for failures
                    const failed = results.find((r) => r.status === "rejected");
                    if (failed) {
                        // Compensate succeeded parallel steps
                        await this.compensateParallel(results);
                        throw (failed as PromiseRejectedResult).reason;
                    }

                    // Merge successful results
                    const successful = results
                        .filter((r) => r.status === "fulfilled")
                        .map((r) => (r as PromiseFulfilledResult<any>).value);

                    this.context = {
                        ...this.context,
                        ...successful.reduce((acc, cur) => {
                            acc[cur.key] = cur.output;
                            return acc;
                        }, {} as Record<string, any>),
                    };

                    this.executedGroups.push({type: "parallel", steps: successful});
                }
            }

            return this.getFinalOutput();
        } catch (error) {
            // Compensate all executed groups in reverse order
            for (const group of this.executedGroups.reverse()) {
                await this.compensateGroup(group);
            }
            throw error;
        }
    }

    private async compensateGroup(group: {
        type: "sequential" | "parallel";
        steps: Array<{ key: string; output: any; step: WorkflowStep }>;
    }) {
        if (group.type === "sequential") {
            const {output, step} = group.steps[0];
            if (step.compensate) {
                await step.compensate(output, this.context, this.container);
            }
        } else {

            await Promise.all(
                group.steps.map(async ({output, step}) => {
                    if (step.compensate) {
                        await step.compensate(output, this.context, this.container);
                    }
                })
            );
        }
    }

    private async compensateParallel(results: PromiseSettledResult<any>[]) {
        await Promise.all(
            results.map(async (result) => {
                if (result.status === "fulfilled" && result.value.step.compensate) {
                    await result.value.step.compensate(
                        result.value.output,
                        this.context,
                        this.container
                    );
                }
            })
        );
    }

    private getFinalOutput() {
        const lastGroup = this.stepGroups[this.stepGroups.length - 1];
        if (lastGroup.type === "parallel") {
            return lastGroup.steps.reduce((acc, {key}) => {
                acc[key] = this.context[key];
                return acc;
            }, {} as any);
        }
        return this.context[lastGroup.key];
    }
}