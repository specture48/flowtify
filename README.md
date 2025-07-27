# Flowtify

`Flowtify` is a container-agnostic TypeScript workflow SDK that provides exact compatibility with Medusa's workflow API while supporting multiple dependency injection containers (Awilix, TypeDI for NestJS integration).

---

## Features

- **Exact Medusa Compatibility:** Drop-in replacement for Medusa workflows SDK
- **Container Agnostic:** Support for Awilix, TypeDI, and easy extensibility for other DI containers
- **Type Safety:** Full TypeScript support with automatic type inference between steps
- **Step Composition:** Natural function-call syntax for step chaining
- **Error Handling & Compensation:** Automatic rollback with compensation functions
- **NestJS Integration:** First-class TypeDI support for seamless NestJS integration
- **Performance Optimized:** Clean, focused implementation without unnecessary complexity

---

## Installation

Install the package using npm or yarn:

```bash
npm install flowtify
```

or

```bash
yarn add flowtify
```

---

## Quick Start

### Basic Workflow Example

```typescript
import { createContainer } from 'awilix';
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  awilixAdapter
} from 'flowtify';

// Setup container
const container = awilixAdapter.from(createContainer());

// Define workflow steps
const createUserStep = createStep(
  'create-user',
  async (input: { name: string }, { container }) => {
    const userService = container.resolve('userService');
    const user = await userService.createUser(input);
    return new StepResponse(user);
  }
);

const createProfileStep = createStep(
  'create-profile',
  async (input: { user: any }, { container }) => {
    const profileService = container.resolve('profileService');
    const profile = await profileService.createProfile(input.user.id);
    return new StepResponse(profile);
  }
);

// Define the workflow
export const userOnboardingWorkflow = createWorkflow(
  'user-onboarding',
  function(input: { name: string }) {
    const user = createUserStep(input);
    const profile = createProfileStep({ user });
    
    return new WorkflowResponse({
      user,
      profile
    });
  }
);

// Execute workflow
const { result } = await userOnboardingWorkflow(container).run({
  input: { name: "John Doe" }
});
```

---

## Container Support

### Awilix Integration

```typescript
import { createContainer } from 'awilix';
import { awilixAdapter } from 'flowtify';

const awilixContainer = createContainer();
awilixContainer.register({
  userService: asFunction(() => new UserService()).singleton()
});

const container = awilixAdapter.from(awilixContainer);
```

### TypeDI Integration (NestJS)

```typescript
import 'reflect-metadata';
import { Container } from 'typedi';
import { typeDIAdapter } from 'flowtify';

// Register services with TypeDI (or use NestJS DI)
Container.set('userService', new UserService());

const container = typeDIAdapter.from(Container);
```

---

## Advanced Features

### Step Compensation (Error Handling)

```typescript
const createProductStep = createStep(
  'create-product',
  async (productData, { container }) => {
    const productService = container.resolve('productService');
    const product = await productService.createProduct(productData);
    return new StepResponse(product, { productId: product.id });
  },
  async (compensateData, { container }) => {
    const productService = container.resolve('productService');
    await productService.deleteProduct(compensateData.productId);
  }
);
```

### Complex Step Chaining

```typescript
const orderProcessingWorkflow = createWorkflow(
  'order-processing',
  function(input: { productId: string; quantity: number }) {
    const product = validateProductStep(input);
    const inventory = checkInventoryStep({ product, quantity: input.quantity });
    const reservation = reserveInventoryStep({ product, quantity: input.quantity });
    const pricing = calculatePricingStep({ product, quantity: input.quantity });
    const order = createOrderStep({ product, pricing, reservation });
    
    return new WorkflowResponse({
      order,
      pricing,
      reservation
    });
  }
);
```

---

## API Reference

### `createStep(name, invokeFn, compensateFn?)`

Creates a workflow step with optional compensation.

- **name**: Step identifier
- **invokeFn**: Main step execution function
- **compensateFn**: Optional rollback function

### `createWorkflow(name, composer)`

Creates a workflow with step composition function.

- **name**: Workflow identifier  
- **composer**: Function that defines step execution flow

### `StepResponse(output, compensateInput?)`

Response object for step execution.

- **output**: Step result data
- **compensateInput**: Data for compensation (defaults to output)

### `WorkflowResponse(result, options?)`

Response object for workflow execution.

- **result**: Final workflow result
- **options**: Additional workflow options

---

## Medusa Compatibility

Flowtify provides 100% API compatibility with Medusa workflows:

```typescript
// This works exactly like Medusa workflows
const { result } = await createPosOrderWorkflow(req.scope).run({ 
  input: { data: workflowInput, loggedInUser } 
});
```

---

## Why Flowtify?

- **Container Agnostic**: Use with any DI container, not just Awilix
- **NestJS Ready**: First-class TypeDI support for NestJS integration
- **Clean Implementation**: Focused on the Medusa pattern without legacy complexity
- **Type Safety**: Full TypeScript support with excellent developer experience
- **Production Ready**: Comprehensive test suite and error handling

---

## License

MIT License - see LICENSE file for details.