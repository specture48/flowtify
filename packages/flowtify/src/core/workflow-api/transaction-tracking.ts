/**
 * Transaction ID generation and tracking system
 * Provides unique transaction identifiers and event group tracking
 */

import { ulid } from 'ulid';
import { memoryManager } from './memory-management';

/**
 * Transaction information interface
 */
export interface TransactionInfo {
  transactionId: string;
  workflowId: string;
  eventGroupId?: string;
  createdAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  steps: StepTransactionInfo[];
  metadata?: Record<string, any>;
}

/**
 * Step transaction information
 */
export interface StepTransactionInfo {
  stepId: string;
  transactionId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'compensating' | 'compensated';
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
}

/**
 * Event group for tracking related workflows
 */
export interface EventGroup {
  eventGroupId: string;
  createdAt: Date;
  transactions: string[];
  metadata?: Record<string, any>;
}

/**
 * Transaction tracking registry
 */
class TransactionTracker {
  private transactions = new Map<string, TransactionInfo>();
  private eventGroups = new Map<string, EventGroup>();
  private stepTransactions = new Map<string, StepTransactionInfo>();

  /**
   * Generate a new transaction ID
   * @returns Unique transaction identifier
   */
  generateTransactionId(): string {
    return `txn_${ulid()}`;
  }

  /**
   * Generate a new event group ID
   * @returns Unique event group identifier
   */
  generateEventGroupId(): string {
    return `evg_${ulid()}`;
  }

  /**
   * Start a new transaction
   * @param workflowId - The workflow identifier
   * @param eventGroupId - Optional event group ID
   * @param metadata - Optional metadata
   * @returns Transaction information
   */
  startTransaction(
    workflowId: string,
    eventGroupId?: string,
    metadata?: Record<string, any>
  ): TransactionInfo {
    const transactionId = this.generateTransactionId();
    
    const transaction: TransactionInfo = {
      transactionId,
      workflowId,
      eventGroupId,
      createdAt: new Date(),
      status: 'pending',
      steps: [],
      metadata
    };

    this.transactions.set(transactionId, transaction);

    // Add to event group if specified
    if (eventGroupId) {
      this.addTransactionToEventGroup(eventGroupId, transactionId);
    }

    // Check if we need to trigger cleanup
    if (this.transactions.size > 1000) {
      // Async cleanup to not block transaction creation
      setImmediate(() => memoryManager.performCleanup());
    }

    return transaction;
  }

