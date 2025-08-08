/**
 * Comprehensive input validation utilities for Flowtify workflows
 */

import { WorkflowComposer } from './types';
import { FlowtifyError, WorkflowValidationError, StepValidationError } from './errors';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate workflow ID
 */
export function validateWorkflowId(workflowId: any): ValidationResult {
  const errors: string[] = [];

  if (workflowId === null || workflowId === undefined) {
    errors.push('Workflow ID cannot be null or undefined');
  } else if (typeof workflowId !== 'string') {
    errors.push('Workflow ID must be a string');
  } else if (workflowId.trim().length === 0) {
    errors.push('Workflow ID cannot be empty');
  } else if (workflowId.length > 200) {
    errors.push('Workflow ID cannot exceed 200 characters');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(workflowId)) {
    errors.push('Workflow ID can only contain letters, numbers, underscores, and hyphens');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate step ID
 */
export function validateStepId(stepId: any): ValidationResult {
  const errors: string[] = [];

  if (stepId === null || stepId === undefined) {
    errors.push('Step ID cannot be null or undefined');
  } else if (typeof stepId !== 'string') {
    errors.push('Step ID must be a string');
  } else if (stepId.trim().length === 0) {
    errors.push('Step ID cannot be empty');
  } else if (stepId.length > 100) {
    errors.push('Step ID cannot exceed 100 characters');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(stepId)) {
    errors.push('Step ID can only contain letters, numbers, underscores, and hyphens');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate step configuration
 */
export function validateStepConfig(nameOrConfig: any, invokeFn?: any, compensateFn?: any): ValidationResult {
  const errors: string[] = [];

  // Validate nameOrConfig
  if (typeof nameOrConfig === 'string') {
    const idValidation = validateStepId(nameOrConfig);
    if (!idValidation.isValid) {
      errors.push(...idValidation.errors);
    }
  } else if (typeof nameOrConfig === 'object' && nameOrConfig !== null) {
    if (nameOrConfig.name) {
      const idValidation = validateStepId(nameOrConfig.name);
      if (!idValidation.isValid) {
        errors.push(...idValidation.errors);
      }
    }
  } else {
    errors.push('Step name or config must be a string or object');
  }

  // Validate invokeFn
  if (invokeFn === null || invokeFn === undefined) {
    errors.push('Invoke function is required');
  } else if (typeof invokeFn !== 'function') {
    errors.push('Invoke function must be a function');
  }

  // Validate compensateFn if provided
  if (compensateFn !== undefined && typeof compensateFn !== 'function') {
    errors.push('Compensate function must be a function if provided');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate workflow configuration
 */
export function validateWorkflowConfig(nameOrConfig: any, composer?: WorkflowComposer): ValidationResult {
  const errors: string[] = [];

  // Validate nameOrConfig
  if (typeof nameOrConfig === 'string') {
    const idValidation = validateWorkflowId(nameOrConfig);
    if (!idValidation.isValid) {
      errors.push(...idValidation.errors);
    }
  } else if (typeof nameOrConfig === 'object' && nameOrConfig !== null) {
    if (nameOrConfig.name) {
      const idValidation = validateWorkflowId(nameOrConfig.name);
      if (!idValidation.isValid) {
        errors.push(...idValidation.errors);
      }
    } else {
      errors.push('Workflow config object must have a name property');
    }
  } else {
    errors.push('Workflow name or config must be a string or object');
  }

  // Validate composer
  if (composer === null || composer === undefined) {
    errors.push('Workflow composer function is required');
  } else if (typeof composer !== 'function') {
    errors.push('Workflow composer must be a function');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate workflow input data
 */
export function validateWorkflowInput(input: any): ValidationResult {
  const errors: string[] = [];

  if (input === null || input === undefined) {
    errors.push('Workflow input cannot be null or undefined');
  } else if (typeof input === 'function') {
    errors.push('Workflow input cannot be a function');
  } else if (input instanceof Date && isNaN(input.getTime())) {
    errors.push('Workflow input contains invalid date');
  }

  // Check for circular references
  try {
    JSON.stringify(input);
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('circular')) {
      errors.push('Workflow input contains circular references');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate execution context
 */
export function validateExecutionContext(context: any): ValidationResult {
  const errors: string[] = [];

  if (context && typeof context !== 'object') {
    errors.push('Execution context must be an object if provided');
  }

  if (context?.metadata && typeof context.metadata !== 'object') {
    errors.push('Execution context metadata must be an object if provided');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate workflow configuration settings
 */
export function validateWorkflowSettings(config: any): ValidationResult {
  const errors: string[] = [];

  if (config && typeof config !== 'object') {
    errors.push('Workflow configuration must be an object if provided');
  }

  if (config?.maxWorkflows !== undefined) {
    if (typeof config.maxWorkflows !== 'number' || config.maxWorkflows < 1) {
      errors.push('maxWorkflows must be a positive number');
    } else if (config.maxWorkflows > 10000000) {
      errors.push('maxWorkflows cannot exceed 10 million');
    }
  }

  if (config?.enableMemoryOptimization !== undefined && typeof config.enableMemoryOptimization !== 'boolean') {
    errors.push('enableMemoryOptimization must be a boolean');
  }

  if (config?.enableMetrics !== undefined && typeof config.enableMetrics !== 'boolean') {
    errors.push('enableMetrics must be a boolean');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Assert validation result and throw appropriate error
 */
export function assertValidation(result: ValidationResult, context: string): void {
  if (!result.isValid) {
    const errorMessage = `${context}: ${result.errors.join(', ')}`;
    
    if (context.toLowerCase().includes('workflow')) {
      throw new WorkflowValidationError(errorMessage);
    } else if (context.toLowerCase().includes('step')) {
      throw new StepValidationError(errorMessage);
    } else {
      throw new FlowtifyError(errorMessage);
    }
  }
}

/**
 * Validate and sanitize string input
 */
export function sanitizeStringInput(input: any, maxLength: number = 1000): string {
  if (typeof input !== 'string') {
    throw new FlowtifyError('Input must be a string');
  }
  
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new FlowtifyError('Input cannot be empty');
  }
  
  if (trimmed.length > maxLength) {
    throw new FlowtifyError(`Input cannot exceed ${maxLength} characters`);
  }
  
  return trimmed;
}

/**
 * Deep validation of nested objects
 */
export function validateNestedObject(obj: any, path: string = 'root', maxDepth: number = 10, currentDepth: number = 0): ValidationResult {
  const errors: string[] = [];
  
  if (currentDepth > maxDepth) {
    errors.push(`Object nesting exceeds maximum depth of ${maxDepth} at ${path}`);
    return { isValid: false, errors };
  }
  
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = `${path}.${key}`;
      
      if (typeof value === 'object' && value !== null) {
        const nestedResult = validateNestedObject(value, currentPath, maxDepth, currentDepth + 1);
        if (!nestedResult.isValid) {
          errors.push(...nestedResult.errors);
        }
      }
    }
  }
  
  return { isValid: errors.length === 0, errors };
}