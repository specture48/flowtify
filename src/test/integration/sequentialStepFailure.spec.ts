import {asFunction, createContainer} from "awilix";
import {MockLogger} from "../common/mock-logger.ts";
import {WorkflowStep} from "../../core/types.ts";
import {WorkflowBuilder} from "../../core/workflow-builder.ts";

test('A sequential step fails', async () => {
    const container = createContainer();
    const mockLogger = new MockLogger();

    container.register({
        logger: asFunction(() => mockLogger).singleton(),
    });

    const step1: WorkflowStep<any, any> = {
        execute: async (input, context, container) => {
            const logger = container.resolve<MockLogger>('logger');
            logger.record('step1 executed');
            return {step1: 'success'};
        },
        compensate: async (output, context, container) => {
            const logger = container.resolve<MockLogger>('logger');
            logger.record('step1 compensated');
        },
    };
    const step2: WorkflowStep<any, any> = {
        execute: async (input, context, container) => {
            const logger = container.resolve<MockLogger>('logger');
            logger.record('step2 executed');
            throw new Error('Step2 failed');
        },
    };

    const workflow = new WorkflowBuilder(container)
        .addStep('first', step1)
        .addStep('second', step2);

    await expect(workflow.execute('initial input')).rejects.toThrow('Step2 failed');
    expect(mockLogger.log).toEqual(['step1 executed', 'step2 executed', 'step1 compensated']);
});