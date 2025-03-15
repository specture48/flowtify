import {WorkflowStep} from "../../core/types";
import {WorkflowBuilder} from "../../core/workflow-builder";

describe("WorkflowBuilder with inputResolver", () => {
    let container: any;

    beforeEach(() => {
        container = {}; // Mock container for dependency injection
    });

    it("should execute sequential steps with inputResolver", async () => {
        const createUserStep: WorkflowStep<any, { id: string; name: string }> = {
            execute: async () => ({ id: "user123", name: "John Doe" }),
        };

        const createSubscriptionStep: WorkflowStep<{ userId: string }, { subscriptionId: string }> = {
            execute: async (input) => ({ subscriptionId: `sub_${input.userId}` }),
        };

        const workflow = new WorkflowBuilder()
            .addStep("user", createUserStep)
            .addStep("subscription", createSubscriptionStep, (context) => ({ userId: context.user.id }));

        const result = await workflow.execute({});
        expect(result).toEqual({ subscriptionId: "sub_user123" });
    });

    it("should execute parallel steps with inputResolver", async () => {
        const createUserStep: WorkflowStep<any, { id: string; name: string }> = {
            execute: async () => ({ id: "user123", name: "John Doe" }),
        };

        const createSubscriptionStep: WorkflowStep<{ userId: string }, { subscriptionId: string }> = {
            execute: async (input) => ({ subscriptionId: `sub_${input.userId}` }),
        };

        const createProfileStep: WorkflowStep<{ userId: string }, { profileId: string }> = {
            execute: async (input) => ({ profileId: `profile_${input.userId}` }),
        };

        const workflow = new WorkflowBuilder()
            .addStep("user", createUserStep)
            .addParallel({
                subscription: createSubscriptionStep,
                profile: createProfileStep,
            }, {
                subscription: (context) => ({ userId: context.user.id }),
                profile: (context) => ({ userId: context.user.id }),
            });

        const result = await workflow.execute({});
        expect(result).toEqual({
            subscription: { subscriptionId: "sub_user123" },
            profile: { profileId: "profile_user123" },
        });
    });

    it("should handle compensation for sequential steps with inputResolver", async () => {
        const compensateMock = jest.fn();

        const createUserStep: WorkflowStep<any, { id: string; name: string }> = {
            execute: async () => ({ id: "user123", name: "John Doe" }),
        };

        const createSubscriptionStep: WorkflowStep<{ userId: string }, { subscriptionId: string }> = {
            execute: async () => {
                throw new Error("Subscription creation failed");
            },
            compensate: compensateMock,
        };

        const workflow = new WorkflowBuilder()
            .addStep("user", createUserStep)
            .addStep("subscription", createSubscriptionStep, (context) => ({ userId: context.user.id }));

        await expect(workflow.execute({})).rejects.toThrow("Subscription creation failed");
        expect(compensateMock).not.toHaveBeenCalled(); // Compensation is not called because the step failed before completion
    });

});