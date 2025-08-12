# Flowtify

A flexible workflow orchestration library with TypeScript support, featuring powerful compensation patterns, step management, and container-based dependency injection. Highly inspired by the workflow SDK from MedusaJS.

## Features

- ✅ **TypeScript-first** - Full type safety and IntelliSense support
- ✅ **Workflow Orchestration** - Define complex workflows with steps and dependencies
- ✅ **Compensation Patterns** - Automatic rollback with SAGA-style compensation
- ✅ **Container Integration** - Support for Awilix and TypeDI dependency injection
- ✅ **Step Management** - Create reusable steps with validation and error handling
- ✅ **Value Resolution** - Advanced data handling with lazy evaluation
- ✅ **Memory Management** - Built-in LRU caching and memory optimization
- ✅ **Comprehensive Testing** - 61+ tests covering all features including compensation

## Installation

```bash
npm install flowtify
# or
yarn add flowtify
```

## Quick Start

### Basic Workflow

```typescript
import { createStep, createWorkflow, StepResponse } from 'flowtify';

// Define steps
const getUserStep = createStep('getUser', async (input: { userId: string }) => {
  const user = await fetchUser(input.userId);
  return new StepResponse(user);
});

const sendEmailStep = createStep('sendEmail', async (user: any) => {
  await sendWelcomeEmail(user.email);
  return new StepResponse({ emailSent: true });
}, async (emailData: any) => {
  // Compensation: cancel the email if workflow fails
  await cancelEmail(emailData.emailId);
});

// Create workflow
const userOnboardingWorkflow = createWorkflow('userOnboarding', (input: { userId: string }) => {
  const user = getUserStep(input);
  const emailResult = sendEmailStep(user);
  
  return new WorkflowResponse({
    user,
    emailResult
  });
});

// Execute workflow
const runner = userOnboardingWorkflow();
const result = await runner.run({
  input: { userId: 'user123' },
  container: undefined
});
```


### Step Response Types

```typescript
// Success with data
return new StepResponse({ data: 'success' });

// Success with custom compensate input
return new StepResponse({ data: 'success' }, { compensateData: 'for-rollback' });

// Skip step
return new StepResponse().skip();

// Permanent failure (no compensation)
return new StepResponse().permanentFailure();
```

### Container Integration

```typescript
import { awilixAdapter } from 'flowtify';

// With Awilix container
const container = awilixAdapter.create();
container.register('userService', () => new UserService());

const containerWorkflow = createWorkflow('containerWorkflow', (input: any) => {
  // Steps can access container services through context
  return someStep(input);
});

const runner = containerWorkflow();
await runner.run({
  input: { data: 'test' },
  container
});
```

## Core Concepts

### Steps

Steps are the building blocks of workflows. They can:
- Execute business logic
- Return typed responses
- Provide compensation logic for rollbacks
- Access container services

```typescript
const step = createStep('stepName', 
  async (input, { container }) => {
    // Invoke function - main business logic
    const service = container.resolve('myService');
    const result = await service.process(input);
    return new StepResponse(result);
  },
  async (compensateInput, { container }) => {
    // Compensate function - rollback logic
    const service = container.resolve('myService');
    await service.rollback(compensateInput);
  }
);
```

### Workflows

Workflows orchestrate steps and handle:
- Step execution order
- Data flow between steps
- Error handling and compensation
- Container management

### Compensation

Flowtify implements SAGA-style compensation patterns:
- **Automatic rollback** when workflows fail
- **Reverse order execution** of compensation functions
- **Selective compensation** - only successful steps are compensated
- **Error resilience** - compensation continues even if some compensations fail

## Advanced Features

### Value Resolution

```typescript
import { stepResult, workflowInput, containerValue } from 'flowtify';

// Reference step results
const userRef = stepResult('getUserStep', ['profile', 'name']);

// Reference workflow input
const inputRef = workflowInput(['userId']);

// Reference container services
const serviceRef = containerValue('userService', ['getCurrentUser']);
```

### Memory Management

