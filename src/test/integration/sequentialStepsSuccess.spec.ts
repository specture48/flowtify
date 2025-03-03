import {asFunction, createContainer} from "awilix";

import {MockLogger} from "../common/mock-logger.ts";
import {WorkflowStep} from "../../core/types.ts";
import {WorkflowBuilder} from "../../core/workflow-builder.ts";

describe('WorkflowBuilder', () => {
    test('All sequential steps succeed', async () => {
        const container = createContainer();
        const mockLogger = new MockLogger();
        container.register({
            logger: asFunction(() => mockLogger).singleton(),
        });

        const step1: WorkflowStep<any, any> = {
            execute: async (input, context, container) => {
                const logger = container.resolve<MockLogger>('logger');
                logger.record('step1 executed');
                return { step1: 'success' };
            },
        };

        const step2: WorkflowStep<any, any> = {
            execute: async (input, context, container) => {
                const logger = container.resolve<MockLogger>('logger');
                logger.record('step2 executed');
                return { step2: 'success' };
            },
        };

        const workflow = new WorkflowBuilder(container)
            .addStep('first', step1)
            .addStep('second', step2);

        const result = await workflow.execute('initial input');

        expect(result).toEqual({ step2: 'success' });
        expect(mockLogger.log).toEqual(['step1 executed', 'step2 executed']);
    });
});