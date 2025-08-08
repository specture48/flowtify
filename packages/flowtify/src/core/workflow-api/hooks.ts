/**
 * Hooks system for workflow events and middleware
 * Workflow hook system
 */

import { WorkflowContainer } from '../container';

/**
 * Hook function signature
 */
export type HookFunction<TData = any, TResult = any> = (
  data: TData,
  context: HookExecutionContext
) => Promise<TResult> | TResult;

/**
 * Hook execution context
 */
export interface HookExecutionContext {
  container?: WorkflowContainer;
  metadata?: Record<string, any>;
  workflowId?: string;
  stepId?: string;
}

/**
 * Hook definition interface
 */
export interface HookDefinition<TData = any, TResult = any> {
  id: string;
  hookFn: HookFunction<TData, TResult>;
  cached?: boolean;
  priority?: number;
}

/**
 * Hook registry for managing hooks
 */
class HookRegistry {
  private hooks = new Map<string, HookDefinition[]>();
  private cache = new Map<string, any>();

  /**
   * Register a hook
   * @param hookName - Name of the hook
   * @param hookDef - Hook definition
   */
  register<TData = any, TResult = any>(
    hookName: string,
    hookDef: HookDefinition<TData, TResult>
  ): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    
    const hookList = this.hooks.get(hookName)!;
    hookList.push(hookDef);
    
    // Sort by priority (higher priority first)
    hookList.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Execute all hooks for a given name
   * @param hookName - Name of the hook
   * @param data - Data to pass to hooks
   * @param context - Execution context
   * @returns Array of hook results
   */
  async execute<TData = any, TResult = any>(
    hookName: string,
    data: TData,
    context: HookExecutionContext = {}
  ): Promise<TResult[]> {
    const hookList = this.hooks.get(hookName) || [];
    const results: TResult[] = [];

    for (const hookDef of hookList) {
      const cacheKey = `${hookName}:${hookDef.id}:${JSON.stringify(data)}`;
      
      if (hookDef.cached && this.cache.has(cacheKey)) {
        results.push(this.cache.get(cacheKey));
        continue;
      }

      try {
        const result = await hookDef.hookFn(data, context);
        results.push(result);
        
        if (hookDef.cached) {
          this.cache.set(cacheKey, result);
        }
      } catch (error) {
        console.error(`Hook '${hookDef.id}' in '${hookName}' failed:`, error);
        // Continue with other hooks even if one fails
      }
    }

    return results;
  }

  /**
   * Get all hooks for a name
   * @param hookName - Name of the hook
   * @returns Array of hook definitions
   */
  getHooks(hookName: string): HookDefinition[] {
    return this.hooks.get(hookName) || [];
  }

  /**
   * Remove a specific hook
   * @param hookName - Name of the hook
   * @param hookId - ID of the specific hook to remove
   * @returns True if hook was removed
   */
  remove(hookName: string, hookId: string): boolean {
    const hookList = this.hooks.get(hookName);
    if (!hookList) return false;

    const index = hookList.findIndex(h => h.id === hookId);
    if (index === -1) return false;

    hookList.splice(index, 1);
    
    // Clear related cache entries
    for (const [key] of this.cache) {
      if (key.startsWith(`${hookName}:${hookId}:`)) {
        this.cache.delete(key);
      }
    }
    
    return true;
  }