```typescript
import { memoryManager, LRURegistry } from 'flowtify';

// Configure memory management
memoryManager.configure({
  maxWorkflows: 1000,
  maxSteps: 5000,
  ttl: 3600000 // 1 hour
});

// Use LRU registry for caching
const registry = new LRURegistry(100); // Max 100 entries
```

### Workflow Hooks

```typescript
const workflowWithHooks = createWorkflow('hookedWorkflow', (input) => {
  // Workflow logic
  return new WorkflowResponse(result, {
    hooks: {
      onSuccess: async (result) => console.log('Success:', result),
      onFailure: async (error) => console.log('Failed:', error)
    }
  });
});
```

## Testing

Flowtify includes comprehensive test coverage with 61+ tests covering:

- ✅ Step creation and execution
- ✅ Workflow orchestration
- ✅ Compensation patterns (8 dedicated tests)
- ✅ Error handling scenarios
- ✅ Container integration
- ✅ Value resolution
- ✅ Response classes
- ✅ Integration scenarios

Run tests:
```bash
yarn test
```

## API Reference

### Core Functions

- `createStep(name, invokeFn, compensateFn?)` - Create a workflow step
- `createWorkflow(name, composer)` - Create a workflow
- `StepResponse(output?, compensateInput?)` - Create step response
- `WorkflowResponse(result, options?)` - Create workflow response

### Container Adapters

- `awilixAdapter` - Awilix container integration
- `typeDIAdapter` - TypeDI container integration

### Utilities

- `memoryManager` - Memory management utilities
- `workflowRegistry` - Global workflow registry
- `stepResult()`, `workflowInput()`, `containerValue()` - Value resolution helpers

## TypeScript Support

Flowtify is built with TypeScript and provides full type safety:

```typescript
interface UserInput {
  userId: string;
  email: string;
}

interface UserOutput {
  id: string;
  name: string;
  verified: boolean;
}

const typedStep = createStep<UserInput, UserOutput>(
  'processUser',
  async (input: UserInput) => {
    // TypeScript knows input is UserInput
    return new StepResponse<UserOutput>({
      id: input.userId,
      name: 'John',
      verified: true
    });
  }
);
```

## Real-World Example: E-commerce Order Processing

Here's a complete example showing payment compensation in an e-commerce workflow:

