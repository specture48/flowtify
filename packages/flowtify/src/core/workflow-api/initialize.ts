/**
 * Initialize Flowtify with memory management
 */

import { memoryManager } from './memory-management';

let initialized = false;

/**
 * Initialize Flowtify with automatic memory management
 * This should be called once at application startup
 * 
 * @param config - Optional configuration for memory management
 */
export function initializeFlowtify(config?: {
  enableAutoCleanup?: boolean;
  transactionTTLHours?: number;
  maxWorkflowRegistrySize?: number;
  cleanupIntervalMinutes?: number;
}): void {
  if (initialized) {
    console.warn('Flowtify already initialized. Updating configuration.');
  }

  if (config) {
    memoryManager.configure(config);
  }

  // Start automatic cleanup if enabled (default: true)
  if (config?.enableAutoCleanup !== false) {
    memoryManager.startAutoCleanup();
  }

  initialized = true;

  // Register shutdown handler to clean up resources
  if (typeof process !== 'undefined' && typeof process.on === 'function') {
    process.once('SIGINT', () => {
      shutdownFlowtify();
      process.exit(0);
    });
    
    process.once('SIGTERM', () => {
      shutdownFlowtify();
      process.exit(0);
    });
  }
}

/**
 * Shutdown Flowtify and clean up resources
 */
export function shutdownFlowtify(): void {
  memoryManager.dispose();
  initialized = false;
}