import { AwilixContainer, createContainer, asFunction, asValue, Lifetime } from 'awilix';
import { WorkflowContainer, ContainerAdapter, RegistrationOptions } from './types';

export class AwilixWorkflowContainer implements WorkflowContainer {
  constructor(private container: AwilixContainer) {}

  resolve<T = any>(key: string | symbol): T {
    return this.container.resolve(key as string);
  }

  register<T = any>(key: string | symbol, value: T | (() => T), options?: RegistrationOptions): void {
    const name = key as string;
    
    if (typeof value === 'function') {
      const lifetime = this.mapLifetime(options?.lifetime);
      this.container.register(name, asFunction(value as any).setLifetime(lifetime));
    } else {
      this.container.register(name, asValue(value));
    }
  }

  has(key: string | symbol): boolean {
    return this.container.hasRegistration(key as string);
  }

  createScope(): WorkflowContainer {
    return new AwilixWorkflowContainer(this.container.createScope());
  }

  async dispose(): Promise<void> {
    try {
      // Dispose of the container and all its registered services
      if (this.container && typeof this.container.dispose === 'function') {
        await this.container.dispose();
      }
      
      // Clear any cached instances
      if (this.container && typeof this.container.cache === 'object') {
        (this.container as any).cache?.clear?.();
      }
    } catch (error) {
      console.warn('Failed to dispose Awilix container:', error);
    }
  }

  private mapLifetime(lifetime?: string): typeof Lifetime[keyof typeof Lifetime] {
    switch (lifetime) {
      case 'singleton':
        return Lifetime.SINGLETON;
      case 'scoped':
        return Lifetime.SCOPED;
      case 'transient':
        return Lifetime.TRANSIENT;
      default:
        return Lifetime.SINGLETON;
    }
  }
}

export class AwilixAdapter implements ContainerAdapter<AwilixContainer> {
  from(container: AwilixContainer): WorkflowContainer {
    return new AwilixWorkflowContainer(container);
  }

  create(options?: any): WorkflowContainer {
    const container = createContainer(options);
    return new AwilixWorkflowContainer(container);
  }
}

export const awilixAdapter = new AwilixAdapter();