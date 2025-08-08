/**
 * Memory management utilities for preventing memory leaks
 */

export interface CleanupConfig {
  transactionTTLHours?: number;
  maxWorkflowRegistrySize?: number;
  maxTransactionRegistrySize?: number;
  cleanupIntervalMinutes?: number;
  enableAutoCleanup?: boolean;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private cleanupInterval?: NodeJS.Timeout;
  private config: Required<CleanupConfig> = {
    transactionTTLHours: 24,
    maxWorkflowRegistrySize: 1000,
    maxTransactionRegistrySize: 10000,
    cleanupIntervalMinutes: 60,
    enableAutoCleanup: true
  };

  private constructor() {}

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  configure(config: CleanupConfig): void {
    this.config = { ...this.config, ...config };
    this.restartAutoCleanup();
  }

  startAutoCleanup(): void {
    if (!this.config.enableAutoCleanup) return;
    
    this.stopAutoCleanup();
    
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupIntervalMinutes * 60 * 1000);

    // Run immediately on start
    this.performCleanup();
  }

  stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  private restartAutoCleanup(): void {
    if (this.config.enableAutoCleanup) {
      this.startAutoCleanup();
    } else {
      this.stopAutoCleanup();
    }
  }

  async performCleanup(): Promise<void> {
    // Import at the top to avoid dynamic imports issue
    const { transactionTracker } = require('./transaction-tracking');
    const { workflowRegistry } = require('./workflow-registry');
    const { FlowtifyWorkflow } = require('./global-workflow-registry');

    // Clean up old transactions
    transactionTracker.cleanup(this.config.transactionTTLHours);

    // Check registry sizes and evict if needed
    this.checkAndEvictFromRegistries();
  }

  private checkAndEvictFromRegistries(): void {
    // This will be implemented with LRU logic
    // For now, we'll just monitor sizes
    const { workflowRegistry } = require('./workflow-registry');
    const { FlowtifyWorkflow } = require('./global-workflow-registry');
    
    const workflowCount = workflowRegistry.getAll().length;
    const globalWorkflowCount = FlowtifyWorkflow.count();
    
    if (workflowCount > this.config.maxWorkflowRegistrySize || 
        globalWorkflowCount > this.config.maxWorkflowRegistrySize) {
      console.warn(`Workflow registry size exceeded limit. Consider implementing LRU eviction.`);
    }
  }

  getMemoryStats(): {
    workflowRegistrySize: number;
    globalWorkflowRegistrySize: number;
    transactionStats: any;
    memoryUsage: NodeJS.MemoryUsage;
  } {
    const { workflowRegistry } = require('./workflow-registry');
    const { FlowtifyWorkflow } = require('./global-workflow-registry');
    const { transactionTracker } = require('./transaction-tracking');
    
    return {
      workflowRegistrySize: workflowRegistry.getAll().length,
      globalWorkflowRegistrySize: FlowtifyWorkflow.count(),
      transactionStats: transactionTracker.getStatistics(),
      memoryUsage: process.memoryUsage()
    };
  }

  dispose(): void {
    this.stopAutoCleanup();
  }
}

export const memoryManager = MemoryManager.getInstance();