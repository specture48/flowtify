/**
 * Global Workflow Registry for static workflow management
 * Global workflow management system
 */

import { WorkflowDefinition, ReturnWorkflow, WorkflowComposer } from './types';
import { createWorkflow } from './create-workflow';
import { LRURegistry } from './lru-registry';
import { memoryManager } from './memory-management';
import { validateWorkflowId, assertValidation } from './validation';
import { 
  ErrorUtils, 
  WorkflowRegistryError, 
  ErrorFactory 
} from './errors';

/**
 * Global workflow registry providing static methods for workflow management
 */
export class FlowtifyWorkflow {
  private static registry = new LRURegistry<string, any>(10000); // Default: 10k workflows
  private static maxWorkflows = 10000;

  /**
   * Register a workflow globally
   * @param workflowId - Unique identifier for the workflow
   * @param exportedWorkflow - The exported workflow function
   */
  static registerWorkflow<TData = any, TResult = any, THooks = any>(
    workflowId: string,
    exportedWorkflow: ReturnWorkflow<TData, TResult, THooks>
  ): void {
    try {
      // Validate workflow ID
      const idValidation = validateWorkflowId(workflowId);
      assertValidation(idValidation, 'Workflow registration');
      
      // Validate exported workflow
      if (!exportedWorkflow || typeof exportedWorkflow !== 'function') {
        throw new WorkflowRegistryError(
          'Exported workflow must be a function',
          'register',
          workflowId
        );
      }
      
      // Check if workflow already exists
      if (this.registry.has(workflowId)) {
        console.warn(`Workflow '${workflowId}' already exists. It will be replaced.`);
      }
      
      this.registry.set(workflowId, exportedWorkflow);
    } catch (error) {
      throw ErrorUtils.wrapError(error, `Failed to register workflow '${workflowId}'`);
    }
  }

  /**
   * Get a registered workflow by ID
   * @param workflowId - The workflow identifier
   * @returns The workflow function or undefined if not found
   */
  static getWorkflow<TData = any, TResult = any, THooks = any>(
    workflowId: string
  ): ReturnWorkflow<TData, TResult, THooks> | undefined {
    try {
      // Validate workflow ID
      const idValidation = validateWorkflowId(workflowId);
      if (!idValidation.isValid) {
        throw ErrorFactory.invalidWorkflowId(workflowId);
      }
      
      return this.registry.get(workflowId);
    } catch (error) {
      if (ErrorUtils.isFlowtifyError(error)) {
        throw error;
      }
      throw ErrorUtils.wrapError(error, `Failed to get workflow '${workflowId}'`);
    }
  }

  /**
   * Check if a workflow is registered
   * @param workflowId - The workflow identifier
   * @returns True if workflow exists
   */
  static hasWorkflow(workflowId: string): boolean {
    return this.registry.has(workflowId);
  }

