import 'reflect-metadata';
import { Container, Token } from 'typedi';
import { WorkflowContainer, ContainerAdapter, RegistrationOptions } from './types';

export class TypeDIWorkflowContainer implements WorkflowContainer {
  constructor(private container: typeof Container) {}

  resolve<T = any>(key: string | symbol): T {
    if (typeof key === 'string') {
      return this.container.get(key);
    } else {
      return this.container.get(key as Token<T>);
    }
  }

  register<T = any>(key: string | symbol, value: T | (() => T), options?: RegistrationOptions): void {
    if (typeof value === 'function') {
      const factory = value as () => T;
      if (typeof key === 'string') {
        this.container.set({
          id: key,
          factory: () => factory(),
          multiple: false,
          global: options?.lifetime === 'singleton',
        });
      } else {
        this.container.set({
          id: key as Token<T>,
          factory: () => factory(),
          multiple: false,
          global: options?.lifetime === 'singleton',
        });
      }
    } else {
      if (typeof key === 'string') {
        this.container.set(key, value);
      } else {
        this.container.set(key as Token<T>, value);
      }
    }
  }

  has(key: string | symbol): boolean {
    if (typeof key === 'string') {
      return this.container.has(key);
    } else {
      return this.container.has(key as Token<any>);
    }
  }

  createScope(): WorkflowContainer {
    // TypeDI uses static Container, so we return the same instance
    // In real usage, you might want to use Container.of() with unique identifiers
    return new TypeDIWorkflowContainer(this.container);
  }

  async dispose(): Promise<void> {
    // TypeDI doesn't have a built-in dispose method
    // We'll track and clean up instances manually
    try {
      // Clear all registered services in this container instance
      if (this.container && typeof this.container.reset === 'function') {
        this.container.reset();
      }
    } catch (error) {
      console.warn('Failed to dispose TypeDI container:', error);
    }
  }
}

export class TypeDIAdapter implements ContainerAdapter<typeof Container> {
  from(container: typeof Container): WorkflowContainer {
    return new TypeDIWorkflowContainer(container);
  }

  create(options?: any): WorkflowContainer {
    // TypeDI uses a global static Container
    return new TypeDIWorkflowContainer(Container);
  }
}

export const typeDIAdapter = new TypeDIAdapter();