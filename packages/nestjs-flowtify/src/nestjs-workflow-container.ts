import { ModuleRef } from '@nestjs/core';
import { Scope } from '@nestjs/common';
import { WorkflowContainer } from './interfaces';

/**
 * NestJS-specific workflow container implementation
 * Integrates Flowtify with NestJS dependency injection
 */
export class NestJSWorkflowContainer implements WorkflowContainer {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly options?: {
      enableRequestScoping?: boolean;
      serviceMapping?: Record<string, string>;
    }
  ) {}

  /**
   * Resolve a service from NestJS container
   */
  resolve<T = any>(key: string | symbol): T {
    try {
      // Check for custom service mapping
      const mappedKey = this.getMappedKey(key);
      
      // Try to resolve from NestJS container
      if (this.options?.enableRequestScoping) {
        // Use request-scoped resolution if enabled
        return this.moduleRef.get(mappedKey, { strict: false });
      } else {
        // Use singleton resolution
        return this.moduleRef.get(mappedKey, { strict: false });
      }
    } catch (error) {
      throw new Error(`Failed to resolve service '${String(key)}' from NestJS container: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Register a service in the container
   * Note: NestJS containers are typically immutable at runtime,
   * so this mainly serves as a validation/mapping function
   */
  register<T = any>(
    key: string | symbol,
    value: T | (() => T),
    options?: { lifetime?: 'singleton' | 'scoped' | 'transient' }
  ): void {
    // NestJS handles registration through modules/providers
    // This could be used to register dynamic providers if needed
    console.warn(
      `Dynamic registration of '${String(key)}' requested. ` +
      `In NestJS, services should be registered through module providers.`
    );
  }

  /**
   * Check if a service exists in the container
   */
  has(key: string | symbol): boolean {
    try {
      const mappedKey = this.getMappedKey(key);
      this.moduleRef.get(mappedKey, { strict: false });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a new scoped container
   * In NestJS, this would typically create a new request scope
   */
  createScope(): WorkflowContainer {
    // Create a new instance with request scoping enabled
    return new NestJSWorkflowContainer(this.moduleRef, {
      ...this.options,
      enableRequestScoping: true
    });
  }

  /**
   * Dispose of container resources
   * In NestJS, cleanup is typically handled by the framework
   */
  async dispose(): Promise<void> {
    // NestJS handles cleanup automatically
    // Could potentially clear any custom caches or mappings here
  }

  /**
   * Get mapped service key if custom mapping exists
   */
  private getMappedKey(key: string | symbol): string | symbol {
    if (typeof key === 'string' && this.options?.serviceMapping) {
      return this.options.serviceMapping[key] || key;
    }
    return key;
  }
}

/**
 * Factory function to create NestJS workflow container
 */
export function createNestJSWorkflowContainer(
  moduleRef: ModuleRef,
  options?: {
    enableRequestScoping?: boolean;
    serviceMapping?: Record<string, string>;
  }
): NestJSWorkflowContainer {
  return new NestJSWorkflowContainer(moduleRef, options);
}