/**
 * Comprehensive error types for Flowtify workflows
 * Provides clear, actionable error messages for developers
 */

/**
 * Base error class for all Flowtify errors
 */
export class FlowtifyError extends Error {
  public readonly code: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(message: string, code?: string, context?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code || 'FLOWTIFY_ERROR';
    this.timestamp = new Date();
    this.context = context;
    
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, FlowtifyError.prototype);
  }

  /**
   * Convert error to JSON format
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      context: this.context
    };
  }

  /**
   * Get a developer-friendly error description
   */
  getDescription(): string {
    return `${this.name}: ${this.message} (Code: ${this.code})`;
  }
}

/**
 * Workflow-specific validation errors
 */
export class WorkflowValidationError extends FlowtifyError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'WORKFLOW_VALIDATION_ERROR', context);
    Object.setPrototypeOf(this, WorkflowValidationError.prototype);
  }
}

/**
 * Step-specific validation errors
 */
export class StepValidationError extends FlowtifyError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'STEP_VALIDATION_ERROR', context);
    Object.setPrototypeOf(this, StepValidationError.prototype);
  }
}

/**
 * Workflow execution errors
 */
export class WorkflowExecutionError extends FlowtifyError {
  public readonly workflowId: string;
  public readonly stepId?: string;
  public readonly originalError?: Error;

  constructor(message: string, workflowId: string, stepId?: string, originalError?: Error) {
    super(
      message, 
      'WORKFLOW_EXECUTION_ERROR', 
      { workflowId, stepId, originalError: originalError?.message }
    );
    this.workflowId = workflowId;
    this.stepId = stepId;
    this.originalError = originalError;
    Object.setPrototypeOf(this, WorkflowExecutionError.prototype);
  }
}

/**
 * Step execution errors
 */
export class StepExecutionError extends FlowtifyError {
  public readonly stepId: string;
  public readonly workflowId?: string;
  public readonly originalError?: Error;
  public readonly isPermanentFailure: boolean;

  constructor(
    message: string, 
    stepId: string, 
    workflowId?: string, 
    originalError?: Error,
    isPermanentFailure: boolean = false
  ) {
    super(
      message, 
      'STEP_EXECUTION_ERROR', 
      { stepId, workflowId, originalError: originalError?.message, isPermanentFailure }
    );
    this.stepId = stepId;
    this.workflowId = workflowId;
    this.originalError = originalError;
    this.isPermanentFailure = isPermanentFailure;
    Object.setPrototypeOf(this, StepExecutionError.prototype);
  }
}

/**
 * Workflow timeout errors
 */
export class WorkflowTimeoutError extends FlowtifyError {
  public readonly workflowId: string;
  public readonly timeoutMs: number;

  constructor(workflowId: string, timeoutMs: number) {
    super(
      `Workflow '${workflowId}' timed out after ${timeoutMs}ms`,
      'WORKFLOW_TIMEOUT_ERROR',
      { workflowId, timeoutMs }
    );
    this.workflowId = workflowId;
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, WorkflowTimeoutError.prototype);
  }
}

/**
 * Step timeout errors
 */
export class StepTimeoutError extends FlowtifyError {
  public readonly stepId: string;
  public readonly workflowId?: string;
  public readonly timeoutMs: number;

  constructor(stepId: string, timeoutMs: number, workflowId?: string) {
    super(
      `Step '${stepId}' timed out after ${timeoutMs}ms`,
      'STEP_TIMEOUT_ERROR',
      { stepId, timeoutMs, workflowId }
    );
    this.stepId = stepId;
    this.workflowId = workflowId;
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, StepTimeoutError.prototype);
  }
}

/**
 * Container resolution errors
 */
export class ContainerResolutionError extends FlowtifyError {
  public readonly serviceName: string;
  public readonly containerType?: string;

  constructor(serviceName: string, containerType?: string) {
    super(
      `Failed to resolve service '${serviceName}' from container${containerType ? ` (${containerType})` : ''}`,
      'CONTAINER_RESOLUTION_ERROR',
      { serviceName, containerType }
    );
    this.serviceName = serviceName;
    this.containerType = containerType;
    Object.setPrototypeOf(this, ContainerResolutionError.prototype);
  }
}

/**
 * Workflow registry errors
 */
export class WorkflowRegistryError extends FlowtifyError {
  public readonly operation: string;
  public readonly workflowId?: string;

  constructor(message: string, operation: string, workflowId?: string) {
    super(
      message,
      'WORKFLOW_REGISTRY_ERROR',
      { operation, workflowId }
    );
    this.operation = operation;
    this.workflowId = workflowId;
    Object.setPrototypeOf(this, WorkflowRegistryError.prototype);
  }
}

/**
 * Configuration errors
 */
export class ConfigurationError extends FlowtifyError {
  public readonly configKey?: string;
  public readonly configValue?: any;

