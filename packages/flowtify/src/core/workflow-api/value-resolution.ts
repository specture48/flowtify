/**
 * Value resolution utilities for complex workflow data handling
 * Provides utilities for resolving nested data structures and workflow-specific values
 */

/**
 * Workflow-specific symbols for special value types
 */
export const WorkflowSymbols = {
  STEP_RESULT: Symbol('step-result'),
  WORKFLOW_INPUT: Symbol('workflow-input'),
  CONTAINER_VALUE: Symbol('container-value'),
  DEFERRED_VALUE: Symbol('deferred-value')
} as const;

/**
 * Step result reference for lazy evaluation
 */
export interface StepResultReference {
  readonly __symbol: typeof WorkflowSymbols.STEP_RESULT;
  readonly stepId: string;
  readonly propertyPath?: string[];
}

/**
 * Workflow input reference
 */
export interface WorkflowInputReference {
  readonly __symbol: typeof WorkflowSymbols.WORKFLOW_INPUT;
  readonly propertyPath?: string[];
}

/**
 * Container value reference
 */
export interface ContainerValueReference {
  readonly __symbol: typeof WorkflowSymbols.CONTAINER_VALUE;
  readonly serviceKey: string | symbol;
  readonly propertyPath?: string[];
}

/**
 * Deferred value reference for complex computations
 */
export interface DeferredValueReference<T = any> {
  readonly __symbol: typeof WorkflowSymbols.DEFERRED_VALUE;
  readonly resolver: () => Promise<T> | T;
  readonly dependencies?: string[];
}

/**
 * Union type for all resolvable values
 */
export type ResolvableValue = 
  | StepResultReference 
  | WorkflowInputReference 
  | ContainerValueReference 
  | DeferredValueReference;

/**
 * Value resolution context
 */
export interface ValueResolutionContext {
  workflowInput?: any;
  stepResults?: Map<string, any>;
  container?: any;
  metadata?: Record<string, any>;
}

/**
 * Create a reference to a step result
 * @param stepId - The step identifier
 * @param propertyPath - Optional property path within the result
 * @returns Step result reference
 */
export function stepResult(stepId: string, propertyPath?: string[]): StepResultReference {
  return {
    __symbol: WorkflowSymbols.STEP_RESULT,
    stepId,
    propertyPath
  };
}

/**
 * Create a reference to workflow input
 * @param propertyPath - Optional property path within the input
 * @returns Workflow input reference
 */
export function workflowInput(propertyPath?: string[]): WorkflowInputReference {
  return {
    __symbol: WorkflowSymbols.WORKFLOW_INPUT,
    propertyPath
  };
}

/**
 * Create a reference to a container value
 * @param serviceKey - The service key to resolve from container
 * @param propertyPath - Optional property path within the service
 * @returns Container value reference
 */
export function containerValue(serviceKey: string | symbol, propertyPath?: string[]): ContainerValueReference {
  return {
    __symbol: WorkflowSymbols.CONTAINER_VALUE,
    serviceKey,
    propertyPath
  };
}

/**
 * Create a deferred value reference
 * @param resolver - Function to resolve the value
 * @param dependencies - Optional list of step dependencies
 * @returns Deferred value reference
 */
export function deferredValue<T>(
  resolver: () => Promise<T> | T,
  dependencies?: string[]
): DeferredValueReference<T> {
  return {
    __symbol: WorkflowSymbols.DEFERRED_VALUE,
    resolver,
    dependencies
  };
}

/**
 * Type guards for resolvable values
 */
export function isStepResultReference(value: any): value is StepResultReference {
  return value && 
         typeof value === 'object' && 
         value.__symbol === WorkflowSymbols.STEP_RESULT;
}

export function isWorkflowInputReference(value: any): value is WorkflowInputReference {
  return value && 
         typeof value === 'object' && 
         value.__symbol === WorkflowSymbols.WORKFLOW_INPUT;
}

export function isContainerValueReference(value: any): value is ContainerValueReference {
  return value && 
         typeof value === 'object' && 
         value.__symbol === WorkflowSymbols.CONTAINER_VALUE;
}

