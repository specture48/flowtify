import {WorkflowStep} from "./core/types.js";
import {WorkflowBuilder} from "./core/workflow-builder.js";

const createUserStep: WorkflowStep<{ name: string }, { id: string }> = {
    async execute(input) {
        console.log("createUserStep", createUserStep)

        return Promise.resolve({
            id: "foo"
        })
    },
    async compensate(output) { /* ... */
        console.log("compensate createUserStep")
    }
};

const createProfileStep: WorkflowStep<any, { profileId: string }> = {
    async execute(_, context,container) { // Ignore direct input, use context
        console.log("createProfileStep", createProfileStep)
        // Get user ID from previous step's context
        const userId = context.user.id;
        console.log("context", context)
        console.log(`Creating profile for user ${userId}`);

        // Create profile logic
        const profile = {profileId: `profile-${userId}`};
        context.profile = profile; // Optional: Store in context if needed
        return {
            profileId: "foo"
        };
    },
    async compensate(output) {
        console.log(`Deleting profile ${output.profileId}`);
    }
};

const createSubscriptionStep: WorkflowStep<string, { subId: string }> = {
    async execute(userId) {
        console.log("createSubscriptionStep", createSubscriptionStep)

        return Promise.resolve({
            subId: "foo"
        })
    },
    async compensate(output) {
        console.log("compensate createSubscriptionStep")
    }
};

// Create workflow
const workflow = new WorkflowBuilder()
    .addStep("user", createUserStep)
    .addParallel({
        subscription: createSubscriptionStep,
        profile: createProfileStep,
    })
// .addStep("notification", sendNotificationStep);

// Execute workflow
workflow.execute({name: "John"})
    .then(result => {
        console.log("User created with profile and subscription:", result);
    })
    .catch(error => {
        console.error("Workflow failed:", error);
    });

