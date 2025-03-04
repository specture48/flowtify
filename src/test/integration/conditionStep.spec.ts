import { AwilixContainer, createContainer } from 'awilix';
import {WorkflowBuilder, WorkflowContext, WorkflowStep} from "../../core/workflow-builder.ts";

// Mock AwilixContainer for testing
jest.mock('awilix', () => ({
    createContainer: jest.fn(() => ({
        resolve: jest.fn(),
    })),
}));

describe('WorkflowBuilder - Conditional Tests', () => {
    let container: AwilixContainer;

    beforeEach(() => {
        container = createContainer();
    });

    // Helper function to create a mock step
    const createMockStep = <TInput, TOutput>(
        executeFn: (input: TInput, context: WorkflowContext, container: AwilixContainer) => Promise<TOutput>,
        compensateFn?: (output: TOutput, context: WorkflowContext, container: AwilixContainer) => Promise<void>
    ): WorkflowStep<TInput, TOutput> => ({
        execute: jest.fn(executeFn),
        compensate: compensateFn ? jest.fn(compensateFn) : undefined,
    });

    // Test 1: Conditional group executes when condition is true
    it('should execute conditional steps when condition is true', async () => {
        const step1 = createMockStep(
            async (input: string) => `${input} processed`
        );
        const condition = jest.fn(async (_input, _context) => true);

        const workflow = new WorkflowBuilder(container)
            .addConditional(
                condition,
                (builder) => builder.addStep('step1', step1)
            );

        const result = await workflow.execute('test input');
        console.log(result)
        expect(condition).toHaveBeenCalledWith('test input', expect.any(Object));
        expect(step1.execute).toHaveBeenCalledWith(
            'test input',
            expect.objectContaining({ input: 'test input' }),
            container
        );
        expect(result).toEqual({input:"test input", step1: 'test input processed' });
    });

    // Test 2: Conditional group skips when condition is false
    it('should skip conditional steps when condition is false', async () => {
        const step1 = createMockStep(
            async (input: string) => `${input} processed`
        );
        const condition = jest.fn(async (_input, _context) => false);

        const workflow = new WorkflowBuilder(container)
            .addConditional(
                condition,
                (builder) => builder.addStep('step1', step1)
            );

        const result = await workflow.execute('test input');

        expect(condition).toHaveBeenCalledWith('test input', expect.any(Object));
        expect(step1.execute).not.toHaveBeenCalled();
        expect(result).toEqual({ input: 'test input' });
    });

    // Test 3: Compensation triggers when a step in conditional group fails
    it('should compensate when a step in conditional group fails', async () => {
        const step1 = createMockStep(
            async (input: string) => `${input} processed`,
            async (_output, _context, _container) => Promise.resolve()
        );
        const step2 = createMockStep(
            async (_input: string) => {
                throw new Error('Step 2 failed');
            }
        );
        const condition = jest.fn(async (_input, _context) => true);

        const workflow = new WorkflowBuilder(container)
            .addConditional(
                condition,
                (builder) =>
                    builder
                        .addStep('step1', step1)
                        .addStep('step2', step2)
            );

        await expect(workflow.execute('test input')).rejects.toThrow('Step 2 failed');

        expect(condition).toHaveBeenCalledWith('test input', expect.any(Object));
        expect(step1.execute).toHaveBeenCalledWith(
            'test input',
            expect.any(Object),
            container
        );
        expect(step2.execute).toHaveBeenCalledWith(
            'test input',  // Updated to reflect unchanged initial input
            expect.any(Object),
            container
        );
        expect(step1.compensate).toHaveBeenCalledWith(
            'test input processed',  // Compensation uses step1's output
            expect.any(Object),
            container
        );
    });

    // Test 4: Nested conditional with successful execution
    it('should handle nested conditionals correctly', async () => {
        const step1 = createMockStep(
            async (input: string,context) => `${input} step1`
        );
        const step2 = createMockStep(
            async (input: string,context) => `${input} step2`
        );
        const outerCondition = jest.fn(async (_input, _context) => true);
        const innerCondition = jest.fn(async (_input, _context) => true);

        const workflow = new WorkflowBuilder(container)
            .addConditional(
                outerCondition,
                (builder) =>
                    builder.addConditional(
                        innerCondition,
                        (innerBuilder) =>
                            innerBuilder
                                .addStep('step1', step1)
                                .addStep('step2', step2)
                    )
            );

        const result = await workflow.execute('test');

        expect(outerCondition).toHaveBeenCalledWith('test', expect.any(Object));
        expect(innerCondition).toHaveBeenCalledWith('test', expect.any(Object));
        expect(step1.execute).toHaveBeenCalledWith('test', expect.any(Object), container);
        expect(step2.execute).toHaveBeenCalledWith('test', expect.any(Object), container);
        expect(result).toEqual({
            input: 'test',
            step1: 'test step1',
            step2: 'test step2',
        });
    });

    // Test 5: Compensation in nested conditional
    it('should compensate nested conditional steps on failure', async () => {
        const step1 = createMockStep(
            async (input: string) => `${input} step1`,
            async (_output, _context, _container) => Promise.resolve()
        );
        const step2 = createMockStep(
            async (_input: string) => {
                throw new Error('Nested step failed');
            }
        );
        const outerCondition = jest.fn(async (_input, _context) => true);
        const innerCondition = jest.fn(async (_input, _context) => true);

        const workflow = new WorkflowBuilder(container)
            .addConditional(
                outerCondition,
                (builder) =>
                    builder.addConditional(
                        innerCondition,
                        (innerBuilder) =>
                            innerBuilder
                                .addStep('step1', step1)
                                .addStep('step2', step2)
                    )
            );

        await expect(workflow.execute('test')).rejects.toThrow('Nested step failed');

        expect(outerCondition).toHaveBeenCalled();
        expect(innerCondition).toHaveBeenCalled();
        expect(step1.execute).toHaveBeenCalled();
        expect(step2.execute).toHaveBeenCalled();
        expect(step1.compensate).toHaveBeenCalledWith(
            'test step1',
            expect.any(Object),
            container
        );
    });
});