export function isDeferredValueReference(value: any): value is DeferredValueReference {
  return value && 
         typeof value === 'object' && 
         value.__symbol === WorkflowSymbols.DEFERRED_VALUE;
}

export function isResolvableValue(value: any): value is ResolvableValue {
  return isStepResultReference(value) ||
         isWorkflowInputReference(value) ||
         isContainerValueReference(value) ||
         isDeferredValueReference(value);
}

/**
 * Resolve a value using the provided context
 * @param value - The value to resolve
 * @param context - Resolution context
 * @returns Resolved value
 */
export async function resolveValue(value: any, context: ValueResolutionContext): Promise<any> {
  if (!isResolvableValue(value)) {
    // Handle nested objects and arrays
    if (value && typeof value === 'object') {
      if (Array.isArray(value)) {
        const resolvedArray = [];
        for (const item of value) {
          resolvedArray.push(await resolveValue(item, context));
        }
        return resolvedArray;
      } else {
        const resolvedObject: any = {};
        for (const [key, val] of Object.entries(value)) {
          resolvedObject[key] = await resolveValue(val, context);
        }
        return resolvedObject;
      }
    }
    return value;
  }

  if (isStepResultReference(value)) {
    const stepResult = context.stepResults?.get(value.stepId);
    if (stepResult === undefined) {
      throw new Error(`Step result not found: ${value.stepId}`);
    }
    return extractValueFromPath(stepResult, value.propertyPath);
  }

  if (isWorkflowInputReference(value)) {
    if (context.workflowInput === undefined) {
      throw new Error('Workflow input not available in resolution context');
    }
    return extractValueFromPath(context.workflowInput, value.propertyPath);
  }

  if (isContainerValueReference(value)) {
    if (!context.container) {
      throw new Error('Container not available in resolution context');
    }
    const service = context.container.resolve(value.serviceKey);
    return extractValueFromPath(service, value.propertyPath);
  }

  if (isDeferredValueReference(value)) {
    // Check if dependencies are satisfied
    if (value.dependencies) {
      for (const dep of value.dependencies) {
        if (!context.stepResults?.has(dep)) {
          throw new Error(`Deferred value dependency not satisfied: ${dep}`);
        }
      }
    }
    return await value.resolver();
  }

  return value;
}

/**
 * Extract a value from an object using a property path
 * @param obj - The object to extract from
 * @param propertyPath - Array of property names
 * @returns Extracted value
 */
export function extractValueFromPath(obj: any, propertyPath?: string[]): any {
  if (!propertyPath || propertyPath.length === 0) {
    return obj;
  }

  let current = obj;
  for (const prop of propertyPath) {
    if (current == null) {
      return undefined;
    }
    current = current[prop];
  }
  return current;
}

/**
 * Resolve multiple values in parallel
 * @param values - Array of values to resolve
 * @param context - Resolution context
 * @returns Array of resolved values
 */
export async function resolveValues(values: any[], context: ValueResolutionContext): Promise<any[]> {
  return await Promise.all(values.map(value => resolveValue(value, context)));
}

/**
 * Create a value resolver function bound to a specific context
 * @param context - Resolution context
 * @returns Resolver function
 */
export function createValueResolver(context: ValueResolutionContext) {
  return async (value: any) => resolveValue(value, context);
}

/**
 * Utility to create property path arrays from dot notation
 * @param path - Dot-separated property path (e.g., "user.profile.name")
 * @returns Array of property names
 */
export function createPropertyPath(path: string): string[] {
  return path.split('.').filter(Boolean);
}

/**
 * Deep clone an object while preserving resolvable value references
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepCloneWithReferences(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (isResolvableValue(obj)) {
    return obj; // Don't clone resolvable values
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepCloneWithReferences(item));
  }

  const cloned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    cloned[key] = deepCloneWithReferences(value);
  }
  return cloned;
}

/**
 * Check if an object contains any resolvable values
 * @param obj - Object to check
 * @returns True if contains resolvable values
 */
export function containsResolvableValues(obj: any): boolean {
  if (isResolvableValue(obj)) {
    return true;
  }

  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.some(item => containsResolvableValues(item));
    } else {
      return Object.values(obj).some(value => containsResolvableValues(value));
    }
  }

  return false;
}