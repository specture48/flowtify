/**
 * @flowtify/nestjs - NestJS integration for Flowtify workflow engine
 * 
 * This package provides a simple integration between Flowtify and NestJS,
 * allowing Flowtify workflows to use NestJS's dependency injection system.
 */

// Core module
export { FlowtifyModule } from './flowtify.module';

// NestJS-specific container implementation  
export { NestJSWorkflowContainer, createNestJSWorkflowContainer } from './nestjs-workflow-container';

// Interfaces and types
export {
  FlowtifyModuleOptions,
  FlowtifyModuleAsyncOptions,
  FlowtifyOptionsFactory,
  WorkflowContainer,
  FLOWTIFY_MODULE_OPTIONS,
  FLOWTIFY_WORKFLOW_CONTAINER
} from './interfaces';

// Re-export core Flowtify types for convenience
export {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  parallelize,
  when,
  transform,
  switchCase,
  FlowtifyWorkflow,
  configureWorkflows,
  getWorkflowConfig,
  // Export error types for better error handling
  FlowtifyError,
  WorkflowValidationError,
  StepValidationError,
  WorkflowExecutionError,
  StepExecutionError,
  WorkflowTimeoutError,
  StepTimeoutError,
  ContainerResolutionError,
  WorkflowRegistryError,
  ConfigurationError,
  MemoryError,
  CompensationError,
  ErrorUtils,
  ErrorFactory,
  // Export validation utilities
  validateWorkflowId,
  validateStepId,
  validateStepConfig,
  validateWorkflowConfig,
  validateWorkflowInput,
  validateExecutionContext,
  validateWorkflowSettings,
  assertValidation
} from 'flowtify';

export type { 
  WorkflowConfig,
  ValidationResult
} from 'flowtify';