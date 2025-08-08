import { ModuleMetadata, Type } from '@nestjs/common';

// Re-export WorkflowContainer from flowtify
export { WorkflowContainer } from 'flowtify';

/**
 * Token for Flowtify module options
 */
export const FLOWTIFY_MODULE_OPTIONS = 'FLOWTIFY_MODULE_OPTIONS';

/**
 * Token for Flowtify workflow container
 */
export const FLOWTIFY_WORKFLOW_CONTAINER = 'FLOWTIFY_WORKFLOW_CONTAINER';

/**
 * Simple configuration options for Flowtify NestJS integration
 */
export interface FlowtifyModuleOptions {
  /**
   * Enable request scoping for workflow containers
   */
  enableRequestScoping?: boolean;
}

/**
 * Factory interface for creating Flowtify options
 */
export interface FlowtifyOptionsFactory {
  createFlowtifyOptions(): Promise<FlowtifyModuleOptions> | FlowtifyModuleOptions;
}

/**
 * Async configuration options for Flowtify module
 */
export interface FlowtifyModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Use existing provider
   */
  useExisting?: Type<FlowtifyOptionsFactory>;
  
  /**
   * Use class provider
   */
  useClass?: Type<FlowtifyOptionsFactory>;
  
  /**
   * Use factory function
   */
  useFactory?: (...args: any[]) => Promise<FlowtifyModuleOptions> | FlowtifyModuleOptions;
  
  /**
   * Dependencies to inject into factory
   */
  inject?: any[];
}