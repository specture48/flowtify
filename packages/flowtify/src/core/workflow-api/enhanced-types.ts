/**
 * Enhanced type system with flow options and result types
 * Provides comprehensive typing for advanced workflow features
 */

import { WorkflowContainer } from '../container';
import { HookExecutionContext } from './hooks';
import { TransactionContext } from './transaction-tracking';

/**
 * Flow run options for workflow execution
 */
export interface FlowRunOptions<TData = any> {
  input: TData;
  container?: WorkflowContainer;
  scope?: any;
  transactionId?: string;
  eventGroupId?: string;
  metadata?: Record<string, any>;
  timeout?: number;
  retries?: number;
  hooks?: {
    beforeWorkflow?: (data: { workflowId: string; input: TData }) => Promise<void> | void;
    afterWorkflow?: (data: { workflowId: string; result: any; duration: number }) => Promise<void> | void;
    onError?: (data: { workflowId: string; error: Error; input: TData }) => Promise<void> | void;
  };
}

/**
 * Options for registering step success
 */
export interface FlowRegisterStepSuccessOptions {
  stepId: string;
  output: any;
  transactionId?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Options for registering step failure
 */
export interface FlowRegisterStepFailureOptions {
  stepId: string;
  error: Error | string;
  transactionId?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
  isPermanentFailure?: boolean;
}

/**
 * Options for workflow cancellation
 */
export interface FlowCancelOptions {
  reason?: string;
  transactionId?: string;
  metadata?: Record<string, any>;
  compensate?: boolean;
  timeout?: number;
}

/**
 * Comprehensive workflow result type
 */
export interface WorkflowResult<TResult = any> {
  result: TResult;
  transactionId?: string;
  eventGroupId?: string;
  duration: number;
  stepCount: number;
  successfulSteps: number;
  failedSteps: number;
  skippedSteps: number;
  metadata?: Record<string, any>;
  errors?: Array<{
    stepId: string;
    error: string;
    timestamp: Date;
  }>;
  timeline?: Array<{
    stepId: string;
    event: 'started' | 'completed' | 'failed' | 'skipped' | 'compensated';
    timestamp: Date;
    data?: any;
  }>;
}

/**
 * Enhanced step execution context with advanced features
 */
export interface EnhancedStepExecutionContext {
  container: WorkflowContainer;
  metadata?: Record<string, any>;
  workflowId: string;
  stepId: string;
  transactionContext?: TransactionContext;
  retry?: {
    attempt: number;
    maxAttempts: number;
    lastError?: Error;
  };
  timeout?: number;
  hooks?: HookExecutionContext;
  input?: any;
  previousStepResults?: Map<string, any>;
}

/**
 * Enhanced workflow execution context
 */
export interface EnhancedWorkflowExecutionContext {
  container?: WorkflowContainer;
  scope?: any;
  metadata?: Record<string, any>;
  transactionContext?: TransactionContext;
  timeout?: number;
  retries?: number;
  parallelism?: {
    maxConcurrency?: number;
    batchSize?: number;
  };
  hooks?: {
    beforeWorkflow?: Function;
    afterWorkflow?: Function;
    onError?: Function;
    beforeStep?: Function;
    afterStep?: Function;
    onStepError?: Function;
  };
}

/**
 * Step configuration options
 */
export interface StepConfiguration {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryBackoff?: 'linear' | 'exponential';
  idempotent?: boolean;
  critical?: boolean;
  async?: boolean;
  priority?: number;
  tags?: string[];
  description?: string;
}

/**
 * Workflow configuration options
 */
export interface WorkflowConfiguration {
  timeout?: number;
  retries?: number;
  maxParallelSteps?: number;
  persistState?: boolean;
  enableHooks?: boolean;
  enableTransaction?: boolean;
  description?: string;
  version?: string;
  tags?: string[];
  deprecated?: boolean;
}

/**
 * Enhanced step definition with configuration
 */
export interface EnhancedStepDefinition<TInvokeInput = any, TInvokeResultOutput = any, TCompensateInput = any> {
  id: string;
  invoke: (input: TInvokeInput, context: EnhancedStepExecutionContext) => Promise<TInvokeResultOutput> | TInvokeResultOutput;
  compensate?: (input: TCompensateInput, context: EnhancedStepExecutionContext) => Promise<void> | void;
  config?: StepConfiguration;
}

/**
 * Enhanced workflow definition with configuration
 */
export interface EnhancedWorkflowDefinition<TData = any, TResult = any, THooks = any> {
  id: string;
  composer: (input: TData) => TResult;
  config?: WorkflowConfiguration;
  dependencies?: string[];
  version?: string;
}

/**
 * Workflow execution plan
 */
export interface WorkflowExecutionPlan {
  workflowId: string;
  steps: Array<{
    stepId: string;
    dependencies: string[];
    parallel: boolean;
    conditionalOn?: string;
    transformInput?: boolean;
  }>;
  parallelGroups: Array<{
    groupId: string;
    stepIds: string[];
  }>;
  criticalPath: string[];
  estimatedDuration?: number;
}

/**
 * Step execution statistics
 */
export interface StepExecutionStats {
  stepId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  skippedExecutions: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  lastExecuted?: Date;
  errorRate: number;
}

/**
 * Workflow execution statistics
 */
export interface WorkflowExecutionStats {
  workflowId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  lastExecuted?: Date;
  successRate: number;
  stepStats: StepExecutionStats[];
}

/**
 * Workflow health status
 */
export interface WorkflowHealthStatus {
  workflowId: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  issues: Array<{
    type: 'performance' | 'reliability' | 'configuration' | 'dependency';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    stepId?: string;
  }>;
  metrics: {
    successRate: number;
    averageExecutionTime: number;
    errorRate: number;
    lastExecutionTime?: Date;
  };
  recommendations?: string[];
}

/**
 * Workflow dependency graph
 */
export interface WorkflowDependencyGraph {
  workflowId: string;
  nodes: Array<{
    id: string;
    type: 'step' | 'parallel' | 'conditional' | 'transform';
    config?: any;
  }>;
  edges: Array<{
    from: string;
    to: string;
    type: 'data' | 'control' | 'compensation';
    condition?: string;
  }>;
}

/**
 * Enhanced exported workflow interface
 */
export interface EnhancedExportedWorkflow<TData = any, TResult = any> {
  workflowId: string;
  version?: string;
  config?: WorkflowConfiguration;
  
