import { WorkflowDefinition, WorkflowRunner } from './types';
import { LRURegistry } from './lru-registry';

class WorkflowRegistry {
  private workflows = new LRURegistry<string, WorkflowDefinition>(1000);

  register<TInput = any, TOutput = any>(workflow: WorkflowDefinition<TInput, TOutput>): void {
    this.workflows.set(workflow.id, workflow);
  }

  get<TInput = any, TOutput = any>(id: string): WorkflowDefinition<TInput, TOutput> | undefined {
    return this.workflows.get(id) as WorkflowDefinition<TInput, TOutput> | undefined;
  }

  has(id: string): boolean {
    return this.workflows.has(id);
  }

  getAll(): WorkflowDefinition[] {
    return this.workflows.values();
  }

  clear(): void {
    this.workflows.clear();
  }

  remove(id: string): boolean {
    return this.workflows.delete(id);
  }
}

export const workflowRegistry = new WorkflowRegistry();

export { WorkflowRegistry };