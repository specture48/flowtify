# Container Abstraction in Flowtify

Flowtify now supports multiple dependency injection containers through a unified abstraction layer. This allows you to use the workflow SDK with different DI containers like Awilix, TypeDI, or any other container that implements the `WorkflowContainer` interface.

## Container Interface

The core abstraction is the `WorkflowContainer` interface:

```typescript
interface WorkflowContainer {
  resolve<T = any>(key: string | symbol): T;
  register<T = any>(key: string | symbol, value: T | (() => T), options?: RegistrationOptions): void;
  has(key: string | symbol): boolean;
  createScope?(): WorkflowContainer;
  dispose?(): Promise<void>;
}
```

## Supported Containers

### Awilix (Default)

Awilix remains the default container for backward compatibility:

```typescript
import { createContainer } from 'awilix';
import { WorkflowBuilder, awilixAdapter } from 'flowtify';

const awilixContainer = createContainer();
const container = awilixAdapter.from(awilixContainer);

const workflow = new WorkflowBuilder(container);
```

### TypeDI (For NestJS Integration)

TypeDI is perfect for NestJS applications:

```typescript
import 'reflect-metadata';
import { Container } from 'typedi';
import { WorkflowBuilder, typeDIAdapter } from 'flowtify';

const container = typeDIAdapter.from(Container);
const workflow = new WorkflowBuilder(container);
```

## Migration Guide

### From Direct Awilix Usage

Before:
```typescript
import { AwilixContainer } from 'awilix';

interface WorkflowStep {
  execute: (input: any, context: any, container: AwilixContainer) => Promise<any>;
}
```

After:
```typescript
import { WorkflowContainer } from 'flowtify';

interface WorkflowStep {
  execute: (input: any, context: any, container: WorkflowContainer) => Promise<any>;
}
```

### Using with NestJS

```typescript
import { Injectable } from '@nestjs/common';
import { Container } from 'typedi';
import { WorkflowBuilder, typeDIAdapter } from 'flowtify';

@Injectable()
export class WorkflowService {
  private container = typeDIAdapter.from(Container);

  createOrderWorkflow() {
    return new WorkflowBuilder(this.container)
      .addStep('validateOrder', this.validateOrderStep)
      .addStep('processPayment', this.processPaymentStep)
      .addStep('shipOrder', this.shipOrderStep);
  }
}
```

## Creating Custom Adapters

To support additional DI containers, implement the `ContainerAdapter` interface:

```typescript
import { WorkflowContainer, ContainerAdapter } from 'flowtify';

class MyContainerAdapter implements ContainerAdapter<MyContainer> {
  from(container: MyContainer): WorkflowContainer {
    return {
      resolve: (key) => container.get(key),
      register: (key, value) => container.set(key, value),
      has: (key) => container.has(key),
      createScope: () => this.from(container.createChild()),
      dispose: async () => container.dispose()
    };
  }

  create(options?: any): WorkflowContainer {
    return this.from(new MyContainer(options));
  }
}
```

## Best Practices

1. **Container Initialization**: Initialize your container with all required services before creating workflows
2. **Type Safety**: Use TypeScript generics when resolving services for better type safety
3. **Scoping**: Use `createScope()` for request-scoped containers in web applications
4. **Disposal**: Always call `dispose()` when shutting down to clean up resources

## Examples

See the `examples/` directory for complete working examples:
- `awilix-example.ts` - Basic Awilix usage
- `typedi-example.ts` - TypeDI with decorators
- `nestjs-integration.ts` - NestJS integration pattern