  /**
   * Clear all hooks for a name
   * @param hookName - Name of the hook
   */
  clear(hookName: string): void {
    this.hooks.delete(hookName);
    
    // Clear related cache entries
    for (const [key] of this.cache) {
      if (key.startsWith(`${hookName}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all hooks and cache
   */
  clearAll(): void {
    this.hooks.clear();
    this.cache.clear();
  }

  /**
   * Get all registered hook names
   * @returns Array of hook names
   */
  getAllHookNames(): string[] {
    return Array.from(this.hooks.keys());
  }
}

/**
 * Global hook registry instance
 */
export const hookRegistry = new HookRegistry();

/**
 * Create a hook function (similar to Medusa's createHook)
 * @param hookName - Name of the hook
 * @param data - Initial data for the hook
 * @returns Hook creator function
 */
export function createHook<TData = any>(
  hookName: string,
  data?: TData
): HookCreator<TData> {
  return {
    hookName,
    initialData: data,
    
    /**
     * Register a hook function
     * @param hookId - Unique identifier for this hook
     * @param hookFn - The hook function
     * @param options - Hook options
     */
    register<TResult = any>(
      hookId: string,
      hookFn: HookFunction<TData, TResult>,
      options?: {
        cached?: boolean;
        priority?: number;
      }
    ): void {
      hookRegistry.register(hookName, {
        id: hookId,
        hookFn,
        cached: options?.cached || false,
        priority: options?.priority || 0
      });
    },

    /**
     * Execute the hook with data
     * @param data - Data to pass to hook functions
     * @param context - Execution context
     * @returns Hook results
     */
    async run<TResult = any>(
      data?: TData,
      context?: HookExecutionContext
    ): Promise<TResult[]> {
      const hookData = data !== undefined ? data : this.initialData;
      return await hookRegistry.execute<TData, TResult>(hookName, hookData as TData, context || {});
    },

    /**
     * Get all registered hook functions for this hook
     * @returns Array of hook definitions
     */
    getRegistered(): HookDefinition<TData>[] {
      return hookRegistry.getHooks(hookName);
    },

    /**
     * Remove a specific hook function
     * @param hookId - ID of the hook to remove
     * @returns True if removed
     */
    remove(hookId: string): boolean {
      return hookRegistry.remove(hookName, hookId);
    },

    /**
     * Clear all hook functions for this hook
     */
    clear(): void {
      hookRegistry.clear(hookName);
    }
  };
}

/**
 * Hook creator interface
 */
export interface HookCreator<TData = any> {
  hookName: string;
  initialData?: TData;
  register<TResult = any>(
    hookId: string,
    hookFn: HookFunction<TData, TResult>,
    options?: { cached?: boolean; priority?: number }
  ): void;
  run<TResult = any>(
    data?: TData,
    context?: HookExecutionContext
  ): Promise<TResult[]>;
  getRegistered(): HookDefinition<TData>[];
  remove(hookId: string): boolean;
  clear(): void;
}

/**
 * Built-in workflow hooks
 */
export const WorkflowHooks = {
  /**
   * Called before workflow execution starts
   */
  beforeWorkflow: createHook<{ workflowId: string; input: any }>('workflow.before'),
  
  /**
   * Called after workflow execution completes
   */
  afterWorkflow: createHook<{ workflowId: string; result: any; duration: number }>('workflow.after'),
  
  /**
   * Called when workflow execution fails
   */
  onWorkflowError: createHook<{ workflowId: string; error: Error; input: any }>('workflow.error'),
  
  /**
   * Called before step execution
   */
  beforeStep: createHook<{ stepId: string; input: any; workflowId: string }>('step.before'),
  
  /**
   * Called after step execution
   */
  afterStep: createHook<{ stepId: string; output: any; duration: number; workflowId: string }>('step.after'),
  
  /**
   * Called when step execution fails
   */
  onStepError: createHook<{ stepId: string; error: Error; input: any; workflowId: string }>('step.error'),
  
  /**
   * Called during compensation
   */
  onCompensation: createHook<{ stepId: string; compensateInput: any; workflowId: string }>('step.compensate')
} as const;

/**
 * Utility to execute workflow hooks at specific points
 */
export class WorkflowHookExecutor {
  static async executeBeforeWorkflow(workflowId: string, input: any, context?: HookExecutionContext): Promise<void> {
    await WorkflowHooks.beforeWorkflow.run({ workflowId, input }, context);
  }

  static async executeAfterWorkflow(workflowId: string, result: any, duration: number, context?: HookExecutionContext): Promise<void> {
    await WorkflowHooks.afterWorkflow.run({ workflowId, result, duration }, context);
  }

  static async executeOnWorkflowError(workflowId: string, error: Error, input: any, context?: HookExecutionContext): Promise<void> {
    await WorkflowHooks.onWorkflowError.run({ workflowId, error, input }, context);
  }

  static async executeBeforeStep(stepId: string, input: any, workflowId: string, context?: HookExecutionContext): Promise<void> {
    await WorkflowHooks.beforeStep.run({ stepId, input, workflowId }, context);
  }

  static async executeAfterStep(stepId: string, output: any, duration: number, workflowId: string, context?: HookExecutionContext): Promise<void> {
    await WorkflowHooks.afterStep.run({ stepId, output, duration, workflowId }, context);
  }

  static async executeOnStepError(stepId: string, error: Error, input: any, workflowId: string, context?: HookExecutionContext): Promise<void> {
    await WorkflowHooks.onStepError.run({ stepId, error, input, workflowId }, context);
  }

  static async executeOnCompensation(stepId: string, compensateInput: any, workflowId: string, context?: HookExecutionContext): Promise<void> {
    await WorkflowHooks.onCompensation.run({ stepId, compensateInput, workflowId }, context);
  }
}