  // Execution methods
  run(options: FlowRunOptions<TData>): Promise<WorkflowResult<TResult>>;
  runWithScope(scope: any, options: FlowRunOptions<TData>): Promise<WorkflowResult<TResult>>;
  
  // Step management methods
  registerStepSuccess(options: FlowRegisterStepSuccessOptions): Promise<{ success: boolean }>;
  registerStepFailure(options: FlowRegisterStepFailureOptions): Promise<{ success: boolean }>;
  
  // Control methods
  cancel(options?: FlowCancelOptions): Promise<{ cancelled: boolean }>;
  pause(transactionId: string): Promise<{ paused: boolean }>;
  resume(transactionId: string): Promise<{ resumed: boolean }>;
  
  // Inspection methods
  getExecutionPlan(): WorkflowExecutionPlan;
  getDependencyGraph(): WorkflowDependencyGraph;
  getStats(): WorkflowExecutionStats;
  getHealth(): WorkflowHealthStatus;
  
  // Configuration methods
  updateConfig(config: Partial<WorkflowConfiguration>): void;
  getConfig(): WorkflowConfiguration;
}

/**
 * Workflow registry interface with enhanced features
 */
export interface EnhancedWorkflowRegistry {
  register<TData = any, TResult = any>(workflow: EnhancedWorkflowDefinition<TData, TResult>): void;
  get<TData = any, TResult = any>(workflowId: string): EnhancedWorkflowDefinition<TData, TResult> | undefined;
  has(workflowId: string): boolean;
  remove(workflowId: string): boolean;
  getAll(): EnhancedWorkflowDefinition[];
  clear(): void;
  
  // Enhanced methods
  getByTag(tag: string): EnhancedWorkflowDefinition[];
  getByVersion(workflowId: string, version: string): EnhancedWorkflowDefinition | undefined;
  getVersions(workflowId: string): string[];
  deprecate(workflowId: string, version?: string): void;
  getStats(): Array<{ workflowId: string; executions: number; lastUsed: Date }>;
}

/**
 * Step registry interface with enhanced features
 */
export interface EnhancedStepRegistry {
  register<TInput = any, TOutput = any, TCompensate = any>(
    step: EnhancedStepDefinition<TInput, TOutput, TCompensate>
  ): void;
  get<TInput = any, TOutput = any, TCompensate = any>(
    stepId: string
  ): EnhancedStepDefinition<TInput, TOutput, TCompensate> | undefined;
  has(stepId: string): boolean;
  remove(stepId: string): boolean;
  getAll(): EnhancedStepDefinition[];
  clear(): void;
  
  // Enhanced methods
  getByTag(tag: string): EnhancedStepDefinition[];
  getCritical(): EnhancedStepDefinition[];
  getStats(): Array<{ stepId: string; usageCount: number; lastUsed: Date }>;
}

/**
 * Event types for workflow execution
 */
export enum WorkflowEventType {
  WORKFLOW_STARTED = 'workflow.started',
  WORKFLOW_COMPLETED = 'workflow.completed',
  WORKFLOW_FAILED = 'workflow.failed',
  WORKFLOW_CANCELLED = 'workflow.cancelled',
  WORKFLOW_PAUSED = 'workflow.paused',
  WORKFLOW_RESUMED = 'workflow.resumed',
  STEP_STARTED = 'step.started',
  STEP_COMPLETED = 'step.completed',
  STEP_FAILED = 'step.failed',
  STEP_SKIPPED = 'step.skipped',
  STEP_RETRYING = 'step.retrying',
  STEP_COMPENSATING = 'step.compensating',
  STEP_COMPENSATED = 'step.compensated'
}

/**
 * Workflow event data
 */
export interface WorkflowEvent {
  type: WorkflowEventType;
  workflowId: string;
  stepId?: string;
  transactionId?: string;
  timestamp: Date;
  data?: any;
  metadata?: Record<string, any>;
}