import { createContainer } from 'awilix';
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  awilixAdapter
} from '../src';

// Setup container with services (simulating Medusa modules)
const awilixContainer = createContainer();
awilixContainer.register({
  POS_MODULE: () => ({
    createBranches: async (input: any) => ({
      id: 'branch-123',
      name: input.name,
      store_id: input.store_id,
      created_at: new Date()
    })
  })
});

const container = awilixAdapter.from(awilixContainer);

// Define the input type for the workflow (exactly like Medusa)
export type CreateBranchWorkflowInput = {
  name: string;
  store_id: string;
};

// Step to create a branch (exactly like your example)
const createBranchStep = createStep(
  "create-branch",
  async (input: CreateBranchWorkflowInput, { container }) => {
    // Resolve the POS module service (simulating Medusa pattern)
    const posModuleService = container.resolve("POS_MODULE");

    const branch = await posModuleService.createBranches(input);
    return new StepResponse(branch, branch);
  },
);

// Define the workflow (exactly like your example)
export const createBranchWorkflow = createWorkflow(
  "create-branch",
  function (workflowInput: CreateBranchWorkflowInput) {
    const createdBranch = createBranchStep(workflowInput);

    return new WorkflowResponse(createdBranch);
  },
);

// Usage example
async function runExample() {
  try {
    const input: CreateBranchWorkflowInput = {
      name: "Downtown Branch",
      store_id: "store-456"
    };

    // Execute workflow with container scope
    const { result } = await createBranchWorkflow(container).run({
      input
    });

    console.log('Branch created successfully:', result);
  } catch (error) {
    console.error('Workflow failed:', error);
  }
}

runExample();