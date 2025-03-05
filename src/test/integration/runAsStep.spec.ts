import {WorkflowBuilder} from "../../core/workflow-builder.ts";

describe("WorkflowBuilder", () => {
    let container: any;

    beforeEach(() => {
        container = {}; // Mock container for dependency injection
    });


    it("should compose workflows using runAsStep", async () => {
        const childWorkflow = new WorkflowBuilder<number, number>()
            .addStep("childStep1", {
                execute: (input,context) => {
                    console.log("input",input)
                    console.log("context",context)
                    return input + 1
                },
            })
            .addStep("childStep2", {
                execute: (input) => Promise.resolve(input * 2),
            });

        const parentWorkflow = new WorkflowBuilder<number, number>()
            .addStep("parentStep1", {
                execute: (input) => input + 1,
            })
            .addStep("nestedWorkflow", childWorkflow.runAsStep("nestedWorkflow"));

        const result = await parentWorkflow.execute(1);
        expect(result).toBe(6); // (1 + 1) -> 2, then (2 + 1) * 2 = 6
    });

    // it("should handle compensation for nested workflows", async () => {
    //     const childCompensateMock = jest.fn();
    //     const parentCompensateMock = jest.fn();
    //
    //     const childWorkflow = new WorkflowBuilder<number, number>()
    //         .addStep("childStep1", {
    //             execute: (input) => input + 1,
    //             compensate: childCompensateMock,
    //         });
    //
    //     const parentWorkflow = new WorkflowBuilder<number, number>()
    //         .addStep("nestedWorkflow", childWorkflow.runAsStep("nestedWorkflow"))
    //         .addStep("parentStep1", {
    //             execute: () => {
    //                 throw new Error("Parent step failed");
    //             },
    //             compensate: parentCompensateMock,
    //         });
    //
    //     await expect(parentWorkflow.execute(1)).rejects.toThrow("Parent step failed");
    //     expect(childCompensateMock).toHaveBeenCalledWith(2, expect.any(Object), container); // childStep1's output is 2
    //     expect(parentCompensateMock).not.toHaveBeenCalled(); // Parent step failed, so its compensation is not called
    // });
    //
    // it("should merge context correctly for nested workflows", async () => {
    //     const childWorkflow = new WorkflowBuilder<number, number>()
    //         .addStep("childStep1", {
    //             execute: (input, context) => {
    //                 context.childValue = input + 1;
    //                 return input + 1;
    //             },
    //         });
    //
    //     const parentWorkflow = new WorkflowBuilder<number, number>()
    //         .addStep("nestedWorkflow", childWorkflow.runAsStep("nestedWorkflow"))
    //         .addStep("parentStep1", {
    //             execute: (input, context) => {
    //                 return context.childValue + input;
    //             },
    //         });
    //
    //     const result = await parentWorkflow.execute(1);
    //     expect(result).toBe(3); // childValue = 2, then 2 + 1 = 3
    // });
    //
    // it("should handle parallel steps with nested workflows", async () => {
    //     const childWorkflow = new WorkflowBuilder<number, number>()
    //         .addStep("childStep1", {
    //             execute: (input) => input + 1,
    //         });
    //
    //     const workflow = new WorkflowBuilder<number, Record<string, number>>()
    //         .addParallel({
    //             step1: {
    //                 execute: (input) => input + 1,
    //             },
    //             nestedWorkflow: childWorkflow.runAsStep("nestedWorkflow"),
    //         });
    //
    //     const result = await workflow.execute(1);
    //     expect(result).toEqual({ step1: 2, nestedWorkflow: 2 }); // { step1: 1 + 1, nestedWorkflow: 1 + 1 }
    // });
});