  /**
   * Update transaction status
   * @param transactionId - Transaction identifier
   * @param status - New status
   */
  updateTransactionStatus(
    transactionId: string,
    status: TransactionInfo['status']
  ): void {
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      transaction.status = status;
    }
  }

  /**
   * Start tracking a step
   * @param transactionId - Transaction identifier
   * @param stepId - Step identifier
   * @param input - Step input
   * @returns Step transaction info
   */
  startStep(transactionId: string, stepId: string, input?: any): StepTransactionInfo {
    const stepTransactionId = `${transactionId}_${stepId}`;
    
    const stepTransaction: StepTransactionInfo = {
      stepId,
      transactionId,
      startedAt: new Date(),
      status: 'running',
      input
    };

    this.stepTransactions.set(stepTransactionId, stepTransaction);

    // Add to transaction
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      transaction.steps.push(stepTransaction);
      if (transaction.status === 'pending') {
        transaction.status = 'running';
      }
    }

    return stepTransaction;
  }

  /**
   * Complete a step
   * @param transactionId - Transaction identifier
   * @param stepId - Step identifier
   * @param output - Step output
   * @param status - Final status
   */
  completeStep(
    transactionId: string,
    stepId: string,
    output?: any,
    status: StepTransactionInfo['status'] = 'completed'
  ): void {
    const stepTransactionId = `${transactionId}_${stepId}`;
    const stepTransaction = this.stepTransactions.get(stepTransactionId);
    
    if (stepTransaction) {
      stepTransaction.completedAt = new Date();
      stepTransaction.status = status;
      stepTransaction.output = output;
      stepTransaction.duration = stepTransaction.completedAt.getTime() - stepTransaction.startedAt.getTime();
    }
  }

  /**
   * Mark a step as failed
   * @param transactionId - Transaction identifier
   * @param stepId - Step identifier
   * @param error - Error message
   */
  failStep(transactionId: string, stepId: string, error: string): void {
    const stepTransactionId = `${transactionId}_${stepId}`;
    const stepTransaction = this.stepTransactions.get(stepTransactionId);
    
    if (stepTransaction) {
      stepTransaction.completedAt = new Date();
      stepTransaction.status = 'failed';
      stepTransaction.error = error;
      stepTransaction.duration = stepTransaction.completedAt.getTime() - stepTransaction.startedAt.getTime();
    }

    // Update transaction status
    this.updateTransactionStatus(transactionId, 'failed');
  }

  /**
   * Get transaction information
   * @param transactionId - Transaction identifier
   * @returns Transaction info or undefined
   */
  getTransaction(transactionId: string): TransactionInfo | undefined {
    return this.transactions.get(transactionId);
  }

  /**
   * Get all transactions for a workflow
   * @param workflowId - Workflow identifier
   * @returns Array of transactions
   */
  getTransactionsByWorkflow(workflowId: string): TransactionInfo[] {
    return Array.from(this.transactions.values())
      .filter(t => t.workflowId === workflowId);
  }

  /**
   * Create or get an event group
   * @param eventGroupId - Optional event group ID (generates new if not provided)
   * @param metadata - Optional metadata
   * @returns Event group
   */
  createEventGroup(eventGroupId?: string, metadata?: Record<string, any>): EventGroup {
    const id = eventGroupId || this.generateEventGroupId();
    
    if (this.eventGroups.has(id)) {
      return this.eventGroups.get(id)!;
    }

    const eventGroup: EventGroup = {
      eventGroupId: id,
      createdAt: new Date(),
      transactions: [],
      metadata
    };

    this.eventGroups.set(id, eventGroup);
    return eventGroup;
  }

  /**
   * Add a transaction to an event group
   * @param eventGroupId - Event group identifier
   * @param transactionId - Transaction identifier
   */
  addTransactionToEventGroup(eventGroupId: string, transactionId: string): void {
    let eventGroup = this.eventGroups.get(eventGroupId);
    
    if (!eventGroup) {
      eventGroup = this.createEventGroup(eventGroupId);
    }

    if (!eventGroup.transactions.includes(transactionId)) {
      eventGroup.transactions.push(transactionId);
    }
  }

  /**
   * Get event group information
   * @param eventGroupId - Event group identifier
   * @returns Event group or undefined
   */
  getEventGroup(eventGroupId: string): EventGroup | undefined {
    return this.eventGroups.get(eventGroupId);
  }

  /**
   * Get all transactions in an event group
   * @param eventGroupId - Event group identifier
   * @returns Array of transactions
   */
  getEventGroupTransactions(eventGroupId: string): TransactionInfo[] {
    const eventGroup = this.eventGroups.get(eventGroupId);
    if (!eventGroup) return [];

    return eventGroup.transactions
      .map(txnId => this.transactions.get(txnId))
      .filter(Boolean) as TransactionInfo[];
  }

  /**
   * Clean up old transactions and event groups
   * @param olderThanHours - Remove items older than this many hours
   */
  cleanup(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    // Clean up transactions
    for (const [id, transaction] of this.transactions) {
      if (transaction.createdAt < cutoffTime) {
        this.transactions.delete(id);
        
        // Clean up related step transactions
        for (const [stepId] of this.stepTransactions) {
          if (stepId.startsWith(id)) {
            this.stepTransactions.delete(stepId);
          }
        }
      }
    }

    // Clean up event groups
    for (const [id, eventGroup] of this.eventGroups) {
      if (eventGroup.createdAt < cutoffTime) {
        this.eventGroups.delete(id);
      }
    }
  }

  /**
   * Get transaction statistics
   * @returns Transaction statistics
   */
  getStatistics(): {
    totalTransactions: number;
    totalEventGroups: number;
    totalSteps: number;
    statusCounts: Record<string, number>;
  } {
    const statusCounts: Record<string, number> = {};
    
    for (const transaction of this.transactions.values()) {
      statusCounts[transaction.status] = (statusCounts[transaction.status] || 0) + 1;
    }

    return {
      totalTransactions: this.transactions.size,
      totalEventGroups: this.eventGroups.size,
      totalSteps: this.stepTransactions.size,
      statusCounts
    };
  }
}

/**
 * Global transaction tracker instance
 */
export const transactionTracker = new TransactionTracker();

/**
 * Transaction context for workflow execution
 */
export class TransactionContext {
  constructor(
    public readonly transactionId: string,
    public readonly workflowId: string,
    public readonly eventGroupId?: string
  ) {}

  /**
   * Start tracking a step
   * @param stepId - Step identifier
   * @param input - Step input
   * @returns Step transaction info
   */
  startStep(stepId: string, input?: any): StepTransactionInfo {
    return transactionTracker.startStep(this.transactionId, stepId, input);
  }

  /**
   * Complete a step
   * @param stepId - Step identifier
   * @param output - Step output
   * @param status - Final status
   */
  completeStep(
    stepId: string,
    output?: any,
    status: StepTransactionInfo['status'] = 'completed'
  ): void {
    transactionTracker.completeStep(this.transactionId, stepId, output, status);
  }

  /**
   * Mark a step as failed
   * @param stepId - Step identifier
   * @param error - Error message
   */
  failStep(stepId: string, error: string): void {
    transactionTracker.failStep(this.transactionId, stepId, error);
  }

  /**
   * Get transaction information
   * @returns Transaction info
   */
  getTransaction(): TransactionInfo | undefined {
    return transactionTracker.getTransaction(this.transactionId);
  }

  /**
   * Update transaction status
   * @param status - New status
   */
  updateStatus(status: TransactionInfo['status']): void {
    transactionTracker.updateTransactionStatus(this.transactionId, status);
  }
}

/**
 * Create a new transaction context
 * @param workflowId - Workflow identifier
 * @param eventGroupId - Optional event group ID
 * @param metadata - Optional metadata
 * @returns Transaction context
 */
export function createTransactionContext(
  workflowId: string,
  eventGroupId?: string,
  metadata?: Record<string, any>
): TransactionContext {
  const transaction = transactionTracker.startTransaction(workflowId, eventGroupId, metadata);
  return new TransactionContext(transaction.transactionId, workflowId, eventGroupId);
}