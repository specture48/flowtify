import { WorkflowDefinition, WorkflowRunner } from './types';

class WorkflowRegistry {
  private workflows = new Map<string, WorkflowDefinition>();

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
    return Array.from(this.workflows.values());
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