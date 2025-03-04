import { AwilixContainer, createContainer } from "awilix";

export interface WorkflowContext {
    [key: string]: any;
    input?: any;
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

type StepGroup =
    | { type: "sequential"; key: string; step: WorkflowStep }
    | { type: "parallel"; steps: Array<{ key: string; step: WorkflowStep }> }
    | {
    type: "conditional";
    condition: (input: any, context: WorkflowContext) => Promise<boolean>;
    groups: StepGroup[];
};

export class WorkflowBuilder<TInput = any, TOutput = any> {
    private stepGroups: StepGroup[] = [];
    private context: WorkflowContext = {};
    private container: AwilixContainer;
    private executedGroups: Array<{
        type: "sequential" | "parallel" | "conditional";
        steps?: Array<{ key: string; output: any; step: WorkflowStep }>;
        groups?: StepGroup[];
    }> = [];

    constructor(container?: AwilixContainer) {
        this.container = container || createContainer();
    }

    addStep<TStepOutput>(
        key: string,
        step: WorkflowStep<any, TStepOutput>
    ): WorkflowBuilder<TInput, TStepOutput> {
        this.stepGroups.push({ type: "sequential", key, step });
        return this as unknown as WorkflowBuilder<TInput, TStepOutput>;
    }

    addParallel<TParallelOutputs>(
        steps: Record<string, WorkflowStep>
    ): WorkflowBuilder<TInput, TParallelOutputs> {
        this.stepGroups.push({
            type: "parallel",
            steps: Object.entries(steps).map(([key, step]) => ({ key, step })),
        });
        return this as unknown as WorkflowBuilder<TInput, TParallelOutputs>;
    }

    addConditional<TStepOutput>(
        condition: (input: any, context: WorkflowContext) => Promise<boolean>,
        builder: (workflow: WorkflowBuilder<any, TStepOutput>) => WorkflowBuilder<any, TStepOutput>
    ): WorkflowBuilder<TInput, TStepOutput> {
        const conditionalBuilder = builder(new WorkflowBuilder(this.container));
        this.stepGroups.push({
            type: "conditional",
            condition,
            groups: conditionalBuilder.stepGroups,
        });
        return this as unknown as WorkflowBuilder<TInput, TStepOutput>;
    }

    async execute(input: TInput): Promise<TOutput> {
        console.log("execute ...",input)
        this.context = { input };
        this.executedGroups = [];

        try {
            for (const group of this.stepGroups) {
                await this.processGroup(group);
            }
            return this.getFinalOutput();
        } catch (error) {
            await this.compensateAll();
            throw error;
        }
    }

    private async processGroup(group: StepGroup): Promise<void> {
        switch (group.type) {
            case "sequential":
                return this.processSequential(group);
            case "parallel":
                return this.processParallel(group);
            case "conditional":
                return this.processConditional(group);
        }
    }

    private async processSequential(group: StepGroup & { type: "sequential" }) {
        const { key, step } = group;
        const output = await this.runStep(key, step);
        this.executedGroups.push({
            type: "sequential",
            steps: [{ key, output, step }],
        });
    }

    private async processParallel(group: StepGroup & { type: "parallel" }) {
        const parallelContext = { ...this.context };
        const results = await Promise.allSettled(
            group.steps.map(({ key, step }) =>
                this.runStep(key, step, parallelContext).then((output) => ({
                    key,
                    output,
                    step,
                }))
            )
        );

        const failed = results.find((r) => r.status === "rejected");
        if (failed) {
            await this.compensateParallel(results);
            throw (failed as PromiseRejectedResult).reason;
        }

        const successful = results
            .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
            .map((r) => r.value);

        this.context = {
            ...this.context,
            ...successful.reduce(
                (acc, cur) => {
                    acc[cur.key] = cur.output;
                    return acc;
                },
                {} as Record<string, any>
            ),
        };

        this.executedGroups.push({
            type: "parallel",
            steps: successful,
        });
    }

    private async processConditional(group: StepGroup & { type: "conditional" }) {
        const shouldExecute = await group.condition(
            this.context.input,
            this.context
        );
        console.log("should execute",shouldExecute)

        if (shouldExecute) {
            const conditionalWorkflow = new WorkflowBuilder(this.container);
            conditionalWorkflow.stepGroups = group.groups;
            const result = await conditionalWorkflow.execute(this.context.input);

            this.context = {
                ...this.context,
                ...conditionalWorkflow.context,
            };

            this.executedGroups.push({
                type: "conditional",
                // @ts-ignore
                groups: conditionalWorkflow.executedGroups,
            });
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

    private async compensateAll() {
        for (const group of this.executedGroups.reverse()) {
            await this.compensateGroup(group);
        }
    }

    private async compensateGroup(group: {
        type: "sequential" | "parallel" | "conditional";
        steps?: Array<{ key: string; output: any; step: WorkflowStep }>;
        groups?: StepGroup[];
    }) {
        switch (group.type) {
            case "sequential":
                return this.compensateSequential(group);
            case "parallel":
                return this.compensateParallelGroup(group);
            case "conditional":
                return this.compensateConditional(group);
        }
    }

    private async compensateSequential(group: {
        steps?: Array<{ key: string; output: any; step: WorkflowStep }>;
    }) {
        if (!group.steps) return;
        for (const { output, step } of group.steps) {
            if (step.compensate) {
                await step.compensate(output, this.context, this.container);
            }
        }
    }

    private async compensateParallelGroup(group: {
        steps?: Array<{ key: string; output: any; step: WorkflowStep }>;
    }) {
        if (!group.steps) return;
        await Promise.all(
            group.steps.map(async ({ output, step }) => {
                if (step.compensate) {
                    await step.compensate(output, this.context, this.container);
                }
            })
        );
    }

    private async compensateConditional(group: { groups?: StepGroup[] }) {
        if (!group.groups) return;
        const compensationBuilder = new WorkflowBuilder(this.container);
        compensationBuilder.stepGroups = group.groups.reverse();
        await compensationBuilder.compensateAll();
    }

    private async compensateParallel(
        results: PromiseSettledResult<{ key: string; output: any; step: WorkflowStep }>[]
    ) {
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

    private getFinalOutput(): TOutput {
        const lastGroup = this.stepGroups[this.stepGroups.length - 1];

        if (lastGroup.type === "parallel") {
            return lastGroup.steps.reduce(
                (acc, { key }) => {
                    acc[key] = this.context[key];
                    return acc;
                },
                {} as any
            );
        }

        if (lastGroup.type === "conditional") {
            return this.context as any;
        }

        return this.context[lastGroup.key];
    }
}