```typescript
// Complete e-commerce order workflow with payment compensation
const reserveInventoryStep = createStep('reserveInventory', 
  async (input: { productId: string; quantity: number }, { container }) => {
    const inventoryService = container.resolve('inventoryService');
    const reservation = await inventoryService.reserve(input.productId, input.quantity);
    return new StepResponse(reservation, { reservationId: reservation.id });
  },
  async (compensateInput: { reservationId: string }, { container }) => {
    // Compensation: release inventory reservation
    const inventoryService = container.resolve('inventoryService');
    await inventoryService.release(compensateInput.reservationId);
    console.log(`Released inventory reservation ${compensateInput.reservationId}`);
  }
);

const processPaymentStep = createStep('processPayment', 
  async (order: { total: number; customerId: string }, { container }) => {
    const paymentService = container.resolve('paymentService');
    const payment = await paymentService.charge({
      amount: order.total,
      customerId: order.customerId,
      currency: 'USD'
    });
    
    if (!payment.success) {
      throw new Error(`Payment failed: ${payment.errorMessage}`);
    }
    
    return new StepResponse(payment, {
      paymentId: payment.transactionId,
      amount: payment.amount,
      customerId: payment.customerId
    });
  },
  async (compensateInput: { paymentId: string; amount: number; customerId: string }, { container }) => {
    // Compensation: refund the payment
    try {
      const paymentService = container.resolve('paymentService');
      const refund = await paymentService.refund(compensateInput.paymentId, {
        amount: compensateInput.amount,
        reason: 'Order processing failed'
      });
      
      console.log(`Refunded $${compensateInput.amount} to customer ${compensateInput.customerId}`);
      
      // Optionally notify customer
      const notificationService = container.resolve('notificationService');
      await notificationService.sendRefundNotification(compensateInput.customerId, refund);
    } catch (error) {
      // Log but don't throw - compensation errors are handled gracefully
      console.error(`Failed to refund payment ${compensateInput.paymentId}:`, error);
    }
  }
);

const createShippingLabelStep = createStep('createShippingLabel',
  async (order: { address: any; items: any[] }, { container }) => {
    const shippingService = container.resolve('shippingService');
    const label = await shippingService.createLabel(order.address, order.items);
    return new StepResponse(label, { labelId: label.id });
  },
  async (compensateInput: { labelId: string }, { container }) => {
    // Compensation: cancel shipping label
    const shippingService = container.resolve('shippingService');
    await shippingService.cancelLabel(compensateInput.labelId);
    console.log(`Cancelled shipping label ${compensateInput.labelId}`);
  }
);

const fulfillOrderStep = createStep('fulfillOrder',
  async (input: { orderId: string; shippingLabel: any }, { container }) => {
    // This step might fail, triggering compensation for all previous steps
    const fulfillmentService = container.resolve('fulfillmentService');
    const fulfillment = await fulfillmentService.processOrder(input.orderId, input.shippingLabel);
    
    if (fulfillment.status === 'failed') {
      throw new Error('Fulfillment center rejected the order');
    }
    
    return new StepResponse(fulfillment);
  }
);

// Complete workflow with compensation chain
const ecommerceOrderWorkflow = createWorkflow('ecommerceOrder', (input: {
  productId: string;
  quantity: number;
  customerId: string;
  total: number;
  address: any;
}) => {
  // Step 1: Reserve inventory (compensated if later steps fail)
  const inventory = reserveInventoryStep({
    productId: input.productId,
    quantity: input.quantity
  });
  
  // Step 2: Process payment (refunded if later steps fail)
  const payment = processPaymentStep({
    total: input.total,
    customerId: input.customerId
  });
  
  // Step 3: Create shipping label (cancelled if fulfillment fails)
  const shipping = createShippingLabelStep({
    address: input.address,
    items: [{ id: input.productId, quantity: input.quantity }]
  });
  
  // Step 4: Fulfill order (if this fails, all previous steps are compensated)
  const fulfillment = fulfillOrderStep({
    orderId: `order-${Date.now()}`,
    shippingLabel: shipping
  });
  
  return new WorkflowResponse({
    inventory,
    payment,
    shipping,
    fulfillment
  });
});

// Setup container with services
const container = awilixAdapter.create();
container.register('inventoryService', new InventoryService());
container.register('paymentService', new PaymentService());
container.register('shippingService', new ShippingService());
container.register('fulfillmentService', new FulfillmentService());
container.register('notificationService', new NotificationService());

// Usage with error handling
try {
  const runner = ecommerceOrderWorkflow();
  const result = await runner.run({
    input: {
      productId: 'product-123',
      quantity: 2,
      customerId: 'customer-456',
      total: 99.99,
      address: { street: '123 Main St', city: 'Anytown' }
    },
    container
  });
  
  console.log('Order processed successfully:', result.result);
} catch (error) {
  console.error('Order failed, compensation executed:', error.message);
  // At this point, all successful steps have been compensated:
  // - Payment refunded
  // - Inventory released  
  // - Shipping label cancelled
}
```

In this example, if the fulfillment step fails:
1. **Shipping label is cancelled** (most recent successful step)
2. **Payment is refunded** (previous step)
3. **Inventory reservation is released** (first step)

The compensation happens automatically in reverse order, ensuring no resources are left in an inconsistent state.

## Error Handling

Flowtify provides robust error handling:

```typescript
// Workflow errors trigger compensation
throw new Error('Business logic error'); // Triggers rollback

// Permanent failures skip compensation
return new StepResponse().permanentFailure(); // No rollback

// Skip steps conditionally
if (shouldSkip) {
  return new StepResponse().skip(); // Step is skipped
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Add tests for your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

MIT License - see LICENSE file for details.

## Changelog

### v1.0.14
- ✅ Added comprehensive test suite (61+ tests)
- ✅ Added dedicated compensation testing (8 test scenarios)
- ✅ Improved error handling and validation
- ✅ Enhanced TypeScript definitions
- ✅ Better documentation and examples

### v1.0.13
- Core workflow and step functionality
- Container integration
- Basic compensation patterns
- Value resolution system