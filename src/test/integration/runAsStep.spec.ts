import {WorkflowBuilder} from "../../core/workflow-builder";
import {asValue, createContainer} from "awilix";

describe("WorkflowBuilder", () => {
    let container: any;

    beforeEach(() => {
        container = {}; // Mock container for dependency injection
    });

    it("should compose workflows using runAsStep with inputResolver", async () => {
        const childWorkflow = new WorkflowBuilder<number, number>()
            .addStep("childStep1", {
                execute: (input) => {
                    console.log("Child Step 1 Input:", input);
                    return input + 1;
                },
            })
            .addStep("childStep2", {
                    execute: (input, context) => {
                        console.log("Child Step 2 Input:", input);
                        console.log("context:", context);
                        return Promise.resolve(input * 2);
                    },
                },
                (context => (
                        context.childStep1
                    )
                ))

        const parentWorkflow = new WorkflowBuilder<number, number>()
            .addStep("parentStep1", {
                execute: (input) => {
                    console.log("Parent Step 1 Input:", input);
                    return input + 1;
                },
            })
            .addStep("nestedWorkflow", childWorkflow.runAsStep("nestedWorkflow", (context) => context.parentStep1));

        const result = await parentWorkflow.execute(1);
        expect(result).toBe(6); // (1 + 1) -> 2, then (2 + 1) * 2 = 6
    });

    it("should handle compensation for nested workflows", async () => {
        const childCompensateMock = jest.fn();
        const parentCompensateMock = jest.fn();

        const childWorkflow = new WorkflowBuilder<number, number>(container)
            .addStep("childStep1", {
                execute: (input) => input + 1,
                compensate: childCompensateMock,
            });

        const parentWorkflow = new WorkflowBuilder<number, number>(container)
            .addStep("nestedWorkflow", childWorkflow.runAsStep("nestedWorkflow"))
            .addStep("parentStep1", {
                execute: () => {
                    throw new Error("Parent step failed");
                },
                compensate: parentCompensateMock,
            });

        await expect(parentWorkflow.execute(1)).rejects.toThrow("Parent step failed");

        // Verify child compensation was called with correct args
        expect(childCompensateMock).toHaveBeenCalledWith(
            2,  // Input (1) + 1 = 2
            expect.objectContaining({nestedWorkflow: 2}),  // Context
            container
        );

        // Verify parent compensation wasn't called
        expect(parentCompensateMock).not.toHaveBeenCalled();
    });

    it("should merge context correctly for nested workflows", async () => {
        const childWorkflow = new WorkflowBuilder<number, number>()
            .addStep("childStep1", {
                execute: (input, context) => {
                    context.childValue = input + 1;
                    return input + 1;
                },
            });

        const parentWorkflow = new WorkflowBuilder<number, number>()
            .addStep("nestedWorkflow", childWorkflow.runAsStep("nestedWorkflow"))
            .addStep("parentStep1", {
                execute: (input, context) => {
                    return context.childValue + input;
                },
            });

        const result = await parentWorkflow.execute(1);
        expect(result).toBe(3); // childValue = 2, then 2 + 1 = 3
    });

    it("should handle parallel steps with nested workflows", async () => {
        const childWorkflow = new WorkflowBuilder<number, number>()
            .addStep("childStep1", {
                execute: (input) => Promise.resolve(input + 1), // Ensure it returns a Promise
            });

        const workflow = new WorkflowBuilder<number, Record<string, number>>()
            .addParallel({
                step1: {
                    execute: (input) => Promise.resolve(input + 1), // Ensure it returns a Promise
                },
                nestedWorkflow: childWorkflow.runAsStep("nestedWorkflow"),
            });

        const result = await workflow.execute(1);
        expect(result).toEqual({step1: 2, nestedWorkflow: 2}); // { step1: 1 + 1, nestedWorkflow: 1 + 1 }
    });

    it("should pass container to nested workflows", async () => {
        // Assuming a Container class exists with these methods
        const container = createContainer();
        container.register({
            someService: asValue("someService")
        });

        // Create child workflow
        const childWorkflow = new WorkflowBuilder<number, number>(container)
            .addStep("childStep1", {
                execute: (input: any, context: any, container: any) => {
                    const serviceResponse = container.resolve("someService");
                    console.log("Service Response:", serviceResponse);
                    return input + 1;
                },
            });

        // Create parent workflow with nested workflow
        const parentWorkflow = new WorkflowBuilder<number, number>(container)
            .addStep("nestedWorkflow", childWorkflow.runAsStep("nestedWorkflow"));

        // First execution - check basic functionality
        const result = await parentWorkflow.execute(1);
        expect(result).toBe(2); // 1 + 1 = 2

        // Setup mock before second execution
        const mockResolve = jest.spyOn(container, 'resolve');

        // Second execution - verify container usage
        await parentWorkflow.execute(1);
        expect(mockResolve).toHaveBeenCalledWith("someService");

        // Cleanup
        mockResolve.mockRestore();
    });
});