  constructor(message: string, configKey?: string, configValue?: any) {
    super(
      message,
      'CONFIGURATION_ERROR',
      { configKey, configValue }
    );
    this.configKey = configKey;
    this.configValue = configValue;
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Memory management errors
 */
export class MemoryError extends FlowtifyError {
  public readonly memoryUsage?: number;
  public readonly limit?: number;

  constructor(message: string, memoryUsage?: number, limit?: number) {
    super(
      message,
      'MEMORY_ERROR',
      { memoryUsage, limit }
    );
    this.memoryUsage = memoryUsage;
    this.limit = limit;
    Object.setPrototypeOf(this, MemoryError.prototype);
  }
}

/**
 * Compensation errors
 */
export class CompensationError extends FlowtifyError {
  public readonly stepId: string;
  public readonly workflowId?: string;
  public readonly originalError?: Error;

  constructor(stepId: string, originalError?: Error, workflowId?: string) {
    super(
      `Compensation failed for step '${stepId}': ${originalError?.message || 'Unknown error'}`,
      'COMPENSATION_ERROR',
      { stepId, workflowId, originalError: originalError?.message }
    );
    this.stepId = stepId;
    this.workflowId = workflowId;
    this.originalError = originalError;
    Object.setPrototypeOf(this, CompensationError.prototype);
  }
}

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
  /**
   * Check if an error is a Flowtify error
   */
  static isFlowtifyError(error: any): error is FlowtifyError {
    return error instanceof FlowtifyError;
  }

  /**
   * Check if an error is retryable
   */
  static isRetryableError(error: any): boolean {
    if (error instanceof StepExecutionError) {
      return !error.isPermanentFailure;
    }
    
    if (error instanceof WorkflowTimeoutError || error instanceof StepTimeoutError) {
      return true;
    }
    
    if (error instanceof ContainerResolutionError) {
      return false; // Container issues are usually permanent
    }
    
    if (error instanceof WorkflowValidationError || error instanceof StepValidationError) {
      return false; // Validation errors are permanent
    }
    
    // For non-Flowtify errors, assume they might be retryable
    return !ErrorUtils.isFlowtifyError(error);
  }

  /**
   * Extract meaningful error message from any error
   */
  static extractErrorMessage(error: any): string {
    if (ErrorUtils.isFlowtifyError(error)) {
      return error.getDescription();
    }
    
    if (error instanceof Error) {
      return error.message;
    }
    
    if (typeof error === 'string') {
      return error;
    }
    
    return 'Unknown error occurred';
  }

  /**
   * Create a sanitized error object for logging
   */
  static sanitizeError(error: any): Record<string, any> {
    if (ErrorUtils.isFlowtifyError(error)) {
      return error.toJSON();
    }
    
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }
    
    return {
      name: 'UnknownError',
      message: String(error),
      originalValue: error
    };
  }

  /**
   * Wrap an unknown error into a FlowtifyError
   */
  static wrapError(error: any, context?: string): FlowtifyError {
    if (ErrorUtils.isFlowtifyError(error)) {
      return error;
    }
    
    const message = ErrorUtils.extractErrorMessage(error);
    const contextMessage = context ? `${context}: ${message}` : message;
    
    return new FlowtifyError(contextMessage, 'WRAPPED_ERROR', { originalError: error });
  }
}

/**
 * Error factory for creating common errors
 */
export class ErrorFactory {
  static workflowNotFound(workflowId: string): WorkflowRegistryError {
    return new WorkflowRegistryError(
      `Workflow '${workflowId}' not found in registry`,
      'get',
      workflowId
    );
  }

  static stepNotFound(stepId: string, workflowId?: string): StepExecutionError {
    return new StepExecutionError(
      `Step '${stepId}' not found`,
      stepId,
      workflowId
    );
  }

  static invalidWorkflowId(workflowId: any): WorkflowValidationError {
    return new WorkflowValidationError(
      `Invalid workflow ID: ${workflowId}. Must be a non-empty string containing only letters, numbers, underscores, and hyphens.`
    );
  }

  static invalidStepId(stepId: any): StepValidationError {
    return new StepValidationError(
      `Invalid step ID: ${stepId}. Must be a non-empty string containing only letters, numbers, underscores, and hyphens.`
    );
  }

  static containerServiceNotFound(serviceName: string, containerType?: string): ContainerResolutionError {
    return new ContainerResolutionError(serviceName, containerType);
  }

  static workflowExecutionFailed(workflowId: string, originalError: Error, stepId?: string): WorkflowExecutionError {
    return new WorkflowExecutionError(
      `Workflow execution failed: ${originalError.message}`,
      workflowId,
      stepId,
      originalError
    );
  }

  static stepExecutionFailed(stepId: string, originalError: Error, workflowId?: string, isPermanent: boolean = false): StepExecutionError {
    return new StepExecutionError(
      `Step execution failed: ${originalError.message}`,
      stepId,
      workflowId,
      originalError,
      isPermanent
    );
  }
}