  /**
   * Get all registered workflow IDs
   * @returns Array of workflow identifiers
   */
  static getAllWorkflowIds(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Remove a workflow from the registry
   * @param workflowId - The workflow identifier
   * @returns True if workflow was removed, false if it didn't exist
   */
  static removeWorkflow(workflowId: string): boolean {
    return this.registry.delete(workflowId);
  }

  /**
   * Clear all registered workflows
   */
  static clearAll(): void {
    this.registry.clear();
  }

  /**
   * Get the number of registered workflows
   * @returns Count of registered workflows
   */
  static count(): number {
    return this.registry.size();
  }

  /**
   * Configure the maximum registry size
   * @param maxSize - Maximum number of workflows to keep (default: 10,000)
   * @param recreateRegistry - Whether to recreate the registry with new size
   */
  static setMaxWorkflows(maxSize: number = 10000, recreateRegistry: boolean = false): void {
    try {
      // Validate maxSize
      if (typeof maxSize !== 'number' || maxSize < 1) {
        throw new WorkflowRegistryError(
          'maxSize must be a positive number',
          'setMaxWorkflows'
        );
      }
      
      if (maxSize > 10000000) {
        throw new WorkflowRegistryError(
          'maxSize cannot exceed 10 million workflows',
          'setMaxWorkflows'
        );
      }
      
      this.maxWorkflows = maxSize;
      
      if (recreateRegistry) {
        // Preserve existing workflows when recreating
        const existingWorkflows = new Map();
        for (const key of this.registry.keys()) {
          existingWorkflows.set(key, this.registry.get(key));
        }
        
        this.registry = new LRURegistry<string, any>(maxSize);
        
        // Restore workflows (LRU will handle overflow)
        for (const [key, value] of existingWorkflows) {
          this.registry.set(key, value);
        }
      } else if (this.registry.setMaxSize) {
        this.registry.setMaxSize(maxSize);
      }
    } catch (error) {
      throw ErrorUtils.wrapError(error, 'Failed to set max workflows');
    }
  }

  /**
   * Get the current maximum workflow limit
   * @returns Maximum number of workflows
   */
  static getMaxWorkflows(): number {
    return this.maxWorkflows;
  }

  /**
   * Get registry statistics
   * @returns Registry stats including size and fill ratio
   */
  static getStats(): any {
    return this.registry.getStats();
  }
}

/**
 * Create and automatically register a workflow globally
 * @param workflowId - Unique identifier for the workflow
 * @param composer - The workflow composer function
 * @returns The workflow function
 */
export function createAndRegisterWorkflow<TData = any, TResult = any, THooks = any>(
  workflowId: string,
  composer: WorkflowComposer<TData, TResult, THooks>
): ReturnWorkflow<TData, TResult, THooks> {
  const workflow = createWorkflow(workflowId, composer);
  FlowtifyWorkflow.registerWorkflow(workflowId, workflow);
  return workflow;
}

/**
 * Export a workflow for external use (similar to Medusa's exportWorkflow)
 * @param workflowId - The workflow identifier
 * @param composer - The workflow composer function
 * @returns Enhanced workflow with export capabilities
 */
export function exportWorkflow<TData = any, TResult = any, THooks = any>(
  workflowId: string,
  composer?: WorkflowComposer<TData, TResult, THooks>
): ExportedWorkflow<TData, TResult> {
  let workflow: ReturnWorkflow<TData, TResult, THooks>;
  
  if (composer) {
    // Create new workflow if composer provided
    workflow = createWorkflow(workflowId, composer);
    FlowtifyWorkflow.registerWorkflow(workflowId, workflow);
  } else {
    // Get existing workflow
    const existingWorkflow = FlowtifyWorkflow.getWorkflow<TData, TResult, THooks>(workflowId);
    if (!existingWorkflow) {
      throw new Error(`Workflow '${workflowId}' not found. Register it first or provide a composer.`);
    }
    workflow = existingWorkflow;
  }

  return {
    workflowId,
    
    run: async (input: { input: TData; [key: string]: any }) => {
      return await workflow().run(input);
    },

    runWithScope: async (scope: any, input: { input: TData; [key: string]: any }) => {
      return await workflow(scope).run(input);
    },

    registerStepSuccess: async (stepId: string, output: any, options?: any) => {
      // Placeholder for step success registration (advanced feature)
      console.warn('registerStepSuccess not yet implemented');
      return { success: true };
    },

    registerStepFailure: async (stepId: string, error: any, options?: any) => {
      // Placeholder for step failure registration (advanced feature)
      console.warn('registerStepFailure not yet implemented');
      return { success: true };
    },

    cancel: async (options?: any) => {
      // Placeholder for workflow cancellation (advanced feature)
      console.warn('cancel not yet implemented');
      return { cancelled: true };
    }
  };
}

/**
 * Create a contextual workflow runner that automatically uses a default container
 * @param workflowId - The workflow identifier
 * @param defaultContainer - Default container to use if none provided
 * @returns Contextual workflow runner
 */
export function createContextualWorkflowRunner<TData = any, TResult = any>(
  workflowId: string,
  defaultContainer?: any
) {
  return {
    run: async (input: { input: TData; [key: string]: any }) => {
      const workflow = FlowtifyWorkflow.getWorkflow<TData, TResult>(workflowId);
      if (!workflow) {
        throw new Error(`Workflow '${workflowId}' not found`);
      }
      return await workflow(defaultContainer).run(input);
    },

    runWithScope: async (scope: any, input: { input: TData; [key: string]: any }) => {
      const workflow = FlowtifyWorkflow.getWorkflow<TData, TResult>(workflowId);
      if (!workflow) {
        throw new Error(`Workflow '${workflowId}' not found`);
      }
      return await workflow(scope).run(input);
    }
  };
}

/**
 * Enhanced workflow interface with export capabilities
 */
export interface ExportedWorkflow<TData = any, TResult = any> {
  workflowId: string;
  run(input: { input: TData; [key: string]: any }): Promise<{ result: TResult }>;
  runWithScope(scope: any, input: { input: TData; [key: string]: any }): Promise<{ result: TResult }>;
  registerStepSuccess(stepId: string, output: any, options?: any): Promise<{ success: boolean }>;
  registerStepFailure(stepId: string, error: any, options?: any): Promise<{ success: boolean }>;
  cancel(options?: any): Promise<{ cancelled: boolean }>;
}