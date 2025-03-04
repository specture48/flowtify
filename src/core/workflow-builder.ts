import {AwilixContainer, createContainer} from "awilix";
import {StepGroup, WorkflowContext, WorkflowStep} from "./types.ts";

export class WorkflowBuilder<TInput = any, TOutput = any> {
    private stepGroups: StepGroup[] = [];
    private context: WorkflowContext = {};
    private container: AwilixContainer;

    constructor(container?: AwilixContainer) {
        this.container = container || createContainer();
    }

    /**
     * Add a sequential step
     */
    addStep<TStepOutput>(
        key: string,
        step: WorkflowStep<any, TStepOutput>
    ): WorkflowBuilder<TInput, TStepOutput> {
        this.stepGroups.push({type: "sequential", key, step});
        return this as unknown as WorkflowBuilder<TInput, TStepOutput>;
    }

    /**
     * Add parallel steps that can execute concurrently
     */
    addParallel<TParallelOutputs>(
        steps: Record<string, WorkflowStep>
    ): WorkflowBuilder<TInput, TParallelOutputs> {
        this.stepGroups.push({
            type: "parallel",
            steps: Object.entries(steps).map(([key, step]) => ({key, step}))
        });
        return this as unknown as WorkflowBuilder<TInput, TParallelOutputs>;
    }

    /**
     * Execute workflow with parallel support
     */
    async execute(input: TInput): Promise<TOutput> {
        this.context = {input};
        const executedGroups: Array<{
            type: "sequential" | "parallel";
            steps: Array<{ key: string; output: any; step: WorkflowStep }>;
        }> = [];

        try {
            for (const group of this.stepGroups) {
                if (group.type === "sequential") {
                    // Handle sequential step
                    const {key, step} = group;
                    const output = await this.runStep(key, step);
                    executedGroups.push({type: "sequential", steps: [{key, output, step}]});
                } else {
                    // Handle parallel steps
                    const parallelContext = {...this.context};
                    const results = await Promise.allSettled(
                        group.steps.map(({key, step}) =>
                            this.runStep(key, step, parallelContext)
                                .then(output => ({key, output, step}))
                        )
                    );

                    // Check for failures
                    const failed = results.find(r => r.status === "rejected");
                    if (failed) {
                        // Compensate succeeded parallel steps
                        await this.compensateParallel(results);
                        throw (failed as PromiseRejectedResult).reason;
                    }

                    // Merge successful results
                    const successful = results
                        .filter(r => r.status === "fulfilled")
                        .map(r => (r as PromiseFulfilledResult<any>).value);

                    this.context = {
                        ...this.context, ...successful.reduce((acc, cur) => {
                            acc[cur.key] = cur.output;
                            return acc;
                        }, {} as Record<string, any>)
                    };

                    executedGroups.push({type: "parallel", steps: successful});
                }
            }

            return this.getFinalOutput();
        } catch (error) {
            // Compensate all executed groups in reverse order
            for (const group of executedGroups.reverse()) {
                await this.compensateGroup(group);
            }
            throw error;
        }
    }

    private async runStep(
        key: string,
        step: WorkflowStep,
        context = this.context
    ) {
        const input = context[key] || context.input;
        const output = await step.execute(input, context, this.container);
        if (context === this.context) this.context[key] = output;
        return output;
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
            await Promise.all(group.steps.map(async ({output, step}) => {
                if (step.compensate) {
                    await step.compensate(output, this.context, this.container);
                }
            }));
        }
    }

    private async compensateParallel(results: PromiseSettledResult<any>[]) {
        await Promise.all(results.map(async (result) => {
            if (result.status === "fulfilled" && result.value.step.compensate) {
                await result.value.step.compensate(
                    result.value.output,
                    this.context,
                    this.container
                );
            }
        }));
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
