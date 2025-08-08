import { createStep, createWorkflow } from '../src/core/workflow-api';
import { StepResponse, WorkflowResponse } from '../src/core/workflow-api/response-classes';

describe('Integration Tests', () => {
  describe('End-to-End Workflow Execution', () => {
    it('should execute a simple workflow with steps', async () => {
      // Create steps
      const getUserStep = createStep('getUserStep', async (input: { userId: string }) => {
        return new StepResponse({ id: input.userId, name: 'John Doe', email: 'john@example.com' });
      });

      const validateUserStep = createStep('validateUserStep', async (user: any) => {
        if (!user.email) {
          return new StepResponse().permanentFailure();
        }
        return new StepResponse({ ...user, validated: true });
      });

      const sendWelcomeEmailStep = createStep('sendWelcomeEmailStep', async (user: any) => {
        // Simulate email sending
        return new StepResponse({ emailSent: true, emailId: 'email-123' });
      }, async (emailData: any) => {
        // Compensate by canceling email
        console.log('Canceling email', emailData.emailId);
      });

      // Create workflow
      const userOnboardingWorkflow = createWorkflow('userOnboarding', ({ userId }: { userId: string }) => {
        const user = getUserStep({ userId });
        const validatedUser = validateUserStep(user);
        const emailResult = sendWelcomeEmailStep(validatedUser);
        
        return new WorkflowResponse({
          user: validatedUser,
          emailResult
        });
      });

      // Execute workflow
      const runner = userOnboardingWorkflow();
      const result = await runner.run({
        input: { userId: 'user-123' },
        container: undefined
      });

      expect(result.result).toEqual({
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          validated: true
        },
        emailResult: {
          emailSent: true,
          emailId: 'email-123'
        }
      });
    });

    it('should handle step failures and compensation', async () => {
      const createUserStep = createStep('createUserStep', async (input: { name: string }) => {
        return new StepResponse({ id: 'user-123', name: input.name });
      }, async (user: any) => {
        console.log('Deleting user', user.id);
      });

      const sendEmailStep = createStep('sendEmailStep', async (user: any) => {
        throw new Error('Email service unavailable');
      });

      const failingWorkflow = createWorkflow('failingWorkflow', (input: { name: string }) => {
        const user = createUserStep(input);
        const emailResult = sendEmailStep(user);
        return new WorkflowResponse({ user, emailResult });
      });

      const runner = failingWorkflow();
      
      await expect(runner.run({
        input: { name: 'John' },
        container: undefined
      })).rejects.toThrow('Email service unavailable');
    });

    it('should skip steps with StepResponse.skip()', async () => {
      const conditionalStep = createStep('conditionalStep', async (input: { shouldExecute: boolean }) => {
        if (!input.shouldExecute) {
          return new StepResponse().skip();
        }
        return new StepResponse({ executed: true });
      });

      const finalStep = createStep('finalStep', async (previousResult: any) => {
        return new StepResponse({ final: true, previousWasSkipped: previousResult === null });
      });

      const workflowWithSkip = createWorkflow('workflowWithSkip', (input: { shouldExecute: boolean }) => {
        const conditionalResult = conditionalStep(input);
        const finalResult = finalStep(conditionalResult);
        return new WorkflowResponse({ conditionalResult, finalResult });
      });

      const runner = workflowWithSkip();
      const result = await runner.run({
        input: { shouldExecute: false },
        container: undefined
      });

      expect(result.result).toEqual({
        conditionalResult: null,
        finalResult: { final: true, previousWasSkipped: true }
      });
    });

    it('should handle permanent failures without compensation', async () => {
      let compensationCalled = false;

      const step1 = createStep('step1', async (input: any) => {
        return new StepResponse({ data: 'step1' });
      }, async () => {
        compensationCalled = true;
      });

      const step2 = createStep('step2', async (input: any) => {
        return new StepResponse().permanentFailure();
      });

      const workflowWithPermanentFailure = createWorkflow('permanentFailureWorkflow', (input: any) => {
        const result1 = step1(input);
        const result2 = step2(input);
        return new WorkflowResponse({ result1, result2 });
      });

      const runner = workflowWithPermanentFailure();
      
      await expect(runner.run({
        input: {},
        container: undefined
      })).rejects.toThrow('Step marked as permanent failure');

      // Compensation should not be called for permanent failures
      expect(compensationCalled).toBe(false);
    });

    it('should handle nested object results', async () => {
      const dataStep = createStep('dataStep', async (input: { type: string }) => {
        return new StepResponse({
          user: { id: 1, name: 'John' },
          preferences: { theme: 'dark', language: 'en' },
          metadata: { timestamp: Date.now() }
        });
      });

      const processDataStep = createStep('processDataStep', async (data: any) => {
        return new StepResponse({
          processedUser: { ...data.user, processed: true },
          settings: data.preferences
        });
      });

      const nestedWorkflow = createWorkflow('nestedWorkflow', (input: { type: string }) => {
        const data = dataStep(input);
        const processed = processDataStep(data);
        return new WorkflowResponse({
          originalData: data,
          processedData: processed
        });
      });

      const runner = nestedWorkflow();
      const result = await runner.run({
        input: { type: 'user' },
        container: undefined
      });

      expect(result.result.processedData.processedUser.processed).toBe(true);
      expect(result.result.originalData.user.name).toBe('John');
    });
  });

  describe('Error Handling', () => {
    it('should wrap and propagate step errors', async () => {
      const errorStep = createStep('errorStep', async (input: any) => {
        throw new Error('Step execution failed');
      });

      const errorWorkflow = createWorkflow('errorWorkflow', (input: any) => {
        const result = errorStep(input);
        return new WorkflowResponse(result);
      });

      const runner = errorWorkflow();
      
      await expect(runner.run({
        input: {},
        container: undefined
      })).rejects.toThrow('Step execution failed');
    });

    it('should validate workflow input', async () => {
      const simpleWorkflow = createWorkflow('simpleWorkflow', (input: any) => {
        return { result: input };
      });

      const runner = simpleWorkflow();
      
      await expect(runner.run({
        input: null,
        container: undefined
      })).rejects.toThrow();
    });
  });
});