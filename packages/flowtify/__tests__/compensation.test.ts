import { createStep, createWorkflow } from '../src/core/workflow-api';
import { StepResponse, WorkflowResponse } from '../src/core/workflow-api/response-classes';

describe('Compensation Tests', () => {
  describe('Basic Compensation Behavior', () => {
    it('should call compensation functions when workflow fails', async () => {
      let step1CompensationCalled = false;
      let step2CompensationCalled = false;

      const step1 = createStep('step1', async (input: { data: string }) => {
        return new StepResponse({ id: 1, data: input.data });
      }, async (compensateInput: any) => {
        step1CompensationCalled = true;
      });

      const step2 = createStep('step2', async (input: any) => {
        return new StepResponse({ id: 2, processed: true });
      }, async (compensateInput: any) => {
        step2CompensationCalled = true;
      });

      const step3 = createStep('step3', async (input: any) => {
        throw new Error('Step 3 fails');
      });

      const compensationWorkflow = createWorkflow('compensationWorkflow', (input: { data: string }) => {
        const result1 = step1(input);
        const result2 = step2(result1);
        const result3 = step3(result2);
        return new WorkflowResponse({ result1, result2, result3 });
      });

      const runner = compensationWorkflow();
      
      await expect(runner.run({
        input: { data: 'test' },
        container: undefined
      })).rejects.toThrow('Step 3 fails');

      // Both compensation functions should have been called
      expect(step1CompensationCalled).toBe(true);
      expect(step2CompensationCalled).toBe(true);
    });

    it('should not compensate steps that never executed', async () => {
      let step1CompensationCalled = false;
      let step2CompensationCalled = false;

      const step1 = createStep('step1', async (input: { data: string }) => {
        throw new Error('Step 1 fails immediately');
      }, async (compensateInput: any) => {
        step1CompensationCalled = true;
      });

      const step2 = createStep('step2', async (input: any) => {
        return new StepResponse({ processed: true });
      }, async (compensateInput: any) => {
        step2CompensationCalled = true;
      });

      const noCompensationWorkflow = createWorkflow('noCompensationWorkflow', (input: { data: string }) => {
        const result1 = step1(input);
        const result2 = step2(result1);
        return new WorkflowResponse({ result1, result2 });
      });

      const runner = noCompensationWorkflow();
      
      await expect(runner.run({
        input: { data: 'test' },
        container: undefined
      })).rejects.toThrow('Step 1 fails immediately');

      // No compensation should occur since step1 failed and step2 never executed
      expect(step1CompensationCalled).toBe(false);
      expect(step2CompensationCalled).toBe(false);
    });
  });

  describe('Compensation Input Handling', () => {
    it('should pass correct compensate input to compensation functions', async () => {
      let step1CompensateInput: any;
      let step2CompensateInput: any;

      const step1 = createStep('step1', async (input: { userId: string }) => {
        const result = { id: 1, userId: input.userId, created: true };
        return new StepResponse(result, { userId: input.userId }); // Custom compensate input
      }, async (compensateInput: any) => {
        step1CompensateInput = compensateInput;
      });

      const step2 = createStep('step2', async (input: any) => {
        const result = { id: 2, processed: true };
        return new StepResponse(result); // No custom compensate input
      }, async (compensateInput: any) => {
        step2CompensateInput = compensateInput;
      });

      const step3 = createStep('step3', async (input: any) => {
        throw new Error('Step 3 fails');
      });

      const compensateInputWorkflow = createWorkflow('compensateInputWorkflow', (input: { userId: string }) => {
        const result1 = step1(input);
        const result2 = step2(result1);
        const result3 = step3(result2);
        return new WorkflowResponse({ result1, result2, result3 });
      });

      const runner = compensateInputWorkflow();
      
      await expect(runner.run({
        input: { userId: 'user123' },
        container: undefined
      })).rejects.toThrow('Step 3 fails');

      // Check that correct compensate inputs were passed
      expect(step1CompensateInput).toEqual({ userId: 'user123' }); // Custom compensate input
      expect(step2CompensateInput).toEqual({ id: 2, processed: true }); // Output used as compensate input
    });
  });

  describe('Permanent Failures', () => {
    it('should not trigger compensation for permanent failures', async () => {
      let step1CompensationCalled = false;
      let step2CompensationCalled = false;

      const step1 = createStep('step1', async (input: { data: string }) => {
        return new StepResponse({ id: 1, data: input.data });
      }, async (compensateInput: any) => {
        step1CompensationCalled = true;
      });

      const step2 = createStep('step2', async (input: any) => {
        return new StepResponse().permanentFailure();
      }, async (compensateInput: any) => {
        step2CompensationCalled = true;
      });

      const permanentFailureWorkflow = createWorkflow('permanentFailureWorkflow', (input: { data: string }) => {
        const result1 = step1(input);
        const result2 = step2(result1);
        return new WorkflowResponse({ result1, result2 });
      });

      const runner = permanentFailureWorkflow();
      
      await expect(runner.run({
        input: { data: 'test' },
        container: undefined
      })).rejects.toThrow('Step marked as permanent failure');

      // No compensation should occur for permanent failures
      expect(step1CompensationCalled).toBe(false);
      expect(step2CompensationCalled).toBe(false);
    });
  });

  describe('Skipped Steps', () => {
    it('should not compensate skipped steps', async () => {
      let step1CompensationCalled = false;
      let step2CompensationCalled = false;
      let step3CompensationCalled = false;

      const step1 = createStep('step1', async (input: { data: string }) => {
        return new StepResponse({ id: 1, data: input.data });
      }, async (compensateInput: any) => {
        step1CompensationCalled = true;
      });

      const step2 = createStep('step2', async (input: any) => {
        return new StepResponse().skip();
      }, async (compensateInput: any) => {
        step2CompensationCalled = true;
      });

      const step3 = createStep('step3', async (input: any) => {
        return new StepResponse({ id: 3, processed: true });
      }, async (compensateInput: any) => {
        step3CompensationCalled = true;
      });

      const step4 = createStep('step4', async (input: any) => {
        throw new Error('Step 4 fails');
      });

      const skippedStepWorkflow = createWorkflow('skippedStepWorkflow', (input: { data: string }) => {
        const result1 = step1(input);
        const result2 = step2(result1);
        const result3 = step3(result2);
        const result4 = step4(result3);
        return new WorkflowResponse({ result1, result2, result3, result4 });
      });

      const runner = skippedStepWorkflow();
      
      await expect(runner.run({
        input: { data: 'test' },
        container: undefined
      })).rejects.toThrow('Step 4 fails');

      // step1 and step3 should be compensated, but not step2 (skipped)
      expect(step1CompensationCalled).toBe(true);
      expect(step2CompensationCalled).toBe(false);
      expect(step3CompensationCalled).toBe(true);
    });
  });

  describe('Steps Without Compensation', () => {
    it('should handle steps that have no compensate function', async () => {
      let step1CompensationCalled = false;
      let step3CompensationCalled = false;

      const step1 = createStep('step1', async (input: { data: string }) => {
        return new StepResponse({ id: 1, data: input.data });
      }, async (compensateInput: any) => {
        step1CompensationCalled = true;
      });

      // Step without compensation function
      const step2 = createStep('step2', async (input: any) => {
        return new StepResponse({ id: 2, processed: true });
      });

      const step3 = createStep('step3', async (input: any) => {
        return new StepResponse({ id: 3, final: true });
      }, async (compensateInput: any) => {
        step3CompensationCalled = true;
      });

      const step4 = createStep('step4', async (input: any) => {
        throw new Error('Step 4 fails');
      });

      const mixedCompensationWorkflow = createWorkflow('mixedCompensationWorkflow', (input: { data: string }) => {
        const result1 = step1(input);
        const result2 = step2(result1);
        const result3 = step3(result2);
        const result4 = step4(result3);
        return new WorkflowResponse({ result1, result2, result3, result4 });
      });

      const runner = mixedCompensationWorkflow();
      
      await expect(runner.run({
        input: { data: 'test' },
        container: undefined
      })).rejects.toThrow('Step 4 fails');

      // Only steps with compensation functions should be called
      expect(step1CompensationCalled).toBe(true);
      expect(step3CompensationCalled).toBe(true);
    });
  });

  describe('Compensation Error Handling', () => {
    it('should continue compensation even if some compensation functions fail', async () => {
      let step1CompensationCalled = false;
      let step2CompensationAttempted = false;
      let step3CompensationCalled = false;
      
      // Mock console.error to suppress error logging during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const step1 = createStep('step1', async (input: { data: string }) => {
        return new StepResponse({ id: 1, data: input.data });
      }, async (compensateInput: any) => {
        step1CompensationCalled = true;
      });

      const step2 = createStep('step2', async (input: any) => {
        return new StepResponse({ id: 2, processed: true });
      }, async (compensateInput: any) => {
        step2CompensationAttempted = true;
        throw new Error('Compensation failed for step2');
      });

      const step3 = createStep('step3', async (input: any) => {
        return new StepResponse({ id: 3, final: true });
      }, async (compensateInput: any) => {
        step3CompensationCalled = true;
      });

      const step4 = createStep('step4', async (input: any) => {
        throw new Error('Step 4 fails');
      });

      const compensationErrorWorkflow = createWorkflow('compensationErrorWorkflow', (input: { data: string }) => {
        const result1 = step1(input);
        const result2 = step2(result1);
        const result3 = step3(result2);
        const result4 = step4(result3);
        return new WorkflowResponse({ result1, result2, result3, result4 });
      });

      const runner = compensationErrorWorkflow();
      
      await expect(runner.run({
        input: { data: 'test' },
        container: undefined
      })).rejects.toThrow('Step 4 fails');

      // All compensation should be attempted despite step2 compensation failing
      expect(step1CompensationCalled).toBe(true);
      expect(step2CompensationAttempted).toBe(true);
      expect(step3CompensationCalled).toBe(true);

      // Check that compensation error was logged
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Real-World Scenario', () => {
    it('should handle a realistic user onboarding workflow with compensation', async () => {
      let userDeleted = false;
      let orderCanceled = false;
      let emailCanceled = false;

      const createUserStep = createStep('createUser', async (input: { name: string }) => {
        return new StepResponse({ userId: 'user123', name: input.name });
      }, async (compensateInput: any) => {
        userDeleted = true;
      });

      const createOrderStep = createStep('createOrder', async (user: any) => {
        return new StepResponse({ orderId: 'order456', userId: user.userId });
      }, async (compensateInput: any) => {
        orderCanceled = true;
      });

      const sendEmailStep = createStep('sendEmail', async (order: any) => {
        return new StepResponse({ emailId: 'email789', sent: true });
      }, async (compensateInput: any) => {
        emailCanceled = true;
      });

      const processPaymentStep = createStep('processPayment', async (order: any) => {
        throw new Error('Payment processing failed');
      });

      const onboardingWorkflow = createWorkflow('onboardingWorkflow', (input: { name: string }) => {
        const user = createUserStep(input);
        const order = createOrderStep(user);
        const email = sendEmailStep(order);
        const payment = processPaymentStep(order);
        return new WorkflowResponse({ user, order, email, payment });
      });

      const runner = onboardingWorkflow();
      
      await expect(runner.run({
        input: { name: 'John Doe' },
        container: undefined
      })).rejects.toThrow('Payment processing failed');

      // All previous steps should be compensated
      expect(userDeleted).toBe(true);
      expect(orderCanceled).toBe(true);
      expect(emailCanceled).toBe(true);
    });
  });
});