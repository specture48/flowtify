import {WorkflowStep} from "../../core/types.ts";
import {WorkflowBuilder} from "../../core/workflow-builder.ts";
import {MockLogger} from "../common/mock-logger.ts";
import {asFunction, createContainer} from "awilix";


test('Context is correctly passed and updated', async () => {
    const container = createContainer();
    const mockLogger = new MockLogger();
    container.register({
        logger: asFunction(() => mockLogger).singleton(),
    });

    const step1: WorkflowStep<any, any> = {
        execute: async (input, context, container) => {
            return { value: 'from step1' };
        },
    };

    const step2: WorkflowStep<any, any> = {
        execute: async (input, context, container) => {
            const step1Output = context.first;
            return { value: step1Output.value + ' and step2' };
        },
    };

    const workflow = new WorkflowBuilder(container)
        .addStep('first', step1)
        .addStep('second', step2);

    const result = await workflow.execute('initial input');
    expect(result).toEqual({ value: 'from step1 and step2' });
});