/**
 * Workflow configuration utilities
 */

import { FlowtifyWorkflow } from './global-workflow-registry';
import { validateWorkflowSettings, assertValidation } from './validation';
import { ErrorUtils, ConfigurationError } from './errors';

export interface WorkflowConfig {
  /**
   * Maximum number of workflows to keep in memory (default: 10,000)
   */
  maxWorkflows?: number;
  
  /**
   * Enable memory optimization features (default: true)
   */
  enableMemoryOptimization?: boolean;
  
  /**
   * Enable workflow performance metrics (default: false)
   */
  enableMetrics?: boolean;
}

/**
 * Configure Flowtify workflow engine
 * @param config - Configuration options
 */
export function configureWorkflows(config: WorkflowConfig = {}): void {
  try {
    // Validate configuration
    const validation = validateWorkflowSettings(config);
    assertValidation(validation, 'Workflow configuration');

    const {
      maxWorkflows = 10000,
      enableMemoryOptimization = true,
      enableMetrics = false
    } = config;

    // Set workflow registry size
    FlowtifyWorkflow.setMaxWorkflows(maxWorkflows, true);

    // Log configuration
    console.log(`🔧 Flowtify configured:`, {
      maxWorkflows,
      enableMemoryOptimization,
      enableMetrics
    });
  } catch (error) {
    throw ErrorUtils.wrapError(error, 'Failed to configure workflows');
  }
}

/**
 * Get current workflow configuration
 */
export function getWorkflowConfig(): {
  maxWorkflows: number;
  currentWorkflows: number;
  memoryUsage: string;
} {
  return {
    maxWorkflows: FlowtifyWorkflow.getMaxWorkflows(),
    currentWorkflows: FlowtifyWorkflow.count(),
    memoryUsage: `${FlowtifyWorkflow.count()}/${FlowtifyWorkflow.getMaxWorkflows()}`
  };
}