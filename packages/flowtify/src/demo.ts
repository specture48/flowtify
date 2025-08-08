import { createContainer, asFunction } from 'awilix';
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  awilixAdapter
} from './';

// Setup container with services
const awilixContainer = createContainer();
awilixContainer.register({
  userService: asFunction(() => ({
    createUser: async (input: any) => ({
      id: `user-${Date.now()}`,
      name: input.name,
      created_at: new Date()
    })
  })).singleton(),
  profileService: asFunction(() => ({
    createProfile: async (userId: string) => ({
      profileId: `profile-${userId}`,
      userId,
      created_at: new Date()
    })
  })).singleton(),
  subscriptionService: asFunction(() => ({
    createSubscription: async (userId: string) => ({
      subId: `sub-${userId}`,
      userId,
      plan: 'basic',
      created_at: new Date()
    })
  })).singleton()
});

const container = awilixAdapter.from(awilixContainer);

// Define workflow steps using Flowtify pattern
const createUserStep = createStep(
  'create-user',
  async (input: { name: string }, { container }) => {
    const userService = container.resolve('userService');
    const user = await userService.createUser(input);
    console.log('User created:', user);
    return new StepResponse(user);
  }
);

const createProfileStep = createStep(
  'create-profile',
  async (input: { user: any }, { container }) => {
    const profileService = container.resolve('profileService');
    const profile = await profileService.createProfile(input.user.id);
    console.log('Profile created:', profile);
    return new StepResponse(profile);
  }
);

const createSubscriptionStep = createStep(
  'create-subscription',
  async (input: { user: any }, { container }) => {
    const subscriptionService = container.resolve('subscriptionService');
    const subscription = await subscriptionService.createSubscription(input.user.id);
    console.log('Subscription created:', subscription);
    return new StepResponse(subscription);
  }
);

// Define the workflow using Flowtify pattern
export const userOnboardingWorkflow = createWorkflow(
  'user-onboarding',
  function(input: { name: string }) {
    const user = createUserStep(input);
    const profile = createProfileStep({ user });
    const subscription = createSubscriptionStep({ user });
    
    return new WorkflowResponse({
      user,
      profile,
      subscription
    });
  }
);

// Execute workflow
async function runDemo() {
  try {
    const { result } = await userOnboardingWorkflow(container).run({
      input: { name: "John Doe" }
    });
    
    console.log("User onboarding completed successfully:", result);
  } catch (error) {
    console.error("Workflow failed:", error);
  }
